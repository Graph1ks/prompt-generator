#!/usr/bin/env python3
"""Apply reviewed Prompt V'gine instrument/lexicon curation bundles safely."""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
import sqlite3
import subprocess
import sys
from pathlib import Path

from knowledge_mining_session import (
    backup_sqlite,
    curation_fingerprint,
    integrity,
    open_ro,
    sha256_file,
    source_meta,
)

BUNDLE_SCHEMAS = {
    "promptvgine-knowledge-curation-decisions-v1",
    "promptvgine-knowledge-curation-decisions-v2",
}
REPORT_FILES = {
    "instrument": "instrument-candidates-v1.json",
    "lexicon": "lexicon-candidates-v1.json",
}


def utc_now() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat().replace("+00:00", "Z")


def norm(value: str) -> str:
    return " ".join((value or "").casefold().split())


def stable_row_id(prefix: str, *parts: str) -> str:
    raw = "|".join(parts)
    return f"{prefix}:" + hashlib.sha1(raw.encode("utf-8")).hexdigest()[:20]


def read_json(path: Path) -> dict:
    if not path.is_file():
        raise SystemExit(f"file not found: {path}")
    try:
        return json.loads(path.read_text(encoding="utf-8-sig"))
    except json.JSONDecodeError as exc:
        raise SystemExit(f"invalid JSON: {path}: {exc}") from exc


def open_rw(path: Path) -> sqlite3.Connection:
    if not path.is_file():
        raise SystemExit(f"database not found: {path}")
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


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



def ensure_curation_schema(curation_path: Path) -> None:
    """Apply additive durable-schema migrations after backup, before mutation."""
    schema_path = Path(__file__).resolve().parents[2] / "schema" / "curation-v1.sql"
    conn = open_rw(curation_path)
    try:
        conn.executescript(schema_path.read_text(encoding="utf-8"))
        conn.commit()
    finally:
        conn.close()
    integrity(curation_path)

def expected_source_hashes(corpus_path: Path) -> dict:
    with open_ro(corpus_path) as corpus:
        meta = source_meta(corpus)
    return {
        "prompt_vault_sha256": meta["prompt_vault"]["sha256"],
        "genre_map_sha256": meta["genre_map"]["sha256"],
    }


def load_review_state(out_dir: Path, report_hash: dict) -> dict:
    reports_dir = out_dir / "reports" / "knowledge"
    if not report_hash:
        raise SystemExit("decision bundle must bind at least one reviewed report")
    unsupported = sorted(set(report_hash) - set(REPORT_FILES))
    if unsupported:
        raise SystemExit(f"unsupported reviewed report kinds: {unsupported}")

    states = {}
    review_ids = set()
    curation_fingerprints = set()
    for kind, expected_sha in report_hash.items():
        path = reports_dir / REPORT_FILES[kind]
        payload = read_json(path)
        actual_sha = sha256_file(path)
        if expected_sha != actual_sha:
            raise SystemExit(f"{kind} review file does not match the reviewed decision bundle")
        review_ids.add(payload.get("review_id"))
        if payload.get("curation_fingerprint"):
            curation_fingerprints.add(payload["curation_fingerprint"])
        states[kind] = {
            "path": path,
            "payload": payload,
            "sha256": actual_sha,
        }

    if len(review_ids) != 1:
        raise SystemExit("review files belong to different review snapshots")
    if len(curation_fingerprints) > 1:
        raise SystemExit("review files were prepared from different curation states")
    return {
        "review_id": next(iter(review_ids)),
        "reports": states,
        "curation_fingerprint": next(iter(curation_fingerprints), None),
    }


def all_entries(bundle: dict) -> list[dict]:
    return [item["entry"] for item in bundle.get("instruments", [])] + list(
        bundle.get("concepts", [])
    )


def _existing_ids(conn: sqlite3.Connection, table: str, column: str, where: str = "1=1") -> set[str]:
    return {
        row[0]
        for row in conn.execute(f"SELECT {column} FROM {table} WHERE {where}")
    }


