#!/usr/bin/env python3
"""Inspect compiled Prompt V'gine knowledge, especially instrument expressions."""
from __future__ import annotations

import argparse
import json
import sqlite3
from pathlib import Path


def connect(path: Path) -> sqlite3.Connection:
    if not path.is_file():
        raise SystemExit(f"database not found: {path}")
    conn = sqlite3.connect(f"file:{path.resolve()}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    return conn


def print_json(value) -> None:
    print(json.dumps(value, indent=2, ensure_ascii=False))


def expression_payload(conn: sqlite3.Connection, row: sqlite3.Row) -> dict:
    payload = dict(row)
    try:
        payload["residual_tokens"] = json.loads(payload.pop("residual_json"))
    except Exception:
        payload["residual_tokens"] = payload.pop("residual_json")
    payload["instruments"] = [
        dict(x)
        for x in conn.execute(
            """SELECT i.id,i.label,eii.role,eii.ordinal
               FROM instrument_expression_instrument eii
               JOIN instrument i ON i.id=eii.instrument_id
               WHERE eii.expression_id=?
               ORDER BY eii.ordinal,i.label""",
            (row["id"],),
        )
    ]
    payload["concepts"] = [
        dict(x)
        for x in conn.execute(
            """SELECT e.id,e.canonical_label,e.entry_type,eic.role,eic.ordinal
               FROM instrument_expression_concept eic
               JOIN knowledge_entry e ON e.id=eic.entry_id
               WHERE eic.expression_id=?
               ORDER BY eic.ordinal,e.canonical_label""",
            (row["id"],),
        )
    ]
    return payload


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--db", type=Path, required=True)
    sub = ap.add_subparsers(dest="command", required=True)

    sub.add_parser("stats")

    p = sub.add_parser("expression")
    p.add_argument("surface")

    p = sub.add_parser("search")
    p.add_argument("query")
    p.add_argument("--limit", type=int, default=30)

    p = sub.add_parser("unresolved")
    p.add_argument("--limit", type=int, default=100)

    args = ap.parse_args()
    conn = connect(args.db)
    try:
        if args.command == "stats":
            states = {
                row["decomposition_state"]: row["n"]
                for row in conn.execute(
                    """SELECT decomposition_state,COUNT(*) AS n
                       FROM instrument_expression
                       WHERE status<>'deprecated'
                       GROUP BY decomposition_state"""
                )
            }
            print_json(
                {
                    "instruments": conn.execute(
                        "SELECT COUNT(*) FROM instrument WHERE status<>'deprecated'"
                    ).fetchone()[0],
                    "instrument_expressions": conn.execute(
                        "SELECT COUNT(*) FROM instrument_expression WHERE status<>'deprecated'"
                    ).fetchone()[0],
                    "selectable_instrument_expressions": conn.execute(
                        """SELECT COUNT(*) FROM instrument_expression
                           WHERE status<>'deprecated' AND selectable=1"""
                    ).fetchone()[0],
                    "expression_states": states,
                    "instrument_families": conn.execute(
                        "SELECT COUNT(*) FROM instrument_family"
                    ).fetchone()[0],
                    "instrument_traits": conn.execute(
                        "SELECT COUNT(*) FROM instrument_trait WHERE status<>'deprecated'"
                    ).fetchone()[0],
                    "instrument_parameters": conn.execute(
                        "SELECT COUNT(*) FROM parameter WHERE section_key='instruments'"
                    ).fetchone()[0],
                    "instrument_parameter_options": conn.execute(
                        """SELECT COUNT(*) FROM parameter_option o
                           JOIN parameter p ON p.id=o.parameter_id
                           WHERE p.section_key='instruments' AND o.status<>'deprecated'"""
                    ).fetchone()[0],
                }
            )
            return 0

        if args.command == "expression":
            key = " ".join(args.surface.casefold().split())
            row = conn.execute(
                """SELECT * FROM instrument_expression
                   WHERE label_norm=? OR id=?
                   ORDER BY track_count DESC LIMIT 1""",
                (key, args.surface),
            ).fetchone()
            if not row:
                raise SystemExit(f"instrument expression not found: {args.surface}")
            print_json(expression_payload(conn, row))
            return 0

        if args.command == "search":
            q = " ".join(args.query.strip().split())
            rows = []
            if q:
                try:
                    ids = [
                        row[0]
                        for row in conn.execute(
                            """SELECT expression_id FROM instrument_expression_search
                               WHERE instrument_expression_search MATCH ?
                               LIMIT ?""",
                            (q, args.limit),
                        )
                    ]
                except sqlite3.OperationalError:
                    ids = []
                if ids:
                    placeholders = ",".join("?" for _ in ids)
                    rows = list(
                        conn.execute(
                            f"""SELECT * FROM instrument_expression
                                WHERE id IN ({placeholders})
                                ORDER BY track_count DESC,occurrence_count DESC,label""",
                            ids,
                        )
                    )
                else:
                    rows = list(
                        conn.execute(
                            """SELECT * FROM instrument_expression
                               WHERE label_norm LIKE ?
                               ORDER BY track_count DESC,occurrence_count DESC,label
                               LIMIT ?""",
                            (f"%{q.casefold()}%", args.limit),
                        )
                    )
            print_json([expression_payload(conn, row) for row in rows[: args.limit]])
            return 0

        if args.command == "unresolved":
            rows = conn.execute(
                """SELECT * FROM instrument_expression
                   WHERE status<>'deprecated'
                     AND decomposition_state IN ('partial','unresolved')
                   ORDER BY track_count DESC,occurrence_count DESC,label
                   LIMIT ?""",
                (args.limit,),
            )
            print_json([expression_payload(conn, row) for row in rows])
            return 0
    finally:
        conn.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
