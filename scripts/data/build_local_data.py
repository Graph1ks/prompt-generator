#!/usr/bin/env python3
"""Resumable, loss-safe local Prompt V'gine data build pipeline.

The promoted corpus/knowledge DBs are disposable compiled artifacts.
curation.sqlite is durable local authoring state and is never replaced here.
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
import shutil
import signal
import sqlite3
import sys
import time
from pathlib import Path

from instrument_semantics import collect_source_instrument_expressions, materialize_instrument_expressions
from local_data_v1_core import (
    GENRE_SCHEMA,
    OUTPUT_SECTIONS,
    RULES,
    SECTION_MAP,
    STYLE_PROMPT_MAX_CHARACTERS,
    VAULT_SCHEMA,
    apply_curation,
    build_knowledge,
    clauses,
    init_curation,
    load,
    lookup,
    meta,
    norm,
    sections,
    seed_review_queue,
    sha,
    sid,
    space,
    tokens,
)

BUILD_REVISION = "promptvgine-local-data-build-v2-resumable-3-prompt-budget"
WORK_DIR_NAME = ".build-v2"
STAGES = [
    ("corpus_init", 10),
    ("ingest_tracks", 20),
    ("aggregate_stats", 30),
    ("phrases_2", 40),
    ("phrases_3", 50),
    ("phrases_4", 60),
    ("phrases_5", 70),
    ("fts", 80),
    ("crosswalk_profile", 90),
    ("knowledge_compile", 100),
    ("curation_overlay", 110),
    ("validate", 120),
    ("report", 130),
    ("promote", 140),
]
CORPUS_STAGE_NAMES = {name for name, ordinal in STAGES if ordinal <= 90}
KNOWLEDGE_STAGE_NAMES = {name for name, ordinal in STAGES if 100 <= ordinal <= 130}
CURATION_HASH_TABLES = [
    "entry_patch",
    "term_variant_patch",
    "definition_patch",
    "context_definition_patch",
    "relation_patch",
    "genre_crosswalk_decision",
    "instrument_family_patch",
    "instrument_patch",
    "instrument_alias_patch",
    "instrument_trait_patch",
    "parameter_patch",
    "parameter_option_patch",
    "statement_patch",
    "statement_concept_patch",
    "statement_option_patch",
]

STOP_REQUESTED = False


class PauseRequested(RuntimeError):
    pass


def utc_now() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat().replace("+00:00", "Z")


def parse_json(value):
    if value is None:
        return None
    try:
        return json.loads(value)
    except Exception:
        return value


def print_json(value) -> None:
    print(json.dumps(value, indent=2, ensure_ascii=False))


def fmt_duration(seconds: float) -> str:
    seconds = max(0, int(round(seconds)))
    if seconds >= 3600:
        return f"{seconds // 3600}h {(seconds % 3600) // 60}m"
    if seconds >= 60:
        return f"{seconds // 60}m {seconds % 60}s"
    return f"{seconds}s"


def progress_line(stage: str, current: int, total: int | None, started: float, start_count: int = 0, batch_seconds: float | None = None, extra: list[str] | None = None) -> None:
    elapsed = max(0.001, time.perf_counter() - started)
    delta = max(0, current - start_count)
    rate = delta / elapsed
    pieces = [f"[{stage}]"]
    if total is not None:
        pct = (current * 100 / total) if total else 100.0
        pieces.append(f"{current:,} / {total:,} ({pct:.1f}%)")
    else:
        pieces.append(f"{current:,}")
    if rate > 0:
        pieces.append(f"{rate:,.0f}/s")
    if batch_seconds is not None:
        pieces.append(f"batch {batch_seconds:.2f}s")
    if total is not None and rate > 0 and current < total:
        pieces.append(f"ETA ~{fmt_duration((total-current)/rate)}")
    if extra:
        pieces.extend(extra)
    print(" · ".join(pieces), file=sys.stderr, flush=True)


def install_signal_handlers() -> None:
    def handler(signum, frame):
        global STOP_REQUESTED
        if not STOP_REQUESTED:
            STOP_REQUESTED = True
            print(
                "\n[build] stop requested; finishing/rolling back the current safe unit before pausing...",
                file=sys.stderr,
                flush=True,
            )
    signal.signal(signal.SIGINT, handler)
    if hasattr(signal, "SIGTERM"):
        signal.signal(signal.SIGTERM, handler)


def open_state(work_dir: Path, schema_dir: Path) -> sqlite3.Connection:
    work_dir.mkdir(parents=True, exist_ok=True)
    path = work_dir / "state.sqlite"
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.executescript((schema_dir / "build-state-v1.sql").read_text(encoding="utf-8"))
    for name, ordinal in STAGES:
        conn.execute(
            """INSERT OR IGNORE INTO build_stage(name,ordinal,status,processed,updated_at)
               VALUES (?,?, 'pending',0,?)""",
            (name, ordinal, utc_now()),
        )
    conn.commit()
    return conn


def state_meta(conn: sqlite3.Connection, key: str) -> str | None:
    row = conn.execute("SELECT value FROM build_meta WHERE key=?", (key,)).fetchone()
    return row[0] if row else None


def set_state_meta(conn: sqlite3.Connection, values: dict) -> None:
    conn.executemany(
        """INSERT INTO build_meta(key,value) VALUES (?,?)
           ON CONFLICT(key) DO UPDATE SET value=excluded.value""",
        [(str(k), str(v)) for k, v in values.items()],
    )
    conn.commit()


def event(conn: sqlite3.Connection, level: str, message: str, stage: str | None = None, detail=None) -> None:
    conn.execute(
        "INSERT INTO build_event(ts,level,stage,message,detail_json) VALUES (?,?,?,?,?)",
        (utc_now(), level, stage, message, json.dumps(detail, ensure_ascii=False, sort_keys=True) if detail is not None else None),
    )
    conn.commit()


def stage_row(conn: sqlite3.Connection, name: str):
    return conn.execute("SELECT * FROM build_stage WHERE name=?", (name,)).fetchone()


def stage_start(conn: sqlite3.Connection, name: str, total: int | None = None) -> None:
    row = stage_row(conn, name)
    conn.execute(
        """UPDATE build_stage
           SET status='running', total=COALESCE(?,total),
               started_at=COALESCE(started_at,?), updated_at=?, completed_at=NULL
           WHERE name=?""",
        (total, utc_now(), utc_now(), name),
    )
    conn.commit()
    event(conn, "info", "stage started", name, {"processed": row["processed"] if row else 0, "total": total})


def stage_progress(conn: sqlite3.Connection, name: str, processed: int, total: int | None = None, detail=None) -> None:
    conn.execute(
        """UPDATE build_stage SET status='running',processed=?,total=COALESCE(?,total),
           updated_at=?,detail_json=COALESCE(?,detail_json) WHERE name=?""",
        (
            processed,
            total,
            utc_now(),
            json.dumps(detail, ensure_ascii=False, sort_keys=True) if detail is not None else None,
            name,
        ),
    )
    conn.commit()


def stage_complete(conn: sqlite3.Connection, name: str, processed: int | None = None, total: int | None = None, detail=None, elapsed: float | None = None) -> None:
    row = stage_row(conn, name)
    final_processed = processed if processed is not None else (row["processed"] if row else 0)
    final_total = total if total is not None else (row["total"] if row else None)
    prior_elapsed = float(row["elapsed_seconds"] or 0) if row else 0.0
    conn.execute(
        """UPDATE build_stage SET status='complete',processed=?,total=?,updated_at=?,completed_at=?,
           elapsed_seconds=?,detail_json=COALESCE(?,detail_json) WHERE name=?""",
        (
            final_processed,
            final_total,
            utc_now(),
            utc_now(),
            prior_elapsed + float(elapsed or 0),
            json.dumps(detail, ensure_ascii=False, sort_keys=True) if detail is not None else None,
            name,
        ),
    )
    conn.commit()
    event(conn, "info", "stage complete", name, detail)


def stage_pause(conn: sqlite3.Connection, name: str, message: str) -> None:
    conn.execute(
        "UPDATE build_stage SET status='paused',updated_at=?,detail_json=? WHERE name=?",
        (utc_now(), json.dumps({"message": message}, ensure_ascii=False), name),
    )
    conn.commit()
    event(conn, "warning", message, name)


def stage_error(conn: sqlite3.Connection, name: str, error: Exception) -> None:
    conn.execute(
        "UPDATE build_stage SET status='error',updated_at=?,detail_json=? WHERE name=?",
        (utc_now(), json.dumps({"error": str(error)}, ensure_ascii=False), name),
    )
    conn.commit()
    event(conn, "error", str(error), name)


def mark_stages_complete(conn: sqlite3.Connection, names: set[str], detail: dict) -> None:
    for name in names:
        row = stage_row(conn, name)
        if row and row["status"] != "complete":
            stage_complete(conn, name, processed=row["total"] or row["processed"], total=row["total"], detail=detail)


def reset_stages_from(conn: sqlite3.Connection, ordinal: int) -> None:
    conn.execute(
        """UPDATE build_stage SET status='pending',processed=0,total=NULL,started_at=NULL,
           completed_at=NULL,elapsed_seconds=0,detail_json=NULL,updated_at=?
           WHERE ordinal>=?""",
        (utc_now(), ordinal),
    )
    conn.commit()


def bind_state(conn: sqlite3.Connection, vault_sha: str, genre_sha: str) -> None:
    expected = {
        "build_revision": BUILD_REVISION,
        "vault_sha256": vault_sha,
        "genre_map_sha256": genre_sha,
    }
    existing = {k: state_meta(conn, k) for k in expected}
    if not any(existing.values()):
        set_state_meta(conn, {**expected, "created_at": utc_now(), "status": "in_progress"})
        return
    mismatches = {k: {"checkpoint": existing[k], "current": v} for k, v in expected.items() if existing[k] != v}
    if mismatches:
        source_keys = {"vault_sha256", "genre_map_sha256"}
        source_mismatch = any(k in mismatches for k in source_keys)
        revision_only = set(mismatches) == {"build_revision"}
        if revision_only and not source_mismatch and state_meta(conn, "status") == "complete":
            # A completed checkpoint may advance to a new compiler revision without
            # throwing away the promoted corpus or durable curation.
            reset_stages_from(conn, 100)
            conn.execute("DELETE FROM build_meta WHERE key='completed_at'")
            set_state_meta(
                conn,
                {
                    "build_revision": expected["build_revision"],
                    "status": "in_progress",
                    "revision_migrated_at": utc_now(),
                },
            )
            event(
                conn,
                "info",
                "completed checkpoint advanced to new knowledge compiler revision",
                detail=mismatches,
            )
            return
        raise SystemExit(
            "Existing resumable work is bound to different source/build fingerprints. "
            "Run --status to inspect it. Use --reset-work only if you intentionally want to discard the incomplete checkpoint.\n"
            + json.dumps(mismatches, indent=2)
        )


def curation_fingerprint(conn: sqlite3.Connection) -> str:
    h = hashlib.sha256()
    for table in CURATION_HASH_TABLES:
        columns = [row[1] for row in conn.execute(f"PRAGMA table_info({table})")]
        if not columns:
            continue
        quoted = ",".join(f'"{c}"' for c in columns)
        order = ",".join(str(i + 1) for i in range(len(columns)))
        h.update(f"[{table}]".encode("utf-8"))
        for row in conn.execute(f"SELECT {quoted} FROM {table} ORDER BY {order}"):
            h.update(json.dumps(list(row), ensure_ascii=False, separators=(",", ":"), default=str).encode("utf-8"))
            h.update(b"\n")
    return h.hexdigest()


def read_db_meta(path: Path) -> dict:
    if not path.is_file():
        return {}
    try:
        conn = sqlite3.connect(f"file:{path.resolve()}?mode=ro", uri=True)
        try:
            return {k: v for k, v in conn.execute("SELECT key,value FROM build_meta")}
        finally:
            conn.close()
    except Exception:
        return {}


def promoted_corpus_matches(path: Path, vault_sha: str, genre_sha: str) -> bool:
    m = read_db_meta(path)
    return m.get("vault_sha256") == vault_sha and m.get("genre_map_sha256") == genre_sha


def promoted_knowledge_matches(path: Path, vault_sha: str, genre_sha: str, curation_sha: str) -> bool:
    m = read_db_meta(path)
    return (
        m.get("vault_sha256") == vault_sha
        and m.get("genre_map_sha256") == genre_sha
        and m.get("curation_fingerprint") == curation_sha
        and m.get("build_revision") == BUILD_REVISION
    )


def preflight(vault_path: Path, genre_path: Path) -> dict:
    if not vault_path.is_file():
        raise SystemExit(f"Vault source not found: {vault_path}")
    if not genre_path.is_file():
        raise SystemExit(f"Genre map source not found: {genre_path}")
    print("[preflight] reading source metadata...", file=sys.stderr, flush=True)
    vault = load(vault_path)
    genre_map = load(genre_path)
    if vault.get("schema") != VAULT_SCHEMA:
        raise SystemExit(f"Unsupported Vault schema: {vault.get('schema')!r}")
    if genre_map.get("schema") != GENRE_SCHEMA:
        raise SystemExit(f"Unsupported genre-map schema: {genre_map.get('schema')!r}")
    prompt_lengths = [
        len(str(track.get("structured_prompt") or ""))
        for track in (vault.get("tracks") or [])
    ]
    over_limit = [
        (track.get("id"), len(str(track.get("structured_prompt") or "")))
        for track in (vault.get("tracks") or [])
        if len(str(track.get("structured_prompt") or "")) > STYLE_PROMPT_MAX_CHARACTERS
    ]
    if over_limit:
        raise SystemExit(
            "Vault structured_prompt exceeds the Suno structured-v1 "
            f"{STYLE_PROMPT_MAX_CHARACTERS}-character limit; examples: {over_limit[:5]}"
        )
    print("[preflight] hashing source files...", file=sys.stderr, flush=True)
    vault_sha = sha(vault_path)
    genre_sha = sha(genre_path)
    return {
        "vault": vault,
        "genre_map": genre_map,
        "vault_sha": vault_sha,
        "genre_sha": genre_sha,
        "vault_bytes": vault_path.stat().st_size,
        "genre_bytes": genre_path.stat().st_size,
        "track_count": len(vault.get("tracks") or []),
        "structured_prompt_max_characters": max(prompt_lengths, default=0),
        "style_prompt_character_limit": STYLE_PROMPT_MAX_CHARACTERS,
        "genre_count": len(genre_map.get("genres") or []),
        "major_count": len(genre_map.get("major_genres") or []),
    }


def show_plan(info: dict, out_dir: Path) -> None:
    promoted_corpus = out_dir / "corpus.sqlite"
    promoted_knowledge = out_dir / "knowledge.sqlite"
    work_dir = out_dir / WORK_DIR_NAME
    print_json({
        "mode": "plan",
        "read_only": True,
        "build_revision": BUILD_REVISION,
        "sources": {
            "vault": {
                "bytes": info["vault_bytes"],
                "sha256": info["vault_sha"],
                "tracks": info["track_count"],
                "schema": info["vault"].get("schema"),
                "version": info["vault"].get("version"),
                "structured_prompt_max_characters": info["structured_prompt_max_characters"],
                "style_prompt_character_limit": info["style_prompt_character_limit"],
            },
            "genre_map": {
                "bytes": info["genre_bytes"],
                "sha256": info["genre_sha"],
                "genres": info["genre_count"],
                "major_genres": info["major_count"],
                "schema": info["genre_map"].get("schema"),
                "taxonomy_version": info["genre_map"].get("taxonomy_version"),
            },
        },
        "output": str(out_dir),
        "promoted": {
            "corpus_exists": promoted_corpus.exists(),
            "knowledge_exists": promoted_knowledge.exists(),
            "curation_exists": (out_dir / "curation.sqlite").exists(),
            "corpus_matches_sources": promoted_corpus_matches(promoted_corpus, info["vault_sha"], info["genre_sha"]),
        },
        "checkpoint_exists": (work_dir / "state.sqlite").exists(),
        "safety": {
            "promoted_artifacts_replaced_before_validation": False,
            "curation_replaced": False,
            "ordinary_rerun_resumes": True,
        },
    })


def show_status(out_dir: Path) -> None:
    work_dir = out_dir / WORK_DIR_NAME
    state_path = work_dir / "state.sqlite"
    result = {
        "output": str(out_dir),
        "promoted": {
            "corpus": read_db_meta(out_dir / "corpus.sqlite"),
            "knowledge": read_db_meta(out_dir / "knowledge.sqlite"),
            "curation_exists": (out_dir / "curation.sqlite").exists(),
        },
        "checkpoint": None,
    }
    if state_path.is_file():
        conn = sqlite3.connect(state_path)
        conn.row_factory = sqlite3.Row
        try:
            result["checkpoint"] = {
                "meta": {k: v for k, v in conn.execute("SELECT key,value FROM build_meta ORDER BY key")},
                "stages": [dict(row) for row in conn.execute("SELECT * FROM build_stage ORDER BY ordinal")],
                "recent_events": [dict(row) for row in conn.execute("SELECT * FROM build_event ORDER BY id DESC LIMIT 15")],
            }
        finally:
            conn.close()
    print_json(result)


def reset_work(out_dir: Path) -> None:
    work_dir = out_dir / WORK_DIR_NAME
    if work_dir.exists():
        shutil.rmtree(work_dir)
        print(f"[reset] removed incomplete/checkpoint work only: {work_dir}")
    else:
        print(f"[reset] no work checkpoint exists: {work_dir}")
    print("[reset] promoted corpus/knowledge and durable curation were not touched.")


def open_work_corpus(path: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys=ON")
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA temp_store=MEMORY")
    conn.set_progress_handler(lambda: 1 if STOP_REQUESTED else 0, 20000)
    return conn


def init_corpus_stage(state: sqlite3.Connection, work_corpus: Path, schema_dir: Path, info: dict, vault_path: Path, genre_path: Path) -> None:
    if stage_row(state, "corpus_init")["status"] == "complete":
        return
    started = time.perf_counter()
    stage_start(state, "corpus_init", 1)
    try:
        if work_corpus.exists():
            work_corpus.unlink()
        for suffix in ("-wal", "-shm"):
            Path(str(work_corpus) + suffix).unlink(missing_ok=True)
        conn = open_work_corpus(work_corpus)
        try:
            conn.executescript((schema_dir / "corpus-v2.sql").read_text(encoding="utf-8"))
            meta(conn, {
                "schema_version": "corpus-v2",
                "rules": RULES,
                "build_revision": BUILD_REVISION,
                "vault_sha256": info["vault_sha"],
                "genre_map_sha256": info["genre_sha"],
                "built_at": utc_now(),
            })
            stamp = utc_now()
            cur = conn.cursor()
            cur.execute(
                """INSERT INTO source_file(kind,basename,sha256,schema_name,schema_version,source_timestamp,imported_at)
                   VALUES (?,?,?,?,?,?,?)""",
                (
                    "prompt_vault", vault_path.name, info["vault_sha"], info["vault"]["schema"],
                    info["vault"].get("version"), info["vault"].get("exported_at"), stamp,
                ),
            )
            cur.execute(
                """INSERT INTO source_file(kind,basename,sha256,schema_name,schema_version,source_timestamp,imported_at)
                   VALUES (?,?,?,?,?,?,?)""",
                (
                    "genre_map", genre_path.name, info["genre_sha"], info["genre_map"]["schema"],
                    str(info["genre_map"].get("taxonomy_version")), info["genre_map"].get("generated_at"), stamp,
                ),
            )
            cur.executemany(
                "INSERT INTO section_label_map(raw_label,canonical_key,canonical_output_label,mapping_status) VALUES (?,?,?,?)",
                [(label, *mapping) for label, mapping in SECTION_MAP.items()],
            )
            majors = {label: sid("major", label) for label in info["genre_map"]["major_genres"]}
            cur.executemany(
                "INSERT INTO major_genre_raw(major_key,label,source_ordinal) VALUES (?,?,?)",
                [(majors[label], label, i) for i, label in enumerate(info["genre_map"]["major_genres"], 1)],
            )
            for i, item in enumerate(info["genre_map"]["genres"], 1):
                label = space(item["genre"])
                gid = sid("genre", label)
                cur.execute(
                    "INSERT INTO genre_raw(genre_key,label,label_norm,source_ordinal,track_count_declared) VALUES (?,?,?,?,?)",
                    (gid, label, lookup(label), i, int(item.get("track_count") or 0)),
                )
                cur.executemany(
                    "INSERT INTO genre_major_raw(genre_key,major_key,ordinal) VALUES (?,?,?)",
                    [(gid, majors[m], j) for j, m in enumerate(item.get("major_genres", []), 1)],
                )
            conn.commit()
        finally:
            conn.close()
        elapsed = time.perf_counter() - started
        stage_complete(state, "corpus_init", 1, 1, {"schema": "corpus-v2"}, elapsed)
        progress_line("corpus:init", 1, 1, started, extra=["done"])
    except Exception as exc:
        stage_error(state, "corpus_init", exc)
        raise


def insert_track_batch(conn: sqlite3.Connection, tracks_batch: list, start_ordinal: int, vault_source_id: int) -> None:
    cur = conn.cursor()
    cur.execute("BEGIN")
    try:
        for offset, track in enumerate(tracks_batch):
            source_ordinal = start_ordinal + offset
            track_id = str(track.get("id") if track.get("id") is not None else source_ordinal)
            genre_raw = space(str(track.get("genre") or ""))
            genre_norm = lookup(genre_raw)
            cur.execute(
                """INSERT INTO track(
                     track_id,source_file_id,source_ordinal,title,genre_raw,genre_norm,bpm,emotion_raw,style_raw,year,
                     key_raw,reference_artist,reference_song,structured_prompt,negative_prompt,instrumental_arrangement,used,favorite
                   ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (
                    track_id, vault_source_id, source_ordinal, track.get("title"), genre_raw, genre_norm,
                    track.get("bpm"), track.get("emotion"), track.get("style"), track.get("year"), track.get("key"),
                    track.get("reference_artist"), track.get("reference_song"), track.get("structured_prompt") or "",
                    track.get("negative_prompt"), track.get("instrumental_arrangement"),
                    int(bool(track.get("used"))), int(bool(track.get("favorite"))),
                ),
            )
            parsed_sections = sections(track.get("structured_prompt") or "")
            sequence_json = json.dumps([row[1] for row in parsed_sections], ensure_ascii=False)
            sequence_key = hashlib.sha1(sequence_json.encode("utf-8")).hexdigest()
            cur.execute(
                """INSERT INTO section_sequence_stat(sequence_key,sequence_json,track_count) VALUES (?,?,1)
                   ON CONFLICT(sequence_key) DO UPDATE SET track_count=track_count+1""",
                (sequence_key, sequence_json),
            )
            for ordinal, raw_label, canonical_key, output_label, mapping_status, raw, raw_norm, source_line in parsed_sections:
                cur.execute(
                    """INSERT INTO prompt_section(
                         track_id,ordinal,raw_label,canonical_key,canonical_output_label,
                         content_raw,content_norm,source_line_raw
                       ) VALUES (?,?,?,?,?,?,?,?)""",
                    (track_id, ordinal, raw_label, canonical_key, output_label, raw, raw_norm, source_line),
                )
                section_id = cur.lastrowid
                clause_rows = clauses(raw)
                cur.executemany(
                    """INSERT INTO prompt_clause(
                         section_id,ordinal,content_raw,content_norm,delimiter_after,start_char,end_char
                       ) VALUES (?,?,?,?,?,?,?)""",
                    [(section_id, *row) for row in clause_rows],
                )
                token_rows = tokens(raw)
                cur.executemany(
                    """INSERT INTO token_occurrence(
                         section_id,clause_id,ordinal_section,ordinal_clause,token_raw,token_norm,start_char,end_char
                       ) VALUES (?,NULL,?,NULL,?,?,?,?)""",
                    [(section_id, oi, token_raw, token_norm, start, end) for oi, token_raw, token_norm, start, end in token_rows],
                )
            raw_negative = space(str(track.get("negative_prompt") or ""))
            if raw_negative:
                items = [space(part) for part in raw_negative.split(",") if space(part)]
                for ordinal, item in enumerate(items, 1):
                    item_norm = norm(item)
                    cur.execute(
                        "INSERT OR IGNORE INTO negative_item(item_raw_example,item_norm) VALUES (?,?)",
                        (item, item_norm),
                    )
                    negative_id = cur.execute(
                        "SELECT id FROM negative_item WHERE item_norm=?", (item_norm,)
                    ).fetchone()[0]
                    cur.execute(
                        """INSERT INTO track_negative_item(track_id,negative_item_id,ordinal,item_raw)
                           VALUES (?,?,?,?)""",
                        (track_id, negative_id, ordinal, item),
                    )
        conn.commit()
    except Exception:
        conn.rollback()
        raise