def validate_bundle(bundle: dict, out_dir: Path, corpus_path: Path, curation_path: Path) -> dict:
    schema = bundle.get("schema")
    if schema not in BUNDLE_SCHEMAS:
        raise SystemExit(f"unsupported bundle schema: {schema!r}")

    report_hash = bundle.get("report_sha256") or {}
    if schema == "promptvgine-knowledge-curation-decisions-v1" and set(report_hash) != {"instrument", "lexicon"}:
        raise SystemExit("v1 knowledge bundles must bind both instrument and lexicon reports")
    local_review = load_review_state(out_dir, report_hash)
    if bundle.get("review_id") != local_review["review_id"]:
        raise SystemExit(
            "decision bundle belongs to another knowledge-mining review; prepare/review a fresh bundle"
        )

    expected_sources = expected_source_hashes(corpus_path)
    if bundle.get("source") != expected_sources:
        raise SystemExit("decision bundle source fingerprints do not match the promoted corpus")

    with open_ro(curation_path) as curation:
        current_curation_sha = curation_fingerprint(curation)
        existing_family_ids = _existing_ids(
            curation, "instrument_family_patch", "id", "status<>'deprecated'"
        )
        existing_instrument_ids = _existing_ids(
            curation, "instrument_patch", "id", "status<>'deprecated'"
        )
        existing_entry_ids = _existing_ids(
            curation, "entry_patch", "entry_id", "status<>'deprecated'"
        )
        existing_parameter_ids = _existing_ids(
            curation, "parameter_patch", "id", "status<>'deprecated'"
        )

    report_curation_sha = local_review.get("curation_fingerprint")
    bundle_curation_sha = bundle.get("curation_fingerprint")
    if report_curation_sha and report_curation_sha != current_curation_sha:
        raise SystemExit(
            "curation changed since the knowledge-mining report was prepared; prepare a fresh review"
        )
    if bundle_curation_sha and bundle_curation_sha != current_curation_sha:
        raise SystemExit(
            "decision bundle is stale because durable curation changed after review"
        )

    family_ids = set(existing_family_ids)
    bundle_family_ids = set()
    for family in bundle.get("instrument_families", []):
        fid = family.get("id")
        if not fid or fid in bundle_family_ids:
            raise SystemExit(f"missing/duplicate instrument family id: {fid!r}")
        bundle_family_ids.add(fid)
        family_ids.add(fid)

    entries = all_entries(bundle)
    entry_ids = set()
    slugs = set()
    for entry in entries:
        eid = entry.get("entry_id")
        eslug = entry.get("canonical_slug")
        if not eid or eid in entry_ids:
            raise SystemExit(f"missing/duplicate knowledge entry id: {eid!r}")
        if not eslug or eslug in slugs:
            raise SystemExit(f"missing/duplicate canonical slug in bundle: {eslug!r}")
        entry_ids.add(eid)
        slugs.add(eslug)
        variants = entry.get("variants") or []
        if not variants:
            raise SystemExit(f"entry has no term variants: {eid}")
        surfaces = set()
        for variant in variants:
            surface_norm = norm(variant.get("surface") or "")
            if not surface_norm or surface_norm in surfaces:
                raise SystemExit(f"missing/duplicate term variant for {eid}: {surface_norm!r}")
            surfaces.add(surface_norm)
        definitions = entry.get("definitions") or []
        kinds = set()
        for definition in definitions:
            key = definition.get("kind")
            if not key or key in kinds:
                raise SystemExit(f"missing/duplicate definition kind for {eid}: {key!r}")
            kinds.add(key)

    known_entry_ids = existing_entry_ids | entry_ids
    instrument_ids = set()
    alias_owner: dict[str, str] = {}
    for instrument in bundle.get("instruments", []):
        iid = instrument.get("id")
        if not iid or iid in instrument_ids:
            raise SystemExit(f"missing/duplicate instrument id: {iid!r}")
        instrument_ids.add(iid)
        if instrument.get("family_id") not in family_ids:
            raise SystemExit(
                f"instrument {iid} references missing family {instrument.get('family_id')!r}"
            )
        if instrument["entry"].get("entry_id") not in entry_ids:
            raise SystemExit(f"instrument {iid} references missing bundle knowledge entry")
        for alias in instrument.get("aliases", []):
            alias_norm = norm(alias.get("surface") or "")
            if not alias_norm:
                raise SystemExit(f"empty instrument alias for {iid}")
            prior = alias_owner.get(alias_norm)
            if prior and prior != iid:
                raise SystemExit(
                    f"instrument alias {alias_norm!r} is assigned to both {prior} and {iid}"
                )
            alias_owner[alias_norm] = iid

    known_instrument_ids = existing_instrument_ids | instrument_ids
    for alias in bundle.get("instrument_aliases", []):
        iid = alias.get("instrument_id")
        surface_norm = norm(alias.get("surface") or "")
        if iid not in known_instrument_ids:
            raise SystemExit(f"instrument alias references missing instrument: {iid!r}")
        if not surface_norm:
            raise SystemExit(f"empty instrument alias for {iid}")
        prior = alias_owner.get(surface_norm)
        if prior and prior != iid:
            raise SystemExit(
                f"instrument alias {surface_norm!r} is assigned to both {prior} and {iid}"
            )
        alias_owner[surface_norm] = iid

    parameter_ids = set()
    for parameter in bundle.get("parameters", []):
        pid = parameter.get("id")
        if not pid or pid in parameter_ids:
            raise SystemExit(f"missing/duplicate parameter id: {pid!r}")
        parameter_ids.add(pid)
        eid = parameter.get("knowledge_entry_id")
        if eid and eid not in known_entry_ids:
            raise SystemExit(f"parameter {pid} references missing knowledge entry {eid!r}")

    known_parameter_ids = existing_parameter_ids | parameter_ids
    option_ids = set()
    for option in bundle.get("parameter_options", []):
        oid = option.get("id")
        pid = option.get("parameter_id")
        if not oid or oid in option_ids:
            raise SystemExit(f"missing/duplicate parameter option id: {oid!r}")
        option_ids.add(oid)
        if pid not in known_parameter_ids:
            raise SystemExit(f"parameter option {oid} references missing parameter {pid!r}")
        eid = option.get("knowledge_entry_id")
        if eid and eid not in known_entry_ids:
            raise SystemExit(f"parameter option {oid} references missing knowledge entry {eid!r}")

    trait_keys = set()
    for trait in bundle.get("instrument_traits", []):
        iid = trait.get("instrument_id")
        eid = trait.get("entry_id")
        trait_type = trait.get("trait_type")
        key = (iid, eid, trait_type)
        if key in trait_keys:
            raise SystemExit(f"duplicate instrument trait: {key!r}")
        trait_keys.add(key)
        if iid not in known_instrument_ids:
            raise SystemExit(f"instrument trait references missing instrument {iid!r}")
        if eid not in known_entry_ids:
            raise SystemExit(f"instrument trait references missing knowledge entry {eid!r}")
        if not trait_type:
            raise SystemExit(f"instrument trait has no trait_type: {key!r}")

    conn = open_rw(curation_path)
    try:
        for alias_norm, iid in alias_owner.items():
            row = conn.execute(
                """SELECT instrument_id FROM instrument_alias_patch
                   WHERE alias_norm=? AND status<>'deprecated'
                   ORDER BY revision DESC LIMIT 1""",
                (alias_norm,),
            ).fetchone()
            if row and row[0] != iid:
                raise SystemExit(
                    f"instrument alias {alias_norm!r} already belongs to another curated instrument"
                )
    finally:
        conn.close()

    return {
        "family_count": len(bundle.get("instrument_families", [])),
        "instrument_count": len(bundle.get("instruments", [])),
        "instrument_alias_count": len(bundle.get("instrument_aliases", [])),
        "instrument_trait_count": len(bundle.get("instrument_traits", [])),
        "concept_count": len(bundle.get("concepts", [])),
        "parameter_count": len(bundle.get("parameters", [])),
        "parameter_option_count": len(bundle.get("parameter_options", [])),
        "entry_count": len(entry_ids),
        "reviewed_reports": sorted(report_hash),
        "current_curation_fingerprint": current_curation_sha,
    }

