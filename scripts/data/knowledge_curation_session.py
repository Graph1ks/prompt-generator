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

BUNDLE_SCHEMA = "promptvgine-knowledge-curation-decisions-v1"
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


def expected_source_hashes(corpus_path: Path) -> dict:
    with open_ro(corpus_path) as corpus:
        meta = source_meta(corpus)
    return {
        "prompt_vault_sha256": meta["prompt_vault"]["sha256"],
        "genre_map_sha256": meta["genre_map"]["sha256"],
    }


def load_review_state(out_dir: Path) -> dict:
    reports_dir = out_dir / "reports" / "knowledge"
    instrument_path = reports_dir / REPORT_FILES["instrument"]
    lexicon_path = reports_dir / REPORT_FILES["lexicon"]
    instrument = read_json(instrument_path)
    lexicon = read_json(lexicon_path)
    if instrument.get("review_id") != lexicon.get("review_id"):
        raise SystemExit("instrument and lexicon reports belong to different review snapshots")
    return {
        "review_id": instrument.get("review_id"),
        "instrument_path": instrument_path,
        "lexicon_path": lexicon_path,
        "instrument_sha256": sha256_file(instrument_path),
        "lexicon_sha256": sha256_file(lexicon_path),
        "curation_fingerprint": instrument.get("curation_fingerprint")
        or lexicon.get("curation_fingerprint"),
    }


def all_entries(bundle: dict) -> list[dict]:
    return [item["entry"] for item in bundle.get("instruments", [])] + list(
        bundle.get("concepts", [])
    )


def validate_bundle(bundle: dict, out_dir: Path, corpus_path: Path, curation_path: Path) -> dict:
    if bundle.get("schema") != BUNDLE_SCHEMA:
        raise SystemExit(f"unsupported bundle schema: {bundle.get('schema')!r}")

    local_review = load_review_state(out_dir)
    if bundle.get("review_id") != local_review["review_id"]:
        raise SystemExit(
            "decision bundle belongs to another knowledge-mining review; prepare/review a fresh bundle"
        )

    report_hash = bundle.get("report_sha256") or {}
    if report_hash.get("instrument") != local_review["instrument_sha256"]:
        raise SystemExit("instrument review file does not match the reviewed decision bundle")
    if report_hash.get("lexicon") != local_review["lexicon_sha256"]:
        raise SystemExit("lexicon review file does not match the reviewed decision bundle")

    expected_sources = expected_source_hashes(corpus_path)
    if bundle.get("source") != expected_sources:
        raise SystemExit("decision bundle source fingerprints do not match the promoted corpus")

    with open_ro(curation_path) as curation:
        current_curation_sha = curation_fingerprint(curation)
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

    family_ids = set()
    for family in bundle.get("instrument_families", []):
        fid = family.get("id")
        if not fid or fid in family_ids:
            raise SystemExit(f"missing/duplicate instrument family id: {fid!r}")
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

    instrument_ids = set()
    alias_owner: dict[str, str] = {}
    for instrument in bundle.get("instruments", []):
        iid = instrument.get("id")
        if not iid or iid in instrument_ids:
            raise SystemExit(f"missing/duplicate instrument id: {iid!r}")
        instrument_ids.add(iid)
        if instrument.get("family_id") not in family_ids:
            raise SystemExit(
                f"instrument {iid} references missing bundle family {instrument.get('family_id')!r}"
            )
        if instrument["entry"].get("entry_id") not in entry_ids:
            raise SystemExit(f"instrument {iid} references missing knowledge entry")
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
        "family_count": len(family_ids),
        "instrument_count": len(instrument_ids),
        "concept_count": len(bundle.get("concepts", [])),
        "entry_count": len(entry_ids),
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

        for entry in bundle.get("concepts", []):
            upsert_entry(conn, bundle, entry)

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
        "concepts": len(bundle.get("concepts", [])),
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

    receipt = {
        "schema": "promptvgine-knowledge-curation-apply-receipt-v1",
        "started_at": utc_now(),
        "bundle_id": bundle.get("bundle_id"),
        "review_id": bundle.get("review_id"),
        "bundle_file": str(args.bundle.resolve()),
        "bundle_sha256": sha256_file(args.bundle.resolve()),
        "backup": str(backup),
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