def ingest_tracks_stage(state: sqlite3.Connection, work_corpus: Path, vault_tracks: list, batch_size: int, test_stop_after_batches: int | None) -> None:
    row = stage_row(state, "ingest_tracks")
    if row["status"] == "complete":
        return
    total = len(vault_tracks)
    processed = int(row["processed"] or 0)
    stage_start(state, "ingest_tracks", total)
    started = time.perf_counter()
    start_count = processed
    batch_number = 0
    conn = open_work_corpus(work_corpus)
    try:
        source_id = conn.execute("SELECT id FROM source_file WHERE kind='prompt_vault' ORDER BY id LIMIT 1").fetchone()[0]
        while processed < total:
            if STOP_REQUESTED:
                raise PauseRequested("stop requested before next batch")
            end = min(total, processed + batch_size)
            batch_started = time.perf_counter()
            batch = vault_tracks[processed:end]
            batch_count = len(batch)
            insert_track_batch(conn, batch, processed + 1, source_id)
            processed = end
            batch_number += 1
            batch_elapsed = time.perf_counter() - batch_started
            stage_progress(state, "ingest_tracks", processed, total, {"batch_size": batch_count, "last_batch_seconds": batch_elapsed})
            progress_line(
                "corpus:tracks",
                processed,
                total,
                started,
                start_count,
                batch_elapsed,
                [
                    f"sections {conn.execute('SELECT COUNT(*) FROM prompt_section').fetchone()[0]:,}",
                    f"tokens {conn.execute('SELECT COUNT(*) FROM token_occurrence').fetchone()[0]:,}",
                ],
            )
            if test_stop_after_batches and batch_number >= test_stop_after_batches:
                raise PauseRequested("test stop after committed batch")
            if STOP_REQUESTED:
                raise PauseRequested("stop requested after committed batch")
        elapsed = time.perf_counter() - started
        stage_complete(state, "ingest_tracks", total, total, {"batch_size": batch_size}, elapsed)
    except PauseRequested as exc:
        stage_pause(state, "ingest_tracks", str(exc))
        raise
    except Exception as exc:
        stage_error(state, "ingest_tracks", exc)
        raise
    finally:
        conn.close()


