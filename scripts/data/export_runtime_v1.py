#!/usr/bin/env python3
"""Compile knowledge.sqlite into deterministic Prompt V'gine Runtime Pack v1 artifacts."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import sqlite3
import sys
from pathlib import Path
from typing import Any, Callable

CONTRACT = "vgine-runtime-pack-v1"
SCHEMA_VERSION = 1
ROOT = Path(__file__).resolve().parents[2]
DEFAULT_EDITOR_FOUNDATION = ROOT / "data" / "product" / "editor-foundation-v1.json"

PAYLOAD_FILES = (
    "core.json",
    "genres.json",
    "instruments.json",
    "instrument-expressions.json",
    "editor.json",
    "knowledge.json",
    "search.json",
)


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def json_bytes(value: Any) -> bytes:
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + "\n").encode("utf-8")


def write_json_atomic(path: Path, value: Any) -> str:
    data = json_bytes(value)
    tmp = path.with_name(path.name + ".tmp")
    tmp.write_bytes(data)
    os.replace(tmp, path)
    return hashlib.sha256(data).hexdigest()


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def load_editor_foundation(path: Path) -> dict[str, Any]:
    if not path.is_file():
        raise RuntimeError(f"editor foundation not found: {path}")
    value = read_json(path)
    if value.get("schema") != "vgine-editor-foundation-v1" or value.get("version") != 1:
        raise RuntimeError("unsupported editor foundation contract")
    for key in ("parameters", "parameter_options", "statements", "exclude"):
        if not isinstance(value.get(key), list):
            raise RuntimeError(f"editor foundation {key} must be a list")
        ids = [row.get("id") for row in value[key]]
        if any(not isinstance(item, str) or not item for item in ids):
            raise RuntimeError(f"editor foundation {key} contains an invalid id")
        if len(ids) != len(set(ids)):
            raise RuntimeError(f"editor foundation {key} contains duplicate ids")
    parameter_ids = {row["id"] for row in value["parameters"]}
    missing_parameters = sorted({
        row.get("parameter_id")
        for row in value["parameter_options"]
        if row.get("parameter_id") not in parameter_ids
    })
    if missing_parameters:
        raise RuntimeError(
            "editor foundation parameter options reference missing parameters: "
            + ", ".join(str(item) for item in missing_parameters)
        )
    return value


def merge_records(
    foundation_rows: list[dict[str, Any]],
    database_rows: list[dict[str, Any]],
    *,
    sort_key: Callable[[dict[str, Any]], Any],
) -> list[dict[str, Any]]:
    merged: dict[str, dict[str, Any]] = {}
    for row in foundation_rows:
        merged[row["id"]] = dict(row)
    for row in database_rows:
        current = merged.get(row["id"], {})
        merged[row["id"]] = {**current, **row}
    return sorted(merged.values(), key=sort_key)


def connect_ro(path: Path) -> sqlite3.Connection:
    if not path.is_file():
        raise RuntimeError(f"knowledge database not found: {path}")
    conn = sqlite3.connect(f"file:{path.resolve()}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    return conn


def rows(conn: sqlite3.Connection, sql: str, params: tuple[Any, ...] = ()) -> list[dict[str, Any]]:
    return [dict(row) for row in conn.execute(sql, params)]


def bool_fields(record: dict[str, Any], *names: str) -> dict[str, Any]:
    for name in names:
        if name in record:
            record[name] = bool(record[name])
    return record


def build_meta(conn: sqlite3.Connection) -> dict[str, str]:
    return {row["key"]: row["value"] for row in conn.execute("SELECT key,value FROM build_meta ORDER BY key")}


def export_core(conn: sqlite3.Connection) -> dict[str, Any]:
    major = rows(conn, "SELECT id,label,source_ordinal,knowledge_entry_id FROM major_genre ORDER BY source_ordinal,id")
    sections = [
        bool_fields(x, "optional", "easy_visible", "advanced_visible")
        for x in rows(
            conn,
            """SELECT section_key AS key,output_label AS label,output_order AS output_order,
                      optional,easy_visible,advanced_visible,knowledge_entry_id,notes
               FROM prompt_section_definition ORDER BY output_order,section_key""",
        )
    ]
    profiles = []
    for p in rows(
        conn,
        """SELECT id,label,version,active,max_characters,overflow_policy,notes
           FROM renderer_profile ORDER BY active DESC,id""",
    ):
        bool_fields(p, "active")
        p["sections"] = [
            bool_fields(x, "emit_when_empty")
            for x in rows(
                conn,
                """SELECT section_key,output_label_override,output_order,emit_when_empty,
                          soft_max_characters,source_sample_count
                   FROM renderer_section WHERE renderer_profile_id=?
                   ORDER BY output_order,section_key""",
                (p["id"],),
            )
        ]
        profiles.append(p)
    return {"schema": "vgine-runtime-core-v1", "major_genres": major, "sections": sections, "renderer_profiles": profiles}


def export_genres(conn: sqlite3.Connection) -> dict[str, Any]:
    majors_by_genre: dict[str, list[str]] = {}
    for x in rows(conn, "SELECT genre_id,major_genre_id FROM genre_major ORDER BY genre_id,ordinal,major_genre_id"):
        majors_by_genre.setdefault(x["genre_id"], []).append(x["major_genre_id"])
    aliases_by_genre: dict[str, list[dict[str, Any]]] = {}
    for x in rows(
        conn,
        """SELECT genre_id,alias_surface AS surface,alias_norm AS normalized,alias_kind AS kind
           FROM genre_alias WHERE status IN ('reviewed','approved')
           ORDER BY genre_id,alias_norm""",
    ):
        aliases_by_genre.setdefault(x.pop("genre_id"), []).append(x)
    traits_by_genre: dict[str, list[dict[str, Any]]] = {}
    for x in rows(
        conn,
        """SELECT genre_id,section_key,entry_id,role,evidence_count,confidence
           FROM genre_trait WHERE status IN ('reviewed','approved')
           ORDER BY genre_id,section_key,entry_id,COALESCE(role,'')""",
    ):
        traits_by_genre.setdefault(x.pop("genre_id"), []).append(x)
    genres = []
    for g in rows(
        conn,
        """SELECT id,label,label_norm AS normalized,knowledge_entry_id
           FROM genre WHERE status<>'deprecated' ORDER BY label_norm,id""",
    ):
        gid = g["id"]
        g["major_genre_ids"] = majors_by_genre.get(gid, [])
        g["aliases"] = aliases_by_genre.get(gid, [])
        g["traits"] = traits_by_genre.get(gid, [])
        genres.append(g)
    return {"schema": "vgine-runtime-genres-v1", "genres": genres}


def export_instruments(conn: sqlite3.Connection) -> dict[str, Any]:
    families = rows(conn, "SELECT id,label,knowledge_entry_id FROM instrument_family ORDER BY label,id")
    aliases: dict[str, list[str]] = {}
    for x in rows(
        conn,
        """SELECT instrument_id,alias_surface FROM instrument_alias
           WHERE status IN ('reviewed','approved') ORDER BY instrument_id,alias_norm""",
    ):
        aliases.setdefault(x["instrument_id"], []).append(x["alias_surface"])
    traits: dict[str, list[dict[str, Any]]] = {}
    for x in rows(
        conn,
        """SELECT instrument_id,entry_id,trait_type,confidence FROM instrument_trait
           WHERE status IN ('reviewed','approved')
           ORDER BY instrument_id,trait_type,entry_id""",
    ):
        traits.setdefault(x.pop("instrument_id"), []).append(x)
    instruments = []
    for inst in rows(
        conn,
        """SELECT id,label,label_norm AS normalized,family_id,knowledge_entry_id
           FROM instrument WHERE status<>'deprecated' ORDER BY label_norm,id""",
    ):
        iid = inst["id"]
        inst["aliases"] = aliases.get(iid, [])
        inst["traits"] = traits.get(iid, [])
        instruments.append(inst)
    return {"schema": "vgine-runtime-instruments-v1", "families": families, "instruments": instruments}


def export_instrument_expressions(conn: sqlite3.Connection) -> dict[str, Any]:
    instruments_by_expression: dict[str, list[dict[str, Any]]] = {}
    for x in rows(
        conn,
        """SELECT expression_id,instrument_id,role,ordinal
           FROM instrument_expression_instrument ORDER BY expression_id,ordinal,instrument_id""",
    ):
        instruments_by_expression.setdefault(x.pop("expression_id"), []).append(x)
    concepts_by_expression: dict[str, list[dict[str, Any]]] = {}
    for x in rows(
        conn,
        """SELECT expression_id,entry_id,role,ordinal
           FROM instrument_expression_concept ORDER BY expression_id,ordinal,entry_id""",
    ):
        concepts_by_expression.setdefault(x.pop("expression_id"), []).append(x)
    expressions = []
    for x in rows(
        conn,
        """SELECT id,label,label_norm AS normalized,output_text,source_kind,status,selectable,
                  base_instrument_id,occurrence_count,track_count,decomposition_state,
                  semantic_coverage,residual_json
           FROM instrument_expression
           WHERE status<>'deprecated' AND selectable=1
           ORDER BY label_norm,id""",
    ):
        eid = x["id"]
        x["selectable"] = bool(x["selectable"])
        try:
            x["residual_terms"] = json.loads(x.pop("residual_json"))
        except json.JSONDecodeError as exc:
            raise RuntimeError(f"invalid residual_json for instrument expression {eid}") from exc
        x["instruments"] = instruments_by_expression.get(eid, [])
        x["concepts"] = concepts_by_expression.get(eid, [])
        expressions.append(x)
    return {"schema": "vgine-runtime-instrument-expressions-v1", "expressions": expressions}


def export_editor(
    conn: sqlite3.Connection,
    foundation: dict[str, Any],
) -> dict[str, Any]:
    database_parameters = [
        bool_fields(x, "easy_visible", "advanced_visible", "allow_custom_text")
        for x in rows(
            conn,
            """SELECT id,section_key,label,canonical_slug,value_type,easy_visible,advanced_visible,
                      allow_custom_text,knowledge_entry_id,sort_order
               FROM parameter ORDER BY section_key,sort_order,id""",
        )
    ]
    database_options = [
        bool_fields(x, "easy_visible", "advanced_visible")
        for x in rows(
            conn,
            """SELECT id,parameter_id,label,canonical_slug,output_fragment,easy_visible,advanced_visible,
                      knowledge_entry_id,sort_order
               FROM parameter_option WHERE status IN ('reviewed','approved')
               ORDER BY parameter_id,sort_order,id""",
        )
    ]
    concepts: dict[str, list[dict[str, Any]]] = {}
    for x in rows(conn, "SELECT statement_id,entry_id,role,ordinal FROM statement_concept ORDER BY statement_id,ordinal,entry_id"):
        concepts.setdefault(x.pop("statement_id"), []).append(x)
    option_links: dict[str, list[dict[str, Any]]] = {}
    for x in rows(conn, "SELECT statement_id,option_id,ordinal FROM statement_option ORDER BY statement_id,ordinal,option_id"):
        option_links.setdefault(x.pop("statement_id"), []).append(x)
    database_statements = []
    for statement in rows(
        conn,
        """SELECT id,section_key,label,output_text,mode_scope,statement_kind,source_frequency
           FROM statement WHERE status IN ('reviewed','approved')
           ORDER BY section_key,label,id""",
    ):
        statement_id = statement["id"]
        statement["concepts"] = concepts.get(statement_id, [])
        statement["options"] = option_links.get(statement_id, [])
        database_statements.append(statement)
    database_exclude = rows(
        conn,
        """SELECT id,label,output_text,knowledge_entry_id FROM exclude_entry
           WHERE status IN ('reviewed','approved') ORDER BY label,id""",
    )

    parameters = merge_records(
        foundation["parameters"],
        database_parameters,
        sort_key=lambda row: (row["section_key"], int(row.get("sort_order", 0)), row["id"]),
    )
    options = merge_records(
        foundation["parameter_options"],
        database_options,
        sort_key=lambda row: (row["parameter_id"], int(row.get("sort_order", 0)), row["id"]),
    )
    statements = merge_records(
        foundation["statements"],
        database_statements,
        sort_key=lambda row: (
            row["section_key"],
            int(row.get("sort_order", 1_000_000)),
            row["label"].casefold(),
            row["id"],
        ),
    )
    exclude = merge_records(
        foundation["exclude"],
        database_exclude,
        sort_key=lambda row: (
            int(row.get("sort_order", 1_000_000)),
            row["label"].casefold(),
            row["id"],
        ),
    )

    parameter_ids = {row["id"] for row in parameters}
    dangling_options = [
        row["id"] for row in options if row["parameter_id"] not in parameter_ids
    ]
    if dangling_options:
        raise RuntimeError(
            "runtime editor contains options with missing parameters: "
            + ", ".join(dangling_options[:10])
        )

    return {
        "schema": "vgine-runtime-editor-v1",
        "foundation_schema": foundation["schema"],
        "foundation_version": foundation["version"],
        "parameters": parameters,
        "parameter_options": options,
        "statements": statements,
        "exclude": exclude,
    }


def export_knowledge(conn: sqlite3.Connection) -> dict[str, Any]:
    entries = rows(
        conn,
        """SELECT id,entry_type,canonical_label,canonical_slug,difficulty,replaces_entry_id
           FROM knowledge_entry WHERE status IN ('reviewed','approved')
           ORDER BY canonical_slug,id""",
    )
    ids = {x["id"] for x in entries}
    variants: dict[str, list[dict[str, Any]]] = {}
    for x in rows(
        conn,
        """SELECT entry_id,surface,surface_norm AS normalized,locale,match_kind,match_priority,is_primary
           FROM term_variant ORDER BY entry_id,locale,match_priority DESC,surface_norm""",
    ):
        eid = x.pop("entry_id")
        if eid in ids:
            x["is_primary"] = bool(x["is_primary"])
            variants.setdefault(eid, []).append(x)
    definitions: dict[str, list[dict[str, Any]]] = {}
    for x in rows(
        conn,
        """SELECT entry_id,locale,definition_kind AS kind,text,revision FROM definition
           WHERE status IN ('reviewed','approved') ORDER BY entry_id,locale,definition_kind,revision DESC""",
    ):
        eid = x.pop("entry_id")
        if eid in ids:
            definitions.setdefault(eid, []).append(x)
    context: dict[str, list[dict[str, Any]]] = {}
    for x in rows(
        conn,
        """SELECT entry_id,locale,context_type,context_key,text,revision FROM context_definition
           WHERE status IN ('reviewed','approved') ORDER BY entry_id,locale,context_type,context_key,revision DESC""",
    ):
        eid = x.pop("entry_id")
        if eid in ids:
            context.setdefault(eid, []).append(x)
    relations: dict[str, list[dict[str, Any]]] = {}
    for x in rows(
        conn,
        """SELECT source_entry_id,relation_type,target_entry_id,strength FROM knowledge_relation
           WHERE status IN ('reviewed','approved') ORDER BY source_entry_id,relation_type,target_entry_id""",
    ):
        source = x.pop("source_entry_id")
        if source in ids and x["target_entry_id"] in ids:
            relations.setdefault(source, []).append(x)
    for entry in entries:
        eid = entry["id"]
        entry["variants"] = variants.get(eid, [])
        entry["definitions"] = definitions.get(eid, [])
        entry["context_definitions"] = context.get(eid, [])
        entry["relations"] = relations.get(eid, [])
    return {"schema": "vgine-runtime-knowledge-v1", "entries": entries}


def export_search(conn: sqlite3.Connection) -> dict[str, Any]:
    docs: list[dict[str, Any]] = []
    major_labels = {x["id"]: x["label"] for x in rows(conn, "SELECT id,label FROM major_genre")}
    genre_data = export_genres(conn)["genres"]
    for g in genre_data:
        terms = [g["label"], *(a["surface"] for a in g["aliases"]), *(major_labels.get(x, "") for x in g["major_genre_ids"])]
        docs.append({"id": g["id"], "kind": "genre", "label": g["label"], "terms": sorted({t for t in terms if t}, key=str.casefold)})

    inst_labels = {x["id"]: x["label"] for x in rows(conn, "SELECT id,label FROM instrument WHERE status<>'deprecated'")}
    entry_labels = {x["id"]: x["canonical_label"] for x in rows(conn, "SELECT id,canonical_label FROM knowledge_entry WHERE status<>'deprecated'")}
    expr_data = export_instrument_expressions(conn)["expressions"]
    for e in expr_data:
        terms = [e["label"], *(inst_labels.get(x["instrument_id"], "") for x in e["instruments"]), *(entry_labels.get(x["entry_id"], "") for x in e["concepts"])]
        docs.append({"id": e["id"], "kind": "instrument_expression", "label": e["label"], "terms": sorted({t for t in terms if t}, key=str.casefold)})

    knowledge_data = export_knowledge(conn)["entries"]
    for e in knowledge_data:
        terms = [e["canonical_label"], *(v["surface"] for v in e["variants"])]
        text = [d["text"] for d in e["definitions"] if d["kind"] in ("one_liner", "plain")]
        docs.append({"id": e["id"], "kind": "knowledge", "label": e["canonical_label"], "terms": sorted({t for t in terms if t}, key=str.casefold), "definition": text[0] if text else None})

    docs.sort(key=lambda x: (x["kind"], x["label"].casefold(), x["id"]))
    return {"schema": "vgine-runtime-search-documents-v1", "documents": docs}


EXPORTERS: tuple[tuple[str, Callable[[sqlite3.Connection], dict[str, Any]]], ...] = (
    ("core.json", export_core),
    ("genres.json", export_genres),
    ("instruments.json", export_instruments),
    ("instrument-expressions.json", export_instrument_expressions),
    ("editor.json", export_editor),
    ("knowledge.json", export_knowledge),
    ("search.json", export_search),
)


def payload_counts(filename: str, payload: dict[str, Any]) -> dict[str, int]:
    keys = {
        "core.json": ("major_genres", "sections", "renderer_profiles"),
        "genres.json": ("genres",),
        "instruments.json": ("families", "instruments"),
        "instrument-expressions.json": ("expressions",),
        "editor.json": ("parameters", "parameter_options", "statements", "exclude"),
        "knowledge.json": ("entries",),
        "search.json": ("documents",),
    }[filename]
    return {key: len(payload.get(key, [])) for key in keys}


def validate_source_database(conn: sqlite3.Connection) -> dict[str, Any]:
    integrity = conn.execute("PRAGMA integrity_check").fetchone()[0]
    if integrity != "ok":
        raise RuntimeError(f"knowledge database integrity_check failed: {integrity}")
    source_count = conn.execute(
        "SELECT COUNT(*) FROM instrument_expression WHERE source_kind='factory' AND status<>'deprecated'"
    ).fetchone()[0]
    source_selectable = conn.execute(
        """SELECT COUNT(*) FROM instrument_expression
           WHERE source_kind='factory' AND status<>'deprecated' AND selectable=1"""
    ).fetchone()[0]
    if source_count != source_selectable:
        raise RuntimeError(f"source instrument-expression invariant failed: {source_selectable}/{source_count} selectable")
    profile = conn.execute(
        "SELECT max_characters,overflow_policy FROM renderer_profile WHERE id='suno-structured-v1'"
    ).fetchone()
    if profile is not None and (profile[0] != 1000 or profile[1] != "semantic-budget"):
        raise RuntimeError("suno-structured-v1 renderer budget contract does not match Database V1")
    return {"integrity_check": integrity, "source_instrument_expressions": source_count}


def validate_work_dir(
    work_dir: Path,
    expected_source_expressions: int,
    foundation: dict[str, Any],
) -> dict[str, Any]:
    payloads = {name: read_json(work_dir / name) for name in PAYLOAD_FILES}
    expressions = payloads["instrument-expressions.json"]["expressions"]
    ids = [x["id"] for x in expressions]
    if len(ids) != len(set(ids)):
        raise RuntimeError("duplicate instrument-expression IDs in runtime payload")
    factory = [x for x in expressions if x["source_kind"] == "factory"]
    if len(factory) != expected_source_expressions:
        raise RuntimeError(f"runtime source instrument-expression count mismatch: {len(factory)} != {expected_source_expressions}")
    if any(not x["selectable"] or not x["output_text"] for x in factory):
        raise RuntimeError("runtime source instrument-expression wording/selectable invariant failed")
    editor = payloads["editor.json"]
    for key in ("parameters", "parameter_options", "statements", "exclude"):
        expected_ids = {row["id"] for row in foundation[key]}
        actual_ids = {row["id"] for row in editor[key]}
        missing = sorted(expected_ids - actual_ids)
        if missing:
            raise RuntimeError(
                f"runtime editor dropped foundation {key}: {', '.join(missing[:10])}"
            )
    profiles = payloads["core.json"]["renderer_profiles"]
    suno = next((x for x in profiles if x["id"] == "suno-structured-v1"), None)
    if suno and suno["max_characters"] != 1000:
        raise RuntimeError("runtime Suno profile does not preserve 1000-character budget")
    return {"source_instrument_expressions": len(factory), "search_documents": len(payloads["search.json"]["documents"])}


def load_state(work_dir: Path) -> dict[str, Any] | None:
    path = work_dir / "state.json"
    return read_json(path) if path.is_file() else None


def save_state(work_dir: Path, state: dict[str, Any]) -> None:
    write_json_atomic(work_dir / "state.json", state)


def existing_up_to_date(
    out_dir: Path,
    db_sha: str,
    foundation_sha: str,
) -> bool:
    manifest = out_dir / "manifest.json"
    if not manifest.is_file():
        return False
    try:
        data = read_json(manifest)
    except Exception:
        return False
    return (
        data.get("schema") == CONTRACT
        and data.get("knowledge_db_sha256") == db_sha
        and data.get("editor_foundation_sha256") == foundation_sha
    )


def plan(
    conn: sqlite3.Connection,
    db_sha: str,
    foundation: dict[str, Any],
    foundation_sha: str,
) -> dict[str, Any]:
    return {
        "schema": CONTRACT,
        "knowledge_db_sha256": db_sha,
        "editor_foundation_sha256": foundation_sha,
        "editor_foundation_counts": {
            "parameters": len(foundation["parameters"]),
            "parameter_options": len(foundation["parameter_options"]),
            "statements": len(foundation["statements"]),
            "exclude": len(foundation["exclude"]),
        },
        "counts": {
            "major_genres": conn.execute("SELECT COUNT(*) FROM major_genre").fetchone()[0],
            "genres": conn.execute("SELECT COUNT(*) FROM genre WHERE status<>'deprecated'").fetchone()[0],
            "instrument_expressions": conn.execute("SELECT COUNT(*) FROM instrument_expression WHERE status<>'deprecated' AND selectable=1").fetchone()[0],
            "knowledge_entries": conn.execute("SELECT COUNT(*) FROM knowledge_entry WHERE status IN ('reviewed','approved')").fetchone()[0],
        },
        "files": list(PAYLOAD_FILES) + ["manifest.json"],
    }


def promote(work_dir: Path, out_dir: Path) -> None:
    previous = out_dir.with_name(out_dir.name + ".previous")
    if previous.exists():
        shutil.rmtree(previous)
    if out_dir.exists():
        os.replace(out_dir, previous)
    try:
        os.replace(work_dir, out_dir)
    except Exception:
        if previous.exists() and not out_dir.exists():
            os.replace(previous, out_dir)
        raise


def compile_runtime(
    knowledge_db: Path,
    out_dir: Path,
    editor_foundation: Path,
    reset_incomplete: bool = False,
) -> dict[str, Any]:
    db_sha = sha256_file(knowledge_db)
    foundation = load_editor_foundation(editor_foundation)
    foundation_sha = sha256_file(editor_foundation)
    work_dir = out_dir.with_name(out_dir.name + ".work")
    if reset_incomplete and work_dir.exists():
        shutil.rmtree(work_dir)
    if existing_up_to_date(out_dir, db_sha, foundation_sha) and not work_dir.exists():
        return {
            "status": "up-to-date",
            "out_dir": str(out_dir),
            "knowledge_db_sha256": db_sha,
            "editor_foundation_sha256": foundation_sha,
        }

    work_dir.mkdir(parents=True, exist_ok=True)
    state = load_state(work_dir)
    if state is None:
        state = {
            "schema": CONTRACT,
            "schema_version": SCHEMA_VERSION,
            "knowledge_db_sha256": db_sha,
            "editor_foundation_sha256": foundation_sha,
            "completed": {},
        }
        save_state(work_dir, state)
    elif (
        state.get("schema") != CONTRACT
        or state.get("knowledge_db_sha256") != db_sha
        or state.get("editor_foundation_sha256") != foundation_sha
    ):
        raise RuntimeError("stale runtime export work state; rerun with --reset-incomplete")

    conn = connect_ro(knowledge_db)
    try:
        source_validation = validate_source_database(conn)
        for filename, exporter_fn in EXPORTERS:
            existing_hash = state["completed"].get(filename)
            target = work_dir / filename
            if existing_hash and target.is_file() and sha256_file(target) == existing_hash:
                continue
            payload = (
                export_editor(conn, foundation)
                if filename == "editor.json"
                else exporter_fn(conn)
            )
            digest = write_json_atomic(target, payload)
            state["completed"][filename] = digest
            save_state(work_dir, state)

        validation = validate_work_dir(
            work_dir,
            source_validation["source_instrument_expressions"],
            foundation,
        )
        files = {}
        build_material = []
        for filename in PAYLOAD_FILES:
            payload = read_json(work_dir / filename)
            digest = sha256_file(work_dir / filename)
            files[filename] = {"sha256": digest, "bytes": (work_dir / filename).stat().st_size, "counts": payload_counts(filename, payload)}
            build_material.append(f"{filename}:{digest}")
        runtime_build_id = hashlib.sha256((CONTRACT + "\n" + "\n".join(build_material)).encode("utf-8")).hexdigest()
        manifest = {
            "schema": CONTRACT,
            "schema_version": SCHEMA_VERSION,
            "runtime_build_id": runtime_build_id,
            "knowledge_db_sha256": db_sha,
            "editor_foundation_sha256": foundation_sha,
            "knowledge_build_meta": build_meta(conn),
            "files": files,
        }
        write_json_atomic(work_dir / "manifest.json", manifest)
        state_path = work_dir / "state.json"
        if state_path.exists():
            state_path.unlink()
        promote(work_dir, out_dir)
        return {"status": "ok", "out_dir": str(out_dir), "runtime_build_id": runtime_build_id, "validation": validation, "files": files}
    finally:
        conn.close()


def status(
    knowledge_db: Path,
    out_dir: Path,
    editor_foundation: Path,
) -> dict[str, Any]:
    db_sha = sha256_file(knowledge_db) if knowledge_db.is_file() else None
    foundation_sha = (
        sha256_file(editor_foundation) if editor_foundation.is_file() else None
    )
    work_dir = out_dir.with_name(out_dir.name + ".work")
    final_manifest = read_json(out_dir / "manifest.json") if (out_dir / "manifest.json").is_file() else None
    work_state = load_state(work_dir) if work_dir.exists() else None
    return {
        "schema": CONTRACT,
        "knowledge_db_sha256": db_sha,
        "editor_foundation_sha256": foundation_sha,
        "final": final_manifest,
        "work": work_state,
        "up_to_date": bool(
            final_manifest
            and db_sha
            and foundation_sha
            and final_manifest.get("knowledge_db_sha256") == db_sha
            and final_manifest.get("editor_foundation_sha256") == foundation_sha
        ),
    }


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--knowledge", type=Path, required=True, help="Path to compiled knowledge.sqlite")
    ap.add_argument("--out-dir", type=Path, required=True, help="Promoted runtime-v1 directory")
    ap.add_argument(
        "--editor-foundation",
        type=Path,
        default=DEFAULT_EDITOR_FOUNDATION,
        help="Tracked Product Editor Foundation v1 JSON",
    )
    mode = ap.add_mutually_exclusive_group()
    mode.add_argument("--plan", action="store_true", help="Read-only preflight; do not write runtime artifacts")
    mode.add_argument("--status", action="store_true", help="Inspect final/incomplete runtime export state")
    ap.add_argument("--reset-incomplete", action="store_true", help="Delete only incomplete runtime work before export")
    ap.add_argument("--report", type=Path, help="Override machine-readable export report path; exports default to the sibling reports/runtime-export-v1.json")
    args = ap.parse_args()

    try:
        if args.status:
            result = status(args.knowledge, args.out_dir, args.editor_foundation)
        else:
            db_sha = sha256_file(args.knowledge)
            if args.plan:
                conn = connect_ro(args.knowledge)
                try:
                    validate_source_database(conn)
                    foundation = load_editor_foundation(args.editor_foundation)
                    result = plan(
                        conn,
                        db_sha,
                        foundation,
                        sha256_file(args.editor_foundation),
                    )
                finally:
                    conn.close()
            else:
                result = compile_runtime(
                    args.knowledge,
                    args.out_dir,
                    args.editor_foundation,
                    args.reset_incomplete,
                )
        report_path = args.report
        if report_path is None and not args.plan and not args.status:
            report_path = args.out_dir.parent / "reports" / "runtime-export-v1.json"
        if report_path:
            report_path.parent.mkdir(parents=True, exist_ok=True)
            write_json_atomic(report_path, result)
        print(json.dumps(result, ensure_ascii=False, sort_keys=True, indent=2))
        return 0
    except KeyboardInterrupt:
        print("runtime export interrupted; completed work remains resumable", file=sys.stderr)
        return 130
    except Exception as exc:
        print(f"runtime export failed: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