def provenance_note(bundle: dict, evidence) -> str:
    payload = {
        "bundle_id": bundle["bundle_id"],
        "review_id": bundle["review_id"],
    }
    if evidence:
        payload["evidence"] = evidence
    return json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def upsert_entry(conn: sqlite3.Connection, bundle: dict, entry: dict) -> None:
    timestamp = utc_now()
    notes = provenance_note(bundle, entry.get("evidence"))
    conn.execute(
        """INSERT INTO entry_patch(
             entry_id,entry_type,canonical_label,canonical_slug,status,difficulty,
             revision,notes,updated_at
           ) VALUES (?,?,?,?,?,?,1,?,?)
           ON CONFLICT(entry_id) DO UPDATE SET
             entry_type=excluded.entry_type,
             canonical_label=excluded.canonical_label,
             canonical_slug=excluded.canonical_slug,
             status=excluded.status,
             difficulty=excluded.difficulty,
             notes=excluded.notes,
             updated_at=excluded.updated_at""",
        (
            entry["entry_id"],
            entry["entry_type"],
            entry["canonical_label"],
            entry["canonical_slug"],
            entry["status"],
            entry["difficulty"],
            notes,
            timestamp,
        ),
    )

    for variant in entry.get("variants", []):
        surface = variant["surface"]
        surface_norm = norm(surface)
        row_id = stable_row_id("term-variant", entry["entry_id"], "en", surface_norm)
        conn.execute(
            """INSERT INTO term_variant_patch(
                 id,entry_id,surface,surface_norm,locale,match_kind,match_priority,
                 is_primary,status,revision,notes,updated_at
               ) VALUES (?,?,?,?, 'en',?,?,?,?,1,?,?)
               ON CONFLICT(entry_id,locale,surface_norm) DO UPDATE SET
                 surface=excluded.surface,
                 match_kind=excluded.match_kind,
                 match_priority=excluded.match_priority,
                 is_primary=excluded.is_primary,
                 status=excluded.status,
                 notes=excluded.notes,
                 updated_at=excluded.updated_at""",
            (
                row_id,
                entry["entry_id"],
                surface,
                surface_norm,
                variant.get("match_kind", "phrase" if " " in surface_norm else "word"),
                int(variant.get("match_priority", 100)),
                1 if variant.get("is_primary") else 0,
                entry["status"],
                notes,
                timestamp,
            ),
        )

    for definition in entry.get("definitions", []):
        kind = definition["kind"]
        row_id = stable_row_id("definition", entry["entry_id"], "en", kind, "1")
        conn.execute(
            """INSERT INTO definition_patch(
                 id,entry_id,locale,definition_kind,text,status,revision,notes,updated_at
               ) VALUES (?,?,'en',?,?,?,1,?,?)
               ON CONFLICT(entry_id,locale,definition_kind,revision) DO UPDATE SET
                 text=excluded.text,
                 status=excluded.status,
                 notes=excluded.notes,
                 updated_at=excluded.updated_at""",
            (
                row_id,
                entry["entry_id"],
                kind,
                definition["text"],
                definition["status"],
                notes,
                timestamp,
            ),
        )

    for context in entry.get("contexts", []):
        ctype = context["context_type"]
        ckey = context["context_key"]
        row_id = stable_row_id(
            "context-definition", entry["entry_id"], "en", ctype, ckey, "1"
        )
        conn.execute(
            """INSERT INTO context_definition_patch(
                 id,entry_id,locale,context_type,context_key,text,status,revision,notes,updated_at
               ) VALUES (?,?,'en',?,?,?,?,1,?,?)
               ON CONFLICT(entry_id,locale,context_type,context_key,revision) DO UPDATE SET
                 text=excluded.text,
                 status=excluded.status,
                 notes=excluded.notes,
                 updated_at=excluded.updated_at""",
            (
                row_id,
                entry["entry_id"],
                ctype,
                ckey,
                context["text"],
                context["status"],
                notes,
                timestamp,
            ),
        )