def sql_stage(state: sqlite3.Connection, name: str, work_corpus: Path, statements: list[str], detail=None) -> None:
    row = stage_row(state, name)
    if row["status"] == "complete":
        return
    stage_start(state, name, len(statements))
    started = time.perf_counter()
    conn = open_work_corpus(work_corpus)
    try:
        conn.execute("BEGIN")
        for i, statement in enumerate(statements, 1):
            conn.execute(statement)
            stage_progress(state, name, i, len(statements))
            progress_line(name, i, len(statements), started)
        conn.commit()
        elapsed = time.perf_counter() - started
        stage_complete(state, name, len(statements), len(statements), detail, elapsed)
    except sqlite3.OperationalError as exc:
        conn.rollback()
        if STOP_REQUESTED and "interrupt" in str(exc).lower():
            stage_pause(state, name, "SQLite stage interrupted safely; rerun resumes from this stage")
            raise PauseRequested(str(exc))
        stage_error(state, name, exc)
        raise
    except Exception as exc:
        conn.rollback()
        stage_error(state, name, exc)
        raise
    finally:
        conn.close()


def aggregate_stats_stage(state: sqlite3.Connection, work_corpus: Path) -> None:
    statements = [
        "DELETE FROM token_section_stat",
        """INSERT INTO token_section_stat(token_norm,canonical_key,occurrence_count,track_count)
           SELECT t.token_norm,s.canonical_key,COUNT(*),COUNT(DISTINCT s.track_id)
           FROM token_occurrence t JOIN prompt_section s ON s.id=t.section_id
           GROUP BY t.token_norm,s.canonical_key""",
        "DELETE FROM genre_section_token_stat",
        """INSERT INTO genre_section_token_stat(vault_genre_norm,canonical_key,token_norm,occurrence_count,track_count)
           SELECT tr.genre_norm,s.canonical_key,t.token_norm,COUNT(*),COUNT(DISTINCT tr.track_id)
           FROM token_occurrence t
           JOIN prompt_section s ON s.id=t.section_id
           JOIN track tr ON tr.track_id=s.track_id
           GROUP BY tr.genre_norm,s.canonical_key,t.token_norm""",
        "DELETE FROM section_value_stat",
        """INSERT INTO section_value_stat(canonical_key,content_norm,content_raw_example,occurrence_count,track_count)
           SELECT canonical_key,content_norm,MIN(content_raw),COUNT(*),COUNT(DISTINCT track_id)
           FROM prompt_section GROUP BY canonical_key,content_norm""",
        "DELETE FROM negative_item_stat",
        """INSERT INTO negative_item_stat(negative_item_id,occurrence_count,track_count)
           SELECT negative_item_id,COUNT(*),COUNT(DISTINCT track_id)
           FROM track_negative_item GROUP BY negative_item_id""",
    ]
    sql_stage(state, "aggregate_stats", work_corpus, statements, {"kind": "SQL aggregate"})


