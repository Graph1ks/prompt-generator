#!/usr/bin/env python3
"""One bundled owner-local database-foundation finalization session.

Runs the promoted knowledge compiler, validates all three databases, refreshes
knowledge-mining reports, and writes a compact machine-readable acceptance
report. Detailed subprocess output is written to files instead of spamming the
terminal.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import sqlite3
import subprocess
import sys
from pathlib import Path

from instrument_semantics import collect_source_instrument_expressions


def utc_now() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat().replace("+00:00", "Z")


def read_meta(conn: sqlite3.Connection) -> dict[str, str]:
    return {row[0]: row[1] for row in conn.execute("SELECT key,value FROM build_meta")}


def run_logged(name: str, cmd: list[str], report_dir: Path) -> dict:
    result = subprocess.run(
        cmd,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    stdout_path = report_dir / f"{name}.stdout.txt"
    stderr_path = report_dir / f"{name}.stderr.txt"
    stdout_path.write_text(result.stdout or "", encoding="utf-8")
    stderr_path.write_text(result.stderr or "", encoding="utf-8")
    return {
        "name": name,
        "returncode": result.returncode,
        "stdout": str(stdout_path),
        "stderr": str(stderr_path),
    }


def scalar(conn: sqlite3.Connection, sql: str, params=()):
    row = conn.execute(sql, params).fetchone()
    return row[0] if row else None


def collect_acceptance(out_dir: Path) -> dict:
    corpus_path = out_dir / "corpus.sqlite"
    knowledge_path = out_dir / "knowledge.sqlite"
    curation_path = out_dir / "curation.sqlite"
    corpus = sqlite3.connect(corpus_path)
    knowledge = sqlite3.connect(knowledge_path)
    curation = sqlite3.connect(curation_path)
    try:
        source_expressions = collect_source_instrument_expressions(corpus)
        source_expression_count = len(source_expressions)
        expression_states = {
            row[0]: row[1]
            for row in knowledge.execute(
                """SELECT decomposition_state,COUNT(*)
                   FROM instrument_expression
                   WHERE source_kind='factory' AND status<>'deprecated'
                   GROUP BY decomposition_state
                   ORDER BY decomposition_state"""
            )
        }
        source_db_count = scalar(
            knowledge,
            "SELECT COUNT(*) FROM instrument_expression WHERE source_kind='factory'",
        )
        selectable_count = scalar(
            knowledge,
            """SELECT COUNT(*) FROM instrument_expression
               WHERE source_kind='factory' AND selectable=1 AND status<>'deprecated'""",
        )
        exact_output_count = scalar(
            knowledge,
            """SELECT COUNT(*) FROM instrument_expression
               WHERE source_kind='factory' AND output_text=label""",
        )
        linked_identity_count = scalar(
            knowledge,
            """SELECT COUNT(DISTINCT expression_id)
               FROM instrument_expression_instrument""",
        )
        linked_concept_count = scalar(
            knowledge,
            """SELECT COUNT(DISTINCT expression_id)
               FROM instrument_expression_concept""",
        )
        residual_count = scalar(
            knowledge,
            """SELECT COUNT(*) FROM instrument_expression
               WHERE source_kind='factory'
                 AND decomposition_state IN ('partial','unresolved')""",
        )
        invariants = {
            "all_source_expressions_materialized": source_db_count == source_expression_count,
            "all_source_expressions_selectable": selectable_count == source_expression_count,
            "all_source_output_text_preserved": exact_output_count == source_expression_count,
            "exclude_not_structured_section": scalar(
                knowledge,
                """SELECT COUNT(*) FROM prompt_section_definition
                   WHERE lower(output_label)='exclude'""",
            )
            == 0,
            "corpus_integrity": scalar(corpus, "PRAGMA integrity_check") == "ok",
            "knowledge_integrity": scalar(knowledge, "PRAGMA integrity_check") == "ok",
            "curation_integrity": scalar(curation, "PRAGMA integrity_check") == "ok",
        }
        return {
            "schema": "promptvgine-database-foundation-acceptance-v1",
            "generated_at": utc_now(),
            "status": "ok" if all(invariants.values()) else "failed",
            "build_meta": read_meta(knowledge),
            "corpus": {
                "tracks": scalar(corpus, "SELECT COUNT(*) FROM track"),
                "sections": scalar(corpus, "SELECT COUNT(*) FROM prompt_section"),
                "tokens": scalar(
                    corpus,
                    "SELECT CAST(metric_value AS INTEGER) FROM corpus_profile WHERE metric_key='token_count'",
                ),
                "taxonomy_genres": scalar(corpus, "SELECT COUNT(*) FROM genre_raw"),
                "major_genres": scalar(corpus, "SELECT COUNT(*) FROM major_genre_raw"),
                "source_instrument_expressions": source_expression_count,
            },
            "knowledge": {
                "knowledge_entries": scalar(knowledge, "SELECT COUNT(*) FROM knowledge_entry"),
                "approved_definitions": scalar(
                    knowledge,
                    "SELECT COUNT(*) FROM definition WHERE status='approved'",
                ),
                "canonical_instruments": scalar(
                    knowledge,
                    "SELECT COUNT(*) FROM instrument WHERE status<>'deprecated'",
                ),
                "instrument_families": scalar(
                    knowledge, "SELECT COUNT(*) FROM instrument_family"
                ),
                "instrument_aliases": scalar(
                    knowledge,
                    "SELECT COUNT(*) FROM instrument_alias WHERE status<>'deprecated'",
                ),
                "instrument_traits": scalar(
                    knowledge,
                    "SELECT COUNT(*) FROM instrument_trait WHERE status<>'deprecated'",
                ),
                "instrument_expressions": source_db_count,
                "selectable_instrument_expressions": selectable_count,
                "instrument_expression_states": expression_states,
                "expressions_linked_to_instrument_identity": linked_identity_count,
                "expressions_linked_to_concepts": linked_concept_count,
                "expressions_with_semantic_residual": residual_count,
                "instrument_parameters": scalar(
                    knowledge,
                    "SELECT COUNT(*) FROM parameter WHERE section_key='instruments'",
                ),
                "instrument_parameter_options": scalar(
                    knowledge,
                    """SELECT COUNT(*) FROM parameter_option o
                       JOIN parameter p ON p.id=o.parameter_id
                       WHERE p.section_key='instruments' AND o.status<>'deprecated'""",
                ),
            },
            "curation": {
                "entries": scalar(curation, "SELECT COUNT(*) FROM entry_patch"),
                "instruments": scalar(curation, "SELECT COUNT(*) FROM instrument_patch"),
                "instrument_aliases": scalar(
                    curation, "SELECT COUNT(*) FROM instrument_alias_patch"
                ),
                "instrument_traits": scalar(
                    curation, "SELECT COUNT(*) FROM instrument_trait_patch"
                ),
                "parameters": scalar(curation, "SELECT COUNT(*) FROM parameter_patch"),
                "parameter_options": scalar(
                    curation, "SELECT COUNT(*) FROM parameter_option_patch"
                ),
            },
            "invariants": invariants,
        }
    finally:
        corpus.close()
        knowledge.close()
        curation.close()


def main() -> int:
    ap = argparse.ArgumentParser(
        description="Finalize and verify the owner-local Prompt V'gine database foundation."
    )
    ap.add_argument("command", choices=["finalize"])
    ap.add_argument("--out-dir", type=Path, required=True)
    ap.add_argument("--vault", type=Path, required=True)
    ap.add_argument("--genre-map", type=Path, required=True)
    args = ap.parse_args()

    out_dir = args.out_dir.resolve()
    report_dir = out_dir / "reports" / "database"
    report_dir.mkdir(parents=True, exist_ok=True)
    scripts = Path(__file__).resolve().parent

    steps = []
    steps.append(
        run_logged(
            "01-build",
            [
                sys.executable,
                str(scripts / "build_local_data.py"),
                "--vault",
                str(args.vault.resolve()),
                "--genre-map",
                str(args.genre_map.resolve()),
                "--out-dir",
                str(out_dir),
            ],
            report_dir,
        )
    )
    if steps[-1]["returncode"] != 0:
        status = {
            "schema": "promptvgine-database-foundation-session-v1",
            "status": "failed",
            "failed_step": steps[-1]["name"],
            "steps": steps,
        }
        path = report_dir / "database-foundation-session-v1.json"
        path.write_text(json.dumps(status, indent=2) + "\n", encoding="utf-8")
        print(f"[database-foundation] FAILED · report: {path}")
        return 1

    steps.append(
        run_logged(
            "02-validate",
            [
                sys.executable,
                str(scripts / "validate_local_data.py"),
                "--dir",
                str(out_dir),
            ],
            report_dir,
        )
    )
    if steps[-1]["returncode"] != 0:
        status = {
            "schema": "promptvgine-database-foundation-session-v1",
            "status": "failed",
            "failed_step": steps[-1]["name"],
            "steps": steps,
        }
        path = report_dir / "database-foundation-session-v1.json"
        path.write_text(json.dumps(status, indent=2) + "\n", encoding="utf-8")
        print(f"[database-foundation] FAILED · report: {path}")
        return 1

    steps.append(
        run_logged(
            "03-knowledge-mining",
            [
                sys.executable,
                str(scripts / "knowledge_mining_session.py"),
                "prepare",
                "--out-dir",
                str(out_dir),
            ],
            report_dir,
        )
    )
    if steps[-1]["returncode"] != 0:
        status = {
            "schema": "promptvgine-database-foundation-session-v1",
            "status": "failed",
            "failed_step": steps[-1]["name"],
            "steps": steps,
        }
        path = report_dir / "database-foundation-session-v1.json"
        path.write_text(json.dumps(status, indent=2) + "\n", encoding="utf-8")
        print(f"[database-foundation] FAILED · report: {path}")
        return 1

    acceptance = collect_acceptance(out_dir)
    acceptance["steps"] = steps
    acceptance_path = report_dir / "database-foundation-acceptance-v1.json"
    acceptance_path.write_text(
        json.dumps(acceptance, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    session = {
        "schema": "promptvgine-database-foundation-session-v1",
        "status": acceptance["status"],
        "completed_at": utc_now(),
        "acceptance_report": str(acceptance_path),
        "steps": steps,
    }
    session_path = report_dir / "database-foundation-session-v1.json"
    session_path.write_text(
        json.dumps(session, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    if acceptance["status"] != "ok":
        print(f"[database-foundation] FAILED invariants · report: {acceptance_path}")
        return 1

    k = acceptance["knowledge"]
    print(
        "[database-foundation] OK"
        f" · expressions {k['selectable_instrument_expressions']:,}"
        f" · canonical instruments {k['canonical_instruments']:,}"
        f" · unresolved {k['expressions_with_semantic_residual']:,}"
        f" · report: {acceptance_path}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