def apply_bundle(curation_path: Path, bundle: dict) -> dict:
    conn = open_rw(curation_path)
    timestamp = utc_now()
    try:
        conn.execute("BEGIN IMMEDIATE")

        for family in bundle.get("instrument_families", []):
            conn.execute(
                """INSERT INTO instrument_family_patch(
                     id,label,knowledge_entry_id,status,revision,updated_at
                   ) VALUES (?,?,NULL,?,1,?)
                   ON CONFLICT(id) DO UPDATE SET
                     label=excluded.label,
                     status=excluded.status,
                     updated_at=excluded.updated_at""",
                (family["id"], family["label"], family["status"], timestamp),
            )

        for instrument in bundle.get("instruments", []):
            upsert_entry(conn, bundle, instrument["entry"])
            notes = provenance_note(bundle, instrument.get("evidence"))
            conn.execute(
                """INSERT INTO instrument_patch(
                     id,label,label_norm,family_id,knowledge_entry_id,status,
                     revision,notes,updated_at
                   ) VALUES (?,?,?,?,?,?,1,?,?)
                   ON CONFLICT(id) DO UPDATE SET
                     label=excluded.label,
                     label_norm=excluded.label_norm,
                     family_id=excluded.family_id,
                     knowledge_entry_id=excluded.knowledge_entry_id,
                     status=excluded.status,
                     notes=excluded.notes,
                     updated_at=excluded.updated_at""",
                (
                    instrument["id"],
                    instrument["label"],
                    instrument["label_norm"],
                    instrument["family_id"],
                    instrument["entry"]["entry_id"],
                    instrument["status"],
                    notes,
                    timestamp,
                ),
            )
            for alias in instrument.get("aliases", []):
                surface = alias["surface"]
                alias_norm = norm(surface)
                row_id = stable_row_id("instrument-alias", instrument["id"], alias_norm)
                conn.execute(
                    """INSERT INTO instrument_alias_patch(
                         id,instrument_id,alias_surface,alias_norm,status,revision,updated_at
                       ) VALUES (?,?,?,?,?,1,?)
                       ON CONFLICT(instrument_id,alias_norm,revision) DO UPDATE SET
                         alias_surface=excluded.alias_surface,
                         status=excluded.status,
                         updated_at=excluded.updated_at""",
                    (
                        row_id,
                        instrument["id"],
                        surface,
                        alias_norm,
                        instrument["status"],
                        timestamp,
                    ),
                )

        for alias in bundle.get("instrument_aliases", []):
            surface = alias["surface"]
            alias_norm = norm(surface)
            iid = alias["instrument_id"]
            row_id = stable_row_id("instrument-alias", iid, alias_norm)
            conn.execute(
                """INSERT INTO instrument_alias_patch(
                     id,instrument_id,alias_surface,alias_norm,status,revision,updated_at
                   ) VALUES (?,?,?,?,?,1,?)
                   ON CONFLICT(instrument_id,alias_norm,revision) DO UPDATE SET
                     alias_surface=excluded.alias_surface,
                     status=excluded.status,
                     updated_at=excluded.updated_at""",
                (
                    row_id,
                    iid,
                    surface,
                    alias.get("status", "approved"),
                    timestamp,
                ),
            )

        for entry in bundle.get("concepts", []):
            upsert_entry(conn, bundle, entry)

        for trait in bundle.get("instrument_traits", []):
            row_id = stable_row_id(
                "instrument-trait",
                trait["instrument_id"],
                trait["entry_id"],
                trait["trait_type"],
            )
            conn.execute(
                """INSERT INTO instrument_trait_patch(
                     id,instrument_id,entry_id,trait_type,confidence,status,
                     revision,notes,updated_at
                   ) VALUES (?,?,?,?,?,?,1,?,?)
                   ON CONFLICT(instrument_id,entry_id,trait_type,revision) DO UPDATE SET
                     confidence=excluded.confidence,
                     status=excluded.status,
                     notes=excluded.notes,
                     updated_at=excluded.updated_at""",
                (
                    row_id,
                    trait["instrument_id"],
                    trait["entry_id"],
                    trait["trait_type"],
                    trait.get("confidence"),
                    trait.get("status", "approved"),
                    provenance_note(bundle, trait.get("evidence")),
                    timestamp,
                ),
            )

        for parameter in bundle.get("parameters", []):
            conn.execute(
                """INSERT INTO parameter_patch(
                     id,section_key,label,canonical_slug,value_type,easy_visible,
                     advanced_visible,allow_custom_text,knowledge_entry_id,sort_order,
                     status,revision,updated_at
                   ) VALUES (?,?,?,?,?,?,?,?,?,?,?,1,?)
                   ON CONFLICT(id) DO UPDATE SET
                     section_key=excluded.section_key,
                     label=excluded.label,
                     canonical_slug=excluded.canonical_slug,
                     value_type=excluded.value_type,
                     easy_visible=excluded.easy_visible,
                     advanced_visible=excluded.advanced_visible,
                     allow_custom_text=excluded.allow_custom_text,
                     knowledge_entry_id=excluded.knowledge_entry_id,
                     sort_order=excluded.sort_order,
                     status=excluded.status,
                     updated_at=excluded.updated_at""",
                (
                    parameter["id"],
                    parameter["section_key"],
                    parameter["label"],
                    parameter["canonical_slug"],
                    parameter["value_type"],
                    int(bool(parameter.get("easy_visible", False))),
                    int(bool(parameter.get("advanced_visible", True))),
                    int(bool(parameter.get("allow_custom_text", False))),
                    parameter.get("knowledge_entry_id"),
                    int(parameter.get("sort_order", 0)),
                    parameter.get("status", "approved"),
                    timestamp,
                ),
            )

        for option in bundle.get("parameter_options", []):
            conn.execute(
                """INSERT INTO parameter_option_patch(
                     id,parameter_id,label,canonical_slug,output_fragment,
                     knowledge_entry_id,easy_visible,advanced_visible,sort_order,
                     status,revision,updated_at
                   ) VALUES (?,?,?,?,?,?,?,?,?,?,1,?)
                   ON CONFLICT(id) DO UPDATE SET
                     parameter_id=excluded.parameter_id,
                     label=excluded.label,
                     canonical_slug=excluded.canonical_slug,
                     output_fragment=excluded.output_fragment,
                     knowledge_entry_id=excluded.knowledge_entry_id,
                     easy_visible=excluded.easy_visible,
                     advanced_visible=excluded.advanced_visible,
                     sort_order=excluded.sort_order,
                     status=excluded.status,
                     updated_at=excluded.updated_at""",
                (
                    option["id"],
                    option["parameter_id"],
                    option["label"],
                    option["canonical_slug"],
                    option["output_fragment"],
                    option.get("knowledge_entry_id"),
                    int(bool(option.get("easy_visible", False))),
                    int(bool(option.get("advanced_visible", True))),
                    int(option.get("sort_order", 0)),
                    option.get("status", "approved"),
                    timestamp,
                ),
            )

        conn.execute(
            """INSERT INTO curation_meta(key,value) VALUES ('last_knowledge_bundle_id',?)
               ON CONFLICT(key) DO UPDATE SET value=excluded.value""",
            (bundle["bundle_id"],),
        )
        conn.execute(
            """INSERT INTO curation_meta(key,value) VALUES ('last_knowledge_review_id',?)
               ON CONFLICT(key) DO UPDATE SET value=excluded.value""",
            (bundle["review_id"],),
        )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
    integrity(curation_path)

    return {
        "instrument_families": len(bundle.get("instrument_families", [])),
        "instruments": len(bundle.get("instruments", [])),
        "instrument_aliases": len(bundle.get("instrument_aliases", [])),
        "instrument_traits": len(bundle.get("instrument_traits", [])),
        "concepts": len(bundle.get("concepts", [])),
        "parameters": len(bundle.get("parameters", [])),
        "parameter_options": len(bundle.get("parameter_options", [])),
        "knowledge_entries": len(all_entries(bundle)),
    }