def phrase_sql(n: int) -> str:
    aliases = [f"t{i}" for i in range(1, n + 1)]
    joins = []
    for i in range(2, n + 1):
        joins.append(
            f"JOIN token_occurrence t{i} ON t{i}.section_id=t1.section_id AND t{i}.ordinal_section=t1.ordinal_section+{i-1}"
        )
    expr = " || ' ' || ".join(f"{a}.token_norm" for a in aliases)
    return f"""INSERT INTO phrase_candidate(canonical_key,n,phrase_norm,occurrence_count,track_count,first_section_id)
      SELECT s.canonical_key,{n},{expr},COUNT(*),COUNT(DISTINCT s.track_id),MIN(s.id)
      FROM token_occurrence t1
      {' '.join(joins)}
      JOIN prompt_section s ON s.id=t1.section_id
      GROUP BY s.canonical_key,{expr}
      HAVING COUNT(*)>=3"""


def phrase_stage(state: sqlite3.Connection, work_corpus: Path, n: int) -> None:
    sql_stage(
        state,
        f"phrases_{n}",
        work_corpus,
        [f"DELETE FROM phrase_candidate WHERE n={n}", phrase_sql(n)],
        {"n": n, "minimum_occurrences": 3},
    )


def fts_stage(state: sqlite3.Connection, work_corpus: Path) -> None:
    sql_stage(
        state,
        "fts",
        work_corpus,
        [
            "DELETE FROM prompt_section_fts",
            """INSERT INTO prompt_section_fts(section_id,track_id,canonical_key,raw_label,content)
               SELECT id,track_id,canonical_key,raw_label,content_raw FROM prompt_section""",
        ],
        {"kind": "FTS5"},
    )


