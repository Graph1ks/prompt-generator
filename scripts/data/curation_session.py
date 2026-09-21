#!/usr/bin/env python3
"""Bundled local curation workflow: prepare review reports and safely apply decision bundles."""
from __future__ import annotations

import argparse
import csv
import datetime as dt
import difflib
import hashlib
import json
import os
import sqlite3
import subprocess
import sys
from pathlib import Path

REPORT_SCHEMA = "promptvgine-genre-crosswalk-review-v1"
DECISION_SCHEMA = "promptvgine-genre-crosswalk-decisions-v1"
MAX_EXAMPLES = 3
MAX_SUGGESTIONS = 10


def utc_now() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat().replace("+00:00", "Z")


def norm_words(value: str) -> list[str]:
    text = (value or "").casefold().replace("&", " and ")
    out = []
    current = []
    for ch in text:
        if ch.isalnum():
            current.append(ch)
        else:
            if current:
                out.append("".join(current))
                current = []
    if current:
        out.append("".join(current))
    return out


def norm_text(value: str) -> str:
    return " ".join(norm_words(value))


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def sqlite_ro(path: Path) -> sqlite3.Connection:
    if not path.is_file():
        raise SystemExit(f"database not found: {path}")
    conn = sqlite3.connect(f"file:{path.resolve()}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    return conn


def sqlite_rw(path: Path) -> sqlite3.Connection:
    if not path.is_file():
        raise SystemExit(f"database not found: {path}")
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def integrity(path: Path) -> None:
    conn = sqlite3.connect(path)
    try:
        result = conn.execute("PRAGMA integrity_check").fetchone()[0]
    finally:
        conn.close()
    if result != "ok":
        raise SystemExit(f"integrity_check failed for {path}: {result}")


def backup_sqlite(source: Path, backup_dir: Path) -> Path:
    integrity(source)
    backup_dir.mkdir(parents=True, exist_ok=True)
    stamp = dt.datetime.now().strftime("%Y%m%d-%H%M%S-%f")
    target = backup_dir / f"curation-{stamp}.sqlite"
    src = sqlite3.connect(source)
    dst = sqlite3.connect(target)
    try:
        src.backup(dst)
        dst.commit()
    finally:
        dst.close()
        src.close()
    integrity(target)
    return target


def corpus_source_hashes(corpus: sqlite3.Connection) -> dict:
    rows = corpus.execute(
        "SELECT kind,sha256,schema_name,schema_version FROM source_file ORDER BY kind,id"
    ).fetchall()
    return {
        row["kind"]: {
            "sha256": row["sha256"],
            "schema": row["schema_name"],
            "version": row["schema_version"],
        }
        for row in rows
    }


def taxonomy(corpus: sqlite3.Connection) -> list[dict]:
    majors: dict[str, list[str]] = {}
    for row in corpus.execute(
        """SELECT g.genre_key,m.label
           FROM genre_raw g
           LEFT JOIN genre_major_raw gm ON gm.genre_key=g.genre_key
           LEFT JOIN major_genre_raw m ON m.major_key=gm.major_key
           ORDER BY g.source_ordinal,gm.ordinal"""
    ):
        majors.setdefault(row["genre_key"], [])
        if row["label"]:
            majors[row["genre_key"]].append(row["label"])
    return [
        {
            "genre_id": row["genre_key"],
            "label": row["label"],
            "normalized": row["label_norm"],
            "majors": majors.get(row["genre_key"], []),
        }
        for row in corpus.execute(
            "SELECT genre_key,label,label_norm FROM genre_raw ORDER BY source_ordinal"
        )
    ]


def similarity(source: str, target: str) -> tuple[float, dict]:
    s_norm = norm_text(source)
    t_norm = norm_text(target)
    s_tokens = set(s_norm.split())
    t_tokens = set(t_norm.split())
    seq = difflib.SequenceMatcher(None, s_norm, t_norm).ratio()
    union = s_tokens | t_tokens
    jaccard = len(s_tokens & t_tokens) / len(union) if union else 0.0
    containment = 1.0 if t_tokens and t_tokens <= s_tokens else 0.0
    reverse_containment = 1.0 if s_tokens and s_tokens <= t_tokens else 0.0
    prefix = 1.0 if s_norm.startswith(t_norm) or t_norm.startswith(s_norm) else 0.0
    score = (
        0.50 * seq
        + 0.28 * jaccard
        + 0.12 * containment
        + 0.05 * reverse_containment
        + 0.05 * prefix
    )
    return score, {
        "sequence": round(seq, 4),
        "token_jaccard": round(jaccard, 4),
        "target_tokens_contained": bool(containment),
        "source_tokens_contained": bool(reverse_containment),
    }


def suggestions(surface: str, taxonomy_rows: list[dict]) -> list[dict]:
    ranked = []
    source_tokens = set(norm_words(surface))
    for row in taxonomy_rows:
        score, signals = similarity(surface, row["label"])
        target_tokens = set(norm_words(row["label"]))
        component = bool(target_tokens and target_tokens <= source_tokens)
        ranked.append(
            {
                "genre_id": row["genre_id"],
                "label": row["label"],
                "majors": row["majors"],
                "score": round(score, 4),
                "component_match": component,
                "signals": signals,
            }
        )
    ranked.sort(
        key=lambda item: (
            item["component_match"],
            item["score"],
            len(norm_words(item["label"])),
            item["label"].casefold(),
        ),
        reverse=True,
    )
    return ranked[:MAX_SUGGESTIONS]


def track_examples(corpus: sqlite3.Connection, surface: str, limit: int = MAX_EXAMPLES) -> list[dict]:
    rows = corpus.execute(
        """SELECT track_id,title,bpm,emotion_raw,style_raw,year,key_raw,reference_artist,reference_song
           FROM track WHERE genre_raw=? ORDER BY source_ordinal LIMIT ?""",
        (surface, limit),
    ).fetchall()
    examples = []
    for row in rows:
        section_rows = corpus.execute(
            """SELECT canonical_key,raw_label,content_raw
               FROM prompt_section WHERE track_id=? ORDER BY ordinal""",
            (row["track_id"],),
        ).fetchall()
        examples.append(
            {
                "track_id": row["track_id"],
                "title": row["title"],
                "year": row["year"],
                "bpm": row["bpm"],
                "key": row["key_raw"],
                "emotion": row["emotion_raw"],
                "style": row["style_raw"],
                "reference_artist": row["reference_artist"],
                "reference_song": row["reference_song"],
                "sections": [
                    {
                        "key": sec["canonical_key"],
                        "label": sec["raw_label"],
                        "content": sec["content_raw"],
                    }
                    for sec in section_rows
                ],
            }
        )
    return examples


def stable_report_id(source_hashes: dict, candidates: list[dict]) -> str:
    payload = {
        "schema": REPORT_SCHEMA,
        "source_hashes": source_hashes,
        "candidates": [
            {
                "candidate_key": c["candidate_key"],
                "surface": c["surface"],
                "normalized_surface": c["normalized_surface"],
                "track_count": c["track_count"],
            }
            for c in candidates
        ],
    }
    raw = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    return "genre-xwalk-" + hashlib.sha256(raw).hexdigest()[:24]


def build_review_report(corpus_path: Path, curation_path: Path) -> dict:
    with sqlite_ro(corpus_path) as corpus, sqlite_ro(curation_path) as curation:
        source_hashes = corpus_source_hashes(corpus)
        tax = taxonomy(corpus)
        queue = curation.execute(
            """SELECT candidate_key,surface,normalized_surface,evidence_json,review_status,reviewer_note
               FROM candidate_review
               WHERE candidate_type='genre_crosswalk' AND review_status='unreviewed'
               ORDER BY surface COLLATE NOCASE"""
        ).fetchall()
        corpus_counts = {
            row["vault_genre_raw"]: row["vault_track_count"]
            for row in corpus.execute(
                """SELECT vault_genre_raw,vault_track_count
                   FROM genre_crosswalk_candidate WHERE match_status='unmatched'"""
            )
        }
        candidates = []
        for row in queue:
            try:
                evidence = json.loads(row["evidence_json"])
            except Exception:
                evidence = {"raw": row["evidence_json"]}
            candidates.append(
                {
                    "candidate_key": row["candidate_key"],
                    "surface": row["surface"],
                    "normalized_surface": row["normalized_surface"],
                    "track_count": int(corpus_counts.get(row["surface"], evidence.get("vault_track_count", 0) or 0)),
                    "review_status": row["review_status"],
                    "reviewer_note": row["reviewer_note"],
                    "evidence": evidence,
                    "nearest_taxonomy_candidates": suggestions(row["surface"], tax),
                    "source_examples": track_examples(corpus, row["surface"]),
                }
            )
        report_id = stable_report_id(source_hashes, candidates)
        return {
            "schema": REPORT_SCHEMA,
            "report_id": report_id,
            "generated_at": utc_now(),
            "purpose": "AI/human review input; no decision in this file is automatically applied.",
            "source": source_hashes,
            "counts": {
                "unreviewed_genre_crosswalk_candidates": len(candidates),
                "taxonomy_genres": len(tax),
            },
            "decision_contract": {
                "schema": DECISION_SCHEMA,
                "allowed_decision_kinds": ["alias", "composite", "taxonomy-gap", "ignore", "defer"],
                "alias_targets": "exactly 1 canonical genre_id",
                "composite_targets": "2 or more canonical genre_id values",
                "taxonomy_gap_targets": "0 targets",
                "ignore_targets": "0 targets",
                "defer_targets": "0 targets",
            },
            "candidates": candidates,
        }


def write_report_files(report: dict, reports_dir: Path) -> tuple[Path, Path, Path]:
    reports_dir.mkdir(parents=True, exist_ok=True)
    json_path = reports_dir / "curation-genre-crosswalk-review-v1.json"
    csv_path = reports_dir / "curation-genre-crosswalk-review-v1.csv"
    summary_path = reports_dir / "curation-session-summary.json"

    tmp = json_path.with_suffix(".tmp")
    tmp.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    os.replace(tmp, json_path)

    with csv_path.open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow(
            [
                "candidate_key",
                "surface",
                "track_count",
                "top_candidate",
                "top_candidate_id",
                "top_score",
                "top_majors",
                "component_candidates",
            ]
        )
        for candidate in report["candidates"]:
            suggestions_list = candidate["nearest_taxonomy_candidates"]
            top = suggestions_list[0] if suggestions_list else {}
            component_labels = [
                item["label"] for item in suggestions_list if item.get("component_match")
            ]
            writer.writerow(
                [
                    candidate["candidate_key"],
                    candidate["surface"],
                    candidate["track_count"],
                    top.get("label", ""),
                    top.get("genre_id", ""),
                    top.get("score", ""),
                    " | ".join(top.get("majors", [])),
                    " | ".join(component_labels),
                ]
            )

    summary = {
        "schema": "promptvgine-curation-session-summary-v1",
        "generated_at": utc_now(),
        "report_id": report["report_id"],
        "candidate_count": report["counts"]["unreviewed_genre_crosswalk_candidates"],
        "review_json": str(json_path),
        "review_csv": str(csv_path),
        "review_json_sha256": sha256_file(json_path),
        "next_expected_file": str(reports_dir / "curation-genre-crosswalk-decisions-v1.json"),
    }
    tmp = summary_path.with_suffix(".tmp")
    tmp.write_text(json.dumps(summary, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    os.replace(tmp, summary_path)
    return json_path, csv_path, summary_path


def prepare(args) -> int:
    out_dir = args.out_dir.resolve()
    corpus_path = out_dir / "corpus.sqlite"
    curation_path = out_dir / "curation.sqlite"
    integrity(corpus_path)
    integrity(curation_path)

    backup = backup_sqlite(curation_path, out_dir.parent / "backups")
    report = build_review_report(corpus_path, curation_path)
    reports_dir = out_dir / "reports"
    json_path, csv_path, summary_path = write_report_files(report, reports_dir)

    print(
        f"[curation] prepared {report['counts']['unreviewed_genre_crosswalk_candidates']} candidates · "
        f"backup OK · report: {json_path}"
    )
    return 0


def load_json(path: Path) -> dict:
    if not path.is_file():
        raise SystemExit(f"file not found: {path}")
    try:
        return json.loads(path.read_text(encoding="utf-8-sig"))
    except json.JSONDecodeError as exc:
        raise SystemExit(f"invalid JSON: {path}: {exc}") from exc


def current_report_id(corpus_path: Path, curation_path: Path) -> str:
    return build_review_report(corpus_path, curation_path)["report_id"]


def validate_decision_bundle(bundle: dict, corpus: sqlite3.Connection, curation: sqlite3.Connection, expected_report_id: str) -> list[dict]:
    if bundle.get("schema") != DECISION_SCHEMA:
        raise SystemExit(f"unsupported decision schema: {bundle.get('schema')!r}")
    if bundle.get("report_id") != expected_report_id:
        raise SystemExit(
            "decision bundle is stale or belongs to another review report; run prepare again and review the new report"
        )
    decisions = bundle.get("decisions")
    if not isinstance(decisions, list) or not decisions:
        raise SystemExit("decision bundle has no decisions")

    valid_genres = {
        row["genre_key"]: row["label"]
        for row in corpus.execute("SELECT genre_key,label FROM genre_raw")
    }
    queue = {
        row["candidate_key"]: row
        for row in curation.execute(
            """SELECT candidate_key,surface,normalized_surface,evidence_json,review_status
               FROM candidate_review WHERE candidate_type='genre_crosswalk'"""
        )
    }

    seen = set()
    validated = []
    for raw in decisions:
        key = raw.get("candidate_key")
        if not key or key in seen:
            raise SystemExit(f"missing/duplicate candidate_key in decision bundle: {key!r}")
        seen.add(key)
        q = queue.get(key)
        if not q:
            raise SystemExit(f"unknown candidate_key: {key}")
        if q["review_status"] != "unreviewed":
            raise SystemExit(f"candidate is no longer unreviewed: {key}")
        if raw.get("source_surface") != q["surface"]:
            raise SystemExit(f"source_surface mismatch for {key}")
        kind = raw.get("decision_kind")
        if kind not in {"alias", "composite", "taxonomy-gap", "ignore", "defer"}:
            raise SystemExit(f"invalid decision_kind for {key}: {kind!r}")
        targets = raw.get("targets") or []
        if not isinstance(targets, list):
            raise SystemExit(f"targets must be a list for {key}")
        if kind == "alias" and len(targets) != 1:
            raise SystemExit(f"alias requires exactly 1 target for {key}")
        if kind == "composite" and len(targets) < 2:
            raise SystemExit(f"composite requires 2+ targets for {key}")
        if kind in {"taxonomy-gap", "ignore", "defer"} and targets:
            raise SystemExit(f"{kind} requires zero targets for {key}")
        target_ids = []
        for target in targets:
            genre_id = target.get("genre_id")
            if genre_id not in valid_genres:
                raise SystemExit(f"unknown target genre_id for {key}: {genre_id!r}")
            if genre_id in target_ids:
                raise SystemExit(f"duplicate target genre_id for {key}: {genre_id}")
            target_ids.append(genre_id)
        rationale = (raw.get("rationale") or "").strip()
        if not rationale:
            raise SystemExit(f"missing rationale for {key}")
        confidence = raw.get("confidence")
        if confidence is not None and confidence not in {"high", "medium", "low"}:
            raise SystemExit(f"invalid confidence for {key}: {confidence!r}")
        validated.append(
            {
                "candidate_key": key,
                "source_surface": q["surface"],
                "source_norm": q["normalized_surface"],
                "decision_kind": kind,
                "targets": targets,
                "rationale": rationale,
                "confidence": confidence,
                "evidence": json.loads(q["evidence_json"]),
            }
        )
    return validated


def apply_decisions(curation_path: Path, validated: list[dict]) -> dict:
    conn = sqlite_rw(curation_path)
    applied = 0
    try:
        conn.execute("BEGIN IMMEDIATE")
        for item in validated:
            key = item["candidate_key"]
            kind = item["decision_kind"]
            targets = item["targets"]
            evidence = item["evidence"] or {}
            source_hash = evidence.get("vault_sha256")
            timestamp = utc_now()
            stored_status = "approved" if kind in {"alias", "composite", "taxonomy-gap", "ignore"} else "reviewed"
            review_status = (
                "accepted"
                if kind in {"alias", "composite", "taxonomy-gap"}
                else "rejected"
                if kind == "ignore"
                else "deferred"
            )
            reviewer_note = item["rationale"]
            if item.get("confidence"):
                reviewer_note = f"[confidence: {item['confidence']}] {reviewer_note}"

            rows = targets if targets else [None]
            for ordinal, target in enumerate(rows, 1):
                target_genre_id = target.get("genre_id") if target else None
                role_hint = target.get("role_hint") if target else None
                decision_id = "genre-xwalk:" + hashlib.sha1(
                    f"{item['source_norm']}|{kind}|{ordinal}|1".encode("utf-8")
                ).hexdigest()[:20]
                conn.execute(
                    """INSERT INTO genre_crosswalk_decision(
                         id,source_surface,source_norm,target_genre_id,target_role_hint,decision_kind,
                         ordinal,status,rationale,source_factory_hash,revision,updated_at
                       ) VALUES (?,?,?,?,?,?,?,?,?,?,1,?)""",
                    (
                        decision_id,
                        item["source_surface"],
                        item["source_norm"],
                        target_genre_id,
                        role_hint,
                        kind,
                        ordinal,
                        stored_status,
                        item["rationale"],
                        source_hash,
                        timestamp,
                    ),
                )
            update = conn.execute(
                """UPDATE candidate_review
                   SET review_status=?,reviewed_at=?,reviewer_note=?
                   WHERE candidate_key=? AND review_status='unreviewed'""",
                (review_status, timestamp, reviewer_note, key),
            )
            if update.rowcount != 1:
                raise RuntimeError(f"candidate update failed or became stale: {key}")
            applied += 1
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
    integrity(curation_path)
    return {"applied_candidates": applied}


def restore_backup(backup: Path, target: Path) -> None:
    src = sqlite3.connect(backup)
    dst = sqlite3.connect(target)
    try:
        src.backup(dst)
        dst.commit()
    finally:
        dst.close()
        src.close()
    integrity(target)


def run_recompile(args, logs_dir: Path) -> dict:
    builder = Path(__file__).resolve().parent / "build_local_data.py"
    validator = Path(__file__).resolve().parent / "validate_local_data.py"
    cmd = [
        sys.executable,
        str(builder),
        "--vault",
        str(args.vault.resolve()),
        "--genre-map",
        str(args.genre_map.resolve()),
        "--out-dir",
        str(args.out_dir.resolve()),
    ]
    result = subprocess.run(cmd, text=True, stdout=subprocess.PIPE)
    build_stdout_path = logs_dir / "curation-last-recompile-output.json.txt"
    build_stdout_path.write_text(result.stdout or "", encoding="utf-8")
    if result.returncode != 0:
        raise RuntimeError(f"knowledge recompile failed with exit code {result.returncode}")

    validate = subprocess.run(
        [sys.executable, str(validator), "--dir", str(args.out_dir.resolve())],
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    validate_path = logs_dir / "curation-last-validation.txt"
    validate_path.write_text(validate.stdout or "", encoding="utf-8")
    if validate.returncode != 0:
        raise RuntimeError(f"post-apply validation failed with exit code {validate.returncode}")

    parsed = None
    try:
        parsed = json.loads(result.stdout)
    except Exception:
        pass
    return {
        "builder_returncode": result.returncode,
        "builder_summary": parsed,
        "validation_returncode": validate.returncode,
        "builder_output_file": str(build_stdout_path),
        "validation_output_file": str(validate_path),
    }


def apply_bundle(args) -> int:
    out_dir = args.out_dir.resolve()
    corpus_path = out_dir / "corpus.sqlite"
    curation_path = out_dir / "curation.sqlite"
    reports_dir = out_dir / "reports"
    reports_dir.mkdir(parents=True, exist_ok=True)
    logs_dir = out_dir / "logs"
    logs_dir.mkdir(parents=True, exist_ok=True)

    integrity(corpus_path)
    integrity(curation_path)
    expected_report_id = current_report_id(corpus_path, curation_path)
    bundle = load_json(args.bundle.resolve())

    with sqlite_ro(corpus_path) as corpus, sqlite_ro(curation_path) as curation:
        validated = validate_decision_bundle(bundle, corpus, curation, expected_report_id)

    backup = backup_sqlite(curation_path, out_dir.parent / "backups")
    receipt = {
        "schema": "promptvgine-curation-apply-receipt-v1",
        "started_at": utc_now(),
        "report_id": expected_report_id,
        "decision_bundle": str(args.bundle.resolve()),
        "decision_bundle_sha256": sha256_file(args.bundle.resolve()),
        "backup": str(backup),
        "candidate_count": len(validated),
        "status": "running",
    }
    receipt_path = reports_dir / "curation-last-apply-receipt.json"

    try:
        receipt["apply"] = apply_decisions(curation_path, validated)
        receipt["recompile"] = run_recompile(args, logs_dir)
        receipt["status"] = "ok"
        receipt["completed_at"] = utc_now()
    except Exception as exc:
        restore_backup(backup, curation_path)
        receipt["status"] = "rolled_back"
        receipt["error"] = str(exc)
        receipt["rolled_back_at"] = utc_now()
        receipt_path.write_text(json.dumps(receipt, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"[curation] FAILED safely · curation restored from backup · report: {receipt_path}")
        return 1

    receipt_path.write_text(json.dumps(receipt, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    # Prepare the next report automatically so the local report folder always reflects current review state.
    next_report = build_review_report(corpus_path, curation_path)
    next_json, _, _ = write_report_files(next_report, reports_dir)
    print(
        f"[curation] applied {len(validated)} decisions · recompile + validation OK · "
        f"remaining {next_report['counts']['unreviewed_genre_crosswalk_candidates']} · receipt: {receipt_path}"
    )
    return 0


def parser() -> argparse.ArgumentParser:
    ap = argparse.ArgumentParser(
        description="Bundled Prompt V'gine curation workflow with report files and concise console output."
    )
    sub = ap.add_subparsers(dest="command", required=True)

    p = sub.add_parser("prepare", help="backup durable curation and write complete local review reports")
    p.add_argument("--out-dir", type=Path, required=True)

    p = sub.add_parser("apply", help="transactionally apply a reviewed decision bundle, recompile, validate, and refresh reports")
    p.add_argument("--out-dir", type=Path, required=True)
    p.add_argument("--bundle", type=Path, required=True)
    p.add_argument("--vault", type=Path, required=True)
    p.add_argument("--genre-map", type=Path, required=True)
    return ap


def main() -> int:
    args = parser().parse_args()
    if args.command == "prepare":
        return prepare(args)
    if args.command == "apply":
        return apply_bundle(args)
    raise SystemExit("unknown command")


if __name__ == "__main__":
    raise SystemExit(main())