def run_builder(args, reports_dir: Path, prefix: str) -> dict:
    builder = Path(__file__).resolve().parent / "build_local_data.py"
    validator = Path(__file__).resolve().parent / "validate_local_data.py"
    build = subprocess.run(
        [
            sys.executable,
            str(builder),
            "--vault",
            str(args.vault.resolve()),
            "--genre-map",
            str(args.genre_map.resolve()),
            "--out-dir",
            str(args.out_dir.resolve()),
        ],
        text=True,
        stdout=subprocess.PIPE,
    )
    build_path = reports_dir / f"{prefix}-build-output.json.txt"
    build_path.write_text(build.stdout or "", encoding="utf-8")
    if build.returncode != 0:
        raise RuntimeError(f"knowledge recompile failed with exit code {build.returncode}")

    validate = subprocess.run(
        [sys.executable, str(validator), "--dir", str(args.out_dir.resolve())],
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    validate_path = reports_dir / f"{prefix}-validation.txt"
    validate_path.write_text(validate.stdout or "", encoding="utf-8")
    if validate.returncode != 0:
        raise RuntimeError(f"post-apply validation failed with exit code {validate.returncode}")
    return {
        "build_returncode": build.returncode,
        "validation_returncode": validate.returncode,
        "build_output_file": str(build_path),
        "validation_output_file": str(validate_path),
    }


def refresh_reports(out_dir: Path, reports_dir: Path) -> dict:
    miner = Path(__file__).resolve().parent / "knowledge_mining_session.py"
    result = subprocess.run(
        [
            sys.executable,
            str(miner),
            "prepare",
            "--out-dir",
            str(out_dir.resolve()),
        ],
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
    )
    path = reports_dir / "last-refresh.txt"
    path.write_text(result.stdout or "", encoding="utf-8")
    if result.returncode != 0:
        raise RuntimeError(f"post-apply knowledge report refresh failed: {result.returncode}")
    summary_path = out_dir / "reports" / "knowledge" / "knowledge-mining-summary-v1.json"
    summary = read_json(summary_path)
    return {
        "returncode": result.returncode,
        "output_file": str(path),
        "review_id": summary.get("review_id"),
        "counts": summary.get("counts"),
    }


def apply_command(args) -> int:
    out_dir = args.out_dir.resolve()
    corpus_path = out_dir / "corpus.sqlite"
    curation_path = out_dir / "curation.sqlite"
    reports_dir = out_dir / "reports" / "knowledge"
    reports_dir.mkdir(parents=True, exist_ok=True)

    integrity(corpus_path)
    integrity(curation_path)
    bundle = read_json(args.bundle.resolve())
    validation = validate_bundle(bundle, out_dir, corpus_path, curation_path)
    backup = backup_sqlite(curation_path, out_dir.parent / "backups")
    ensure_curation_schema(curation_path)

    receipt = {
        "schema": "promptvgine-knowledge-curation-apply-receipt-v1",
        "started_at": utc_now(),
        "bundle_id": bundle.get("bundle_id"),
        "review_id": bundle.get("review_id"),
        "bundle_file": str(args.bundle.resolve()),
        "bundle_sha256": sha256_file(args.bundle.resolve()),
        "backup": str(backup),
        "schema_migration": "ok",
        "preflight": validation,
        "status": "running",
    }
    receipt_path = reports_dir / "last-knowledge-curation-apply-receipt.json"

    try:
        receipt["apply"] = apply_bundle(curation_path, bundle)
        receipt["compile"] = run_builder(args, reports_dir, "last-knowledge-curation")
        receipt["refresh"] = refresh_reports(out_dir, reports_dir)
        receipt["status"] = "ok"
        receipt["completed_at"] = utc_now()
    except Exception as exc:
        receipt["error"] = str(exc)
        recovery = {"curation_restore": "pending"}
        try:
            restore_backup(backup, curation_path)
            recovery["curation_restore"] = "ok"
            try:
                recovery["compile"] = run_builder(
                    args, reports_dir, "last-knowledge-curation-recovery"
                )
            except Exception as rebuild_exc:
                recovery["compile_error"] = str(rebuild_exc)
        except Exception as restore_exc:
            recovery["curation_restore"] = "failed"
            recovery["restore_error"] = str(restore_exc)
        receipt["recovery"] = recovery
        receipt["status"] = "rolled_back" if recovery["curation_restore"] == "ok" else "recovery_failed"
        receipt["completed_at"] = utc_now()
        receipt_path.write_text(
            json.dumps(receipt, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
        )
        print(
            f"[knowledge-curation] FAILED safely · status {receipt['status']} · receipt: {receipt_path}"
        )
        return 1

    receipt_path.write_text(
        json.dumps(receipt, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    print(
        "[knowledge-curation] applied"
        f" · instruments {receipt['apply']['instruments']}"
        f" · concepts {receipt['apply']['concepts']}"
        f" · parameters {receipt['apply']['parameters']}/{receipt['apply']['parameter_options']}"
        f" · traits {receipt['apply']['instrument_traits']}"
        " · recompile + validation OK"
        f" · next review {receipt['refresh']['review_id']}"
        f" · receipt: {receipt_path}"
    )
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(
        description="Transactionally apply reviewed Prompt V'gine knowledge curation bundles."
    )
    sub = ap.add_subparsers(dest="command", required=True)
    p = sub.add_parser("apply")
    p.add_argument("--out-dir", type=Path, required=True)
    p.add_argument("--bundle", type=Path, required=True)
    p.add_argument("--vault", type=Path, required=True)
    p.add_argument("--genre-map", type=Path, required=True)
    args = ap.parse_args()
    return apply_command(args)


if __name__ == "__main__":
    raise SystemExit(main())