def corpus_profile(conn: sqlite3.Connection) -> dict:
    raw = {row[0]: parse_json(row[1]) for row in conn.execute("SELECT metric_key,metric_value FROM corpus_profile")}
    return raw


def crosswalk_profile_stage(state: sqlite3.Connection, work_corpus: Path, info: dict) -> dict:
    row = stage_row(state, "crosswalk_profile")
    if row["status"] == "complete":
        conn = sqlite3.connect(work_corpus)
        try:
            return corpus_profile(conn)
        finally:
            conn.close()
    stage_start(state, "crosswalk_profile", 1)
    started = time.perf_counter()
    conn = open_work_corpus(work_corpus)
    try:
        conn.execute("BEGIN")
        conn.execute("DELETE FROM genre_crosswalk_candidate")
        exact = {label: gid for label, gid in conn.execute("SELECT label,genre_key FROM genre_raw")}
        normalized = {}
        for label_norm, gid in conn.execute("SELECT label_norm,genre_key FROM genre_raw ORDER BY source_ordinal"):
            normalized.setdefault(label_norm, gid)
        rows = conn.execute(
            "SELECT genre_raw,genre_norm,COUNT(*) FROM track GROUP BY genre_raw,genre_norm ORDER BY COUNT(*) DESC,genre_raw"
        ).fetchall()
        for genre_raw, genre_norm, count in rows:
            status = "exact" if genre_raw in exact else "normalized" if genre_norm in normalized else "unmatched"
            matched = exact.get(genre_raw) or normalized.get(genre_norm)
            conn.execute(
                """INSERT INTO genre_crosswalk_candidate(
                     vault_genre_raw,vault_genre_norm,vault_track_count,match_status,matched_genre_key
                   ) VALUES (?,?,?,?,?)""",
                (genre_raw, genre_norm, count, status, matched),
            )
        counts = {row[0]: int(row[1]) for row in conn.execute(
            "SELECT match_status,COUNT(*) FROM genre_crosswalk_candidate GROUP BY match_status"
        )}
        track_counts = {row[0]: int(row[1]) for row in conn.execute(
            "SELECT match_status,SUM(vault_track_count) FROM genre_crosswalk_candidate GROUP BY match_status"
        )}
        profile = {
            "track_count": conn.execute("SELECT COUNT(*) FROM track").fetchone()[0],
            "section_count": conn.execute("SELECT COUNT(*) FROM prompt_section").fetchone()[0],
            "token_count": conn.execute("SELECT COUNT(*) FROM token_occurrence").fetchone()[0],
            "raw_section_label_count": conn.execute("SELECT COUNT(DISTINCT raw_label) FROM prompt_section").fetchone()[0],
            "section_sequence_variant_count": conn.execute("SELECT COUNT(*) FROM section_sequence_stat").fetchone()[0],
            "negative_item_occurrence_count": conn.execute("SELECT COUNT(*) FROM track_negative_item").fetchone()[0],
            "negative_unique_item_count": conn.execute("SELECT COUNT(*) FROM negative_item").fetchone()[0],
            "major_genre_count": conn.execute("SELECT COUNT(*) FROM major_genre_raw").fetchone()[0],
            "taxonomy_genre_count": conn.execute("SELECT COUNT(*) FROM genre_raw").fetchone()[0],
            "vault_genre_label_count": len(rows),
            "genre_crosswalk_exact_labels": counts.get("exact", 0),
            "genre_crosswalk_normalized_labels": counts.get("normalized", 0),
            "genre_crosswalk_unmatched_labels": counts.get("unmatched", 0),
            "genre_crosswalk_exact_tracks": track_counts.get("exact", 0),
            "genre_crosswalk_normalized_tracks": track_counts.get("normalized", 0),
            "genre_crosswalk_unmatched_tracks": track_counts.get("unmatched", 0),
            "token_occurrence_index": True,
            "build_revision": BUILD_REVISION,
        }
        conn.execute("DELETE FROM corpus_profile")
        conn.executemany(
            "INSERT INTO corpus_profile(metric_key,metric_value) VALUES (?,?)",
            [(key, json.dumps(value, ensure_ascii=False)) for key, value in profile.items()],
        )
        meta(conn, {"completed_at": utc_now(), "schema_version": "corpus-v2"})
        conn.commit()
        elapsed = time.perf_counter() - started
        stage_complete(state, "crosswalk_profile", 1, 1, profile, elapsed)
        progress_line("corpus:profile", 1, 1, started, extra=[f"tracks {profile['track_count']:,}", f"tokens {profile['token_count']:,}"])
        return profile
    except Exception as exc:
        conn.rollback()
        stage_error(state, "crosswalk_profile", exc)
        raise
    finally:
        conn.close()


def ensure_corpus(
    state: sqlite3.Connection,
    work_corpus: Path,
    promoted_corpus: Path,
    schema_dir: Path,
    info: dict,
    vault_path: Path,
    genre_path: Path,
    batch_size: int,
    test_stop_after_batches: int | None,
    rebuild_corpus: bool,
) -> tuple[Path, bool]:
    if (
        not rebuild_corpus
        and not work_corpus.exists()
        and promoted_corpus_matches(promoted_corpus, info["vault_sha"], info["genre_sha"])
        and not any(stage_row(state, name)["status"] in ("running", "paused", "error") for name in CORPUS_STAGE_NAMES)
    ):
        mark_stages_complete(state, CORPUS_STAGE_NAMES, {"adopted_promoted": True, "path": str(promoted_corpus)})
        print("[corpus] existing promoted corpus matches source fingerprints; adopting without rebuild.", file=sys.stderr)
        return promoted_corpus, False

    init_corpus_stage(state, work_corpus, schema_dir, info, vault_path, genre_path)
    ingest_tracks_stage(state, work_corpus, info["vault"]["tracks"], batch_size, test_stop_after_batches)
    aggregate_stats_stage(state, work_corpus)
    for n in range(2, 6):
        phrase_stage(state, work_corpus, n)
    fts_stage(state, work_corpus)
    crosswalk_profile_stage(state, work_corpus, info)
    return work_corpus, True


def compile_knowledge(
    state: sqlite3.Connection,
    work_knowledge: Path,
    schema_dir: Path,
    info: dict,
    corpus_path: Path,
    curation: sqlite3.Connection,
    curation_sha: str,
) -> tuple[dict, dict]:
    row = stage_row(state, "knowledge_compile")
    bootstrap_profile = {}
    if row["status"] != "complete":
        stage_start(state, "knowledge_compile", 1)
        started = time.perf_counter()
        try:
            work_knowledge.unlink(missing_ok=True)
            for suffix in ("-wal", "-shm"):
                Path(str(work_knowledge) + suffix).unlink(missing_ok=True)
            kc = sqlite3.connect(work_knowledge)
            corpus = sqlite3.connect(corpus_path)
            try:
                kc.execute("PRAGMA foreign_keys=ON")
                kc.executescript((schema_dir / "knowledge-v1.sql").read_text(encoding="utf-8"))
                bootstrap_profile = build_knowledge(kc, info["genre_map"], corpus, info["genre_sha"])
                meta(kc, {
                    "vault_sha256": info["vault_sha"],
                    "genre_map_sha256": info["genre_sha"],
                    "build_revision": BUILD_REVISION,
                    "curation_fingerprint": curation_sha,
                })
                kc.commit()
            finally:
                corpus.close()
                kc.close()
            elapsed = time.perf_counter() - started
            stage_complete(state, "knowledge_compile", 1, 1, bootstrap_profile, elapsed)
            progress_line("knowledge:bootstrap", 1, 1, started, extra=[f"genres {bootstrap_profile.get('genres', 0):,}"])
        except Exception as exc:
            stage_error(state, "knowledge_compile", exc)
            raise
    else:
        bootstrap_profile = parse_json(row["detail_json"]) or {}

    overlay_row = stage_row(state, "curation_overlay")
    overlay_profile = {}
    if overlay_row["status"] != "complete":
        stage_start(state, "curation_overlay", 1)
        started = time.perf_counter()
        corpus = sqlite3.connect(corpus_path)
        kc = sqlite3.connect(work_knowledge)
        try:
            queue_profile = seed_review_queue(curation, corpus, info["vault_sha"])
            overlay_profile = apply_curation(kc, curation)
            expression_profile = materialize_instrument_expressions(kc, corpus)
            overlay_profile = {**queue_profile, **overlay_profile, **expression_profile}
            meta(kc, {
                "vault_sha256": info["vault_sha"],
                "genre_map_sha256": info["genre_sha"],
                "build_revision": BUILD_REVISION,
                "curation_fingerprint": curation_sha,
                "compiled_at": utc_now(),
            })
            kc.commit()
        finally:
            corpus.close()
            kc.close()
        elapsed = time.perf_counter() - started
        stage_complete(state, "curation_overlay", 1, 1, overlay_profile, elapsed)
        progress_line(
            "knowledge:curation",
            1,
            1,
            started,
            extra=[
                f"queue +{overlay_profile.get('genre_crosswalk_candidates_added', 0)}",
                f"instrument expressions {overlay_profile.get('instrument_expressions', 0):,}",
            ],
        )
    else:
        overlay_profile = parse_json(overlay_row["detail_json"]) or {}
    return bootstrap_profile, overlay_profile


def validate_stage(state: sqlite3.Connection, corpus_path: Path, knowledge_path: Path, curation_path: Path) -> None:
    if stage_row(state, "validate")["status"] == "complete":
        return
    stage_start(state, "validate", 3)
    started = time.perf_counter()
    checks = []
    for label, path in (("corpus", corpus_path), ("knowledge", knowledge_path), ("curation", curation_path)):
        conn = sqlite3.connect(path)
        try:
            result = conn.execute("PRAGMA integrity_check").fetchone()[0]
        finally:
            conn.close()
        if result != "ok":
            exc = RuntimeError(f"{label} integrity_check failed: {result}")
            stage_error(state, "validate", exc)
            raise exc
        checks.append(label)
        stage_progress(state, "validate", len(checks), 3)
        progress_line("validate", len(checks), 3, started, extra=[label])
    corpus = sqlite3.connect(corpus_path)
    knowledge = sqlite3.connect(knowledge_path)
    try:
        corpus_genres = corpus.execute("SELECT COUNT(*) FROM genre_raw").fetchone()[0]
        knowledge_genres = knowledge.execute("SELECT COUNT(*) FROM genre").fetchone()[0]
        if corpus_genres != knowledge_genres:
            raise RuntimeError(f"genre count mismatch: corpus={corpus_genres} knowledge={knowledge_genres}")
        if knowledge.execute("SELECT COUNT(*) FROM prompt_section_definition WHERE lower(output_label)='exclude'").fetchone()[0]:
            raise RuntimeError("Exclude must not be a structured prompt section")
        source_over_limit = corpus.execute(
            "SELECT COUNT(*) FROM track WHERE length(structured_prompt)>?",
            (STYLE_PROMPT_MAX_CHARACTERS,),
        ).fetchone()[0]
        if source_over_limit:
            raise RuntimeError(
                f"{source_over_limit} source structured prompts exceed "
                f"{STYLE_PROMPT_MAX_CHARACTERS} characters"
            )
        renderer_budget = knowledge.execute(
            "SELECT max_characters FROM renderer_profile WHERE id='suno-structured-v1'"
        ).fetchone()
        if not renderer_budget or renderer_budget[0] != STYLE_PROMPT_MAX_CHARACTERS:
            raise RuntimeError(
                "suno-structured-v1 renderer budget does not match "
                f"{STYLE_PROMPT_MAX_CHARACTERS} characters"
            )
        source_expression_count = len(collect_source_instrument_expressions(corpus))
        knowledge_expression_count = knowledge.execute(
            "SELECT COUNT(*) FROM instrument_expression WHERE source_kind='factory'"
        ).fetchone()[0]
        selectable_expression_count = knowledge.execute(
            "SELECT COUNT(*) FROM instrument_expression WHERE source_kind='factory' AND selectable=1 AND status<>'deprecated'"
        ).fetchone()[0]
        if source_expression_count != knowledge_expression_count:
            raise RuntimeError(
                f"instrument expression count mismatch: source={source_expression_count} knowledge={knowledge_expression_count}"
            )
        if selectable_expression_count != source_expression_count:
            raise RuntimeError(
                f"not all source instrument expressions are selectable: source={source_expression_count} selectable={selectable_expression_count}"
            )
    except Exception as exc:
        stage_error(state, "validate", exc)
        raise
    finally:
        corpus.close()
        knowledge.close()
    stage_complete(state, "validate", 3, 3, {"integrity": checks, "invariants": "ok"}, time.perf_counter() - started)


def collect_knowledge_profile(path: Path) -> dict:
    conn = sqlite3.connect(path)
    try:
        return {
            "major_genres": conn.execute("SELECT COUNT(*) FROM major_genre").fetchone()[0],
            "genres": conn.execute("SELECT COUNT(*) FROM genre").fetchone()[0],
            "approved_genre_aliases": conn.execute("SELECT COUNT(*) FROM genre_alias WHERE status='approved'").fetchone()[0],
            "knowledge_entries": conn.execute("SELECT COUNT(*) FROM knowledge_entry").fetchone()[0],
            "approved_definitions": conn.execute("SELECT COUNT(*) FROM definition WHERE status='approved'").fetchone()[0],
            "instruments": conn.execute("SELECT COUNT(*) FROM instrument WHERE status<>'deprecated'").fetchone()[0],
            "instrument_expressions": conn.execute("SELECT COUNT(*) FROM instrument_expression WHERE status<>'deprecated'").fetchone()[0],
            "instrument_expression_identity": conn.execute("SELECT COUNT(*) FROM instrument_expression WHERE decomposition_state='identity' AND status<>'deprecated'").fetchone()[0],
            "instrument_expression_semantic_only": conn.execute("SELECT COUNT(*) FROM instrument_expression WHERE decomposition_state='semantic' AND status<>'deprecated'").fetchone()[0],
            "instrument_expression_partial": conn.execute("SELECT COUNT(*) FROM instrument_expression WHERE decomposition_state='partial' AND status<>'deprecated'").fetchone()[0],
            "instrument_expression_unresolved": conn.execute("SELECT COUNT(*) FROM instrument_expression WHERE decomposition_state='unresolved' AND status<>'deprecated'").fetchone()[0],
            "renderer_sections": conn.execute("SELECT COUNT(*) FROM renderer_section WHERE renderer_profile_id='suno-structured-v1'").fetchone()[0],
            "renderer_max_characters": conn.execute("SELECT max_characters FROM renderer_profile WHERE id='suno-structured-v1'").fetchone()[0],
        }
    finally:
        conn.close()


def report_stage(state: sqlite3.Connection, corpus_path: Path, knowledge_path: Path, curation_sha: str, work_report: Path, info: dict) -> dict:
    row = stage_row(state, "report")
    if row["status"] == "complete" and work_report.is_file():
        return json.loads(work_report.read_text(encoding="utf-8"))
    stage_start(state, "report", 1)
    started = time.perf_counter()
    corpus = sqlite3.connect(corpus_path)
    try:
        cprof = corpus_profile(corpus)
    finally:
        corpus.close()
    kprof = collect_knowledge_profile(knowledge_path)
    stage_snapshot = []
    for r in state.execute("SELECT name,ordinal,status,processed,total,elapsed_seconds,detail_json FROM build_stage ORDER BY ordinal"):
        d = dict(r)
        d["detail"] = parse_json(d.pop("detail_json"))
        stage_snapshot.append(d)
    report = {
        "schema": "promptvgine-local-data-build-report-v2",
        "status": "validated_ready_to_promote",
        "generated_at": utc_now(),
        "build_revision": BUILD_REVISION,
        "source": {
            "vault_sha256": info["vault_sha"],
            "genre_map_sha256": info["genre_sha"],
            "vault_schema": info["vault"].get("schema"),
            "vault_version": info["vault"].get("version"),
            "genre_schema": info["genre_map"].get("schema"),
            "taxonomy_version": info["genre_map"].get("taxonomy_version"),
        },
        "curation_fingerprint": curation_sha,
        "corpus": cprof,
        "knowledge": kprof,
        "stages": stage_snapshot,
        "safety": {
            "curation_replaced": False,
            "promotion_after_integrity_checks": True,
            "source_fingerprints_bound": True,
        },
    }
    work_report.parent.mkdir(parents=True, exist_ok=True)
    temp = work_report.with_suffix(".tmp")
    temp.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    os.replace(temp, work_report)
    stage_complete(state, "report", 1, 1, {"report": str(work_report)}, time.perf_counter() - started)
    return report


def checkpoint_and_close(path: Path) -> None:
    if not path.is_file():
        return
    conn = sqlite3.connect(path)
    try:
        conn.execute("PRAGMA wal_checkpoint(TRUNCATE)")
    finally:
        conn.close()


def promote_files(
    state: sqlite3.Connection,
    work_corpus: Path,
    corpus_was_built: bool,
    work_knowledge: Path,
    promoted_corpus: Path,
    promoted_knowledge: Path,
    work_report: Path,
    final_report: Path,
) -> None:
    if stage_row(state, "promote")["status"] == "complete":
        return
    stage_start(state, "promote", 1)
    started = time.perf_counter()
    checkpoint_and_close(work_corpus)
    checkpoint_and_close(work_knowledge)
    final_report.parent.mkdir(parents=True, exist_ok=True)
    promotions = []
    if corpus_was_built:
        promotions.append((work_corpus, promoted_corpus, promoted_corpus.with_name("corpus.previous.sqlite")))
    promotions.append((work_knowledge, promoted_knowledge, promoted_knowledge.with_name("knowledge.previous.sqlite")))
    moved_old = []
    moved_new = []
    try:
        for work, target, previous in promotions:
            if not work.is_file():
                raise RuntimeError(f"work artifact missing before promotion: {work}")
            if target.exists():
                os.replace(target, previous)
                moved_old.append((target, previous))
        for work, target, previous in promotions:
            os.replace(work, target)
            moved_new.append((work, target))
        temp_report = final_report.with_suffix(".tmp")
        shutil.copy2(work_report, temp_report)
        os.replace(temp_report, final_report)
    except Exception:
        for work, target in reversed(moved_new):
            if target.exists():
                os.replace(target, work)
        for target, previous in reversed(moved_old):
            if previous.exists():
                os.replace(previous, target)
        raise
    stage_complete(
        state,
        "promote",
        1,
        1,
        {
            "corpus_promoted": corpus_was_built,
            "knowledge_promoted": True,
            "previous_artifacts_retained": True,
        },
        time.perf_counter() - started,
    )
    set_state_meta(state, {"status": "complete", "completed_at": utc_now()})
    print("[promote] validated artifacts promoted; previous promoted DB(s) retained as *.previous.sqlite.", file=sys.stderr)


def run_build(args) -> int:
    install_signal_handlers()
    info = preflight(args.vault.resolve(), args.genre_map.resolve())
    out_dir = args.out_dir.resolve()
    out_dir.mkdir(parents=True, exist_ok=True)
    schema_dir = args.schema_dir.resolve()
    work_dir = out_dir / WORK_DIR_NAME
    state = open_state(work_dir, schema_dir)
    try:
        bind_state(state, info["vault_sha"], info["genre_sha"])
        curation_path = out_dir / "curation.sqlite"
        curation = init_curation(curation_path, schema_dir)
        try:
            current_curation_sha = curation_fingerprint(curation)
            previous_curation_sha = state_meta(state, "curation_fingerprint")
            promoted_corpus = out_dir / "corpus.sqlite"
            promoted_knowledge = out_dir / "knowledge.sqlite"
            work_corpus = work_dir / "corpus.building.sqlite"
            work_knowledge = work_dir / "knowledge.building.sqlite"
            work_report = work_dir / "build-report.json"
            final_report = out_dir / "reports" / "corpus-profile.json"

            if args.rebuild_corpus:
                print("[corpus] explicit fresh corpus rebuild requested; promoted artifacts and curation remain untouched until validation.", file=sys.stderr)
                reset_stages_from(state, 10)
                for path in (work_corpus, work_knowledge, work_report):
                    path.unlink(missing_ok=True)
                for path in (Path(str(work_corpus) + "-wal"), Path(str(work_corpus) + "-shm"), Path(str(work_knowledge) + "-wal"), Path(str(work_knowledge) + "-shm")):
                    path.unlink(missing_ok=True)

            if previous_curation_sha and previous_curation_sha != current_curation_sha:
                print("[curation] durable curation changed; keeping corpus and rebuilding compiled knowledge only.", file=sys.stderr)
                reset_stages_from(state, 100)
                work_knowledge.unlink(missing_ok=True)
                work_report.unlink(missing_ok=True)
            set_state_meta(state, {"curation_fingerprint": current_curation_sha, "status": "in_progress"})

            if (
                not args.rebuild_corpus
                and promoted_corpus_matches(promoted_corpus, info["vault_sha"], info["genre_sha"])
                and promoted_knowledge_matches(promoted_knowledge, info["vault_sha"], info["genre_sha"], current_curation_sha)
                and not work_corpus.exists()
                and not work_knowledge.exists()
            ):
                mark_stages_complete(state, CORPUS_STAGE_NAMES | KNOWLEDGE_STAGE_NAMES | {"promote"}, {"adopted_promoted": True, "already_current": True})
                set_state_meta(state, {"status": "complete", "completed_at": utc_now()})
                print_json({
                    "status": "ok",
                    "message": "promoted local data is already current",
                    "corpus_db": str(promoted_corpus),
                    "knowledge_db": str(promoted_knowledge),
                    "curation_db": str(curation_path),
                })
                return 0

            corpus_path, corpus_was_built = ensure_corpus(
                state,
                work_corpus,
                promoted_corpus,
                schema_dir,
                info,
                args.vault.resolve(),
                args.genre_map.resolve(),
                args.batch_size,
                args.test_stop_after_batches,
                args.rebuild_corpus,
            )

            # If a prior complete run moved the work corpus away, use the promoted corpus.
            if not corpus_path.exists() and promoted_corpus_matches(promoted_corpus, info["vault_sha"], info["genre_sha"]):
                corpus_path = promoted_corpus
                corpus_was_built = False

            knowledge_needs_build = not promoted_knowledge_matches(
                promoted_knowledge, info["vault_sha"], info["genre_sha"], current_curation_sha
            )
            if stage_row(state, "knowledge_compile")["status"] == "complete" and not work_knowledge.exists() and knowledge_needs_build:
                reset_stages_from(state, 100)

            if knowledge_needs_build or work_knowledge.exists() or stage_row(state, "knowledge_compile")["status"] != "complete":
                bootstrap, overlay = compile_knowledge(
                    state, work_knowledge, schema_dir, info, corpus_path, curation, current_curation_sha
                )
                knowledge_path = work_knowledge
            else:
                mark_stages_complete(state, {"knowledge_compile", "curation_overlay"}, {"adopted_promoted": True})
                knowledge_path = promoted_knowledge

            if not knowledge_path.exists() and promoted_knowledge.exists():
                knowledge_path = promoted_knowledge

            validate_stage(state, corpus_path, knowledge_path, curation_path)
            report = report_stage(state, corpus_path, knowledge_path, current_curation_sha, work_report, info)

            knowledge_is_work = knowledge_path == work_knowledge and work_knowledge.exists()
            if knowledge_is_work:
                promote_files(
                    state,
                    work_corpus,
                    corpus_was_built,
                    work_knowledge,
                    promoted_corpus,
                    promoted_knowledge,
                    work_report,
                    final_report,
                )
            else:
                mark_stages_complete(state, {"promote"}, {"adopted_promoted": True})
                set_state_meta(state, {"status": "complete", "completed_at": utc_now()})

            print_json({
                "status": "ok",
                "build_revision": BUILD_REVISION,
                "corpus_db": str(promoted_corpus),
                "knowledge_db": str(promoted_knowledge),
                "curation_db": str(curation_path),
                "report": str(final_report if final_report.exists() else work_report),
                "corpus": report.get("corpus"),
                "knowledge": report.get("knowledge"),
                "resume_checkpoint": str(work_dir / "state.sqlite"),
            })
            return 0
        finally:
            curation.close()
    except PauseRequested as exc:
        set_state_meta(state, {"status": "paused", "paused_at": utc_now()})
        print(f"[build] PAUSED safely: {exc}", file=sys.stderr)
        print(f"[build] rerun the same command to resume. Status: --out-dir \"{args.out_dir}\" --status", file=sys.stderr)
        return 75
    except KeyboardInterrupt:
        set_state_meta(state, {"status": "paused", "paused_at": utc_now()})
        print("[build] PAUSED safely after KeyboardInterrupt; rerun the same command to resume.", file=sys.stderr)
        return 130
    except Exception as exc:
        set_state_meta(state, {"status": "error", "last_error": str(exc), "error_at": utc_now()})
        print(f"[build] ERROR: {exc}", file=sys.stderr)
        raise
    finally:
        state.close()


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Build/resume local Prompt V'gine corpus + compiled knowledge without risking durable curation."
    )
    parser.add_argument("--vault", type=Path)
    parser.add_argument("--genre-map", type=Path)
    parser.add_argument("--out-dir", required=True, type=Path)
    parser.add_argument("--schema-dir", type=Path, default=Path(__file__).resolve().parents[2] / "schema")
    parser.add_argument("--plan", action="store_true", help="read-only source/output preflight")
    parser.add_argument("--status", action="store_true", help="inspect current promoted artifacts and resumable checkpoint")
    parser.add_argument("--reset-work", action="store_true", help="delete only incomplete/checkpoint work; never promoted DBs or curation")
    parser.add_argument("--rebuild-corpus", action="store_true", help="build a fresh work corpus even when promoted corpus matches")
    parser.add_argument("--batch-size", type=int, default=250)
    parser.add_argument("--force", action="store_true", help=argparse.SUPPRESS)
    parser.add_argument("--deep-token-index", action="store_true", help=argparse.SUPPRESS)
    parser.add_argument("--test-stop-after-batches", type=int, help=argparse.SUPPRESS)
    return parser


def main() -> int:
    args = build_parser().parse_args()
    if args.force:
        raise SystemExit(
            "--force is intentionally retired. Normal reruns resume safely. "
            "Use --reset-work only to discard incomplete checkpoint work; it never deletes promoted DBs or curation."
        )
    if args.batch_size < 1:
        raise SystemExit("--batch-size must be >= 1")
    if args.status:
        show_status(args.out_dir.resolve())
        return 0
    if args.reset_work:
        reset_work(args.out_dir.resolve())
        return 0
    if not args.vault or not args.genre_map:
        raise SystemExit("--vault and --genre-map are required for --plan or build/resume")
    info = preflight(args.vault.resolve(), args.genre_map.resolve())
    if args.plan:
        show_plan(info, args.out_dir.resolve())
        return 0
    return run_build(args)


if __name__ == "__main__":
    raise SystemExit(main())
