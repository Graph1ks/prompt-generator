#!/usr/bin/env python3
"""Mechanical integrity checks for Prompt V'gine local databases."""
from __future__ import annotations
import argparse, sqlite3
from pathlib import Path

def connect(path):
    if not path.is_file(): raise FileNotFoundError(path)
    c=sqlite3.connect(path); c.row_factory=sqlite3.Row; c.execute("PRAGMA foreign_keys=ON"); return c
def main():
    ap=argparse.ArgumentParser(); ap.add_argument("--dir",type=Path,default=Path(".local-data")); a=ap.parse_args(); base=a.dir.expanduser().resolve()
    paths={k:base/f"{k}.sqlite" for k in ("corpus","knowledge","curation")}; missing=[str(p) for p in paths.values() if not p.is_file()]
    if missing:
        print("FAILED"); [print(f"  - missing database: {p}") for p in missing]; return 1
    errors=[]; corpus,knowledge,curation=(connect(paths[n]) for n in ("corpus","knowledge","curation"))
    try:
        for name,c in (("corpus",corpus),("knowledge",knowledge),("curation",curation)):
            v=c.execute("PRAGMA integrity_check").fetchone()[0]
            if v!="ok": errors.append(f"{name}: integrity_check={v}")
        tracks=corpus.execute("SELECT COUNT(*) FROM track").fetchone()[0]; sections=corpus.execute("SELECT COUNT(*) FROM prompt_section").fetchone()[0]
        if tracks<=0 or sections<=0: errors.append("corpus: empty track/section tables")
        if corpus.execute("SELECT COUNT(*) FROM prompt_section ps LEFT JOIN track t ON t.track_id=ps.track_id WHERE t.track_id IS NULL").fetchone()[0]: errors.append("corpus: orphan prompt sections")
        rg=corpus.execute("SELECT COUNT(*) FROM genre_raw").fetchone()[0]; rm=corpus.execute("SELECT COUNT(*) FROM major_genre_raw").fetchone()[0]
        if knowledge.execute("SELECT COUNT(*) FROM genre").fetchone()[0]!=rg: errors.append("knowledge: genre count differs from corpus taxonomy")
        if knowledge.execute("SELECT COUNT(*) FROM major_genre").fetchone()[0]!=rm: errors.append("knowledge: major genre count differs from corpus taxonomy")
        if knowledge.execute("SELECT COUNT(*) FROM renderer_profile WHERE active=1").fetchone()[0]!=1: errors.append("knowledge: expected exactly one active renderer")
        if knowledge.execute("SELECT COUNT(*) FROM prompt_section_definition WHERE lower(output_label)='exclude'").fetchone()[0]: errors.append("knowledge: Exclude must not be a structured prompt section")
        row=curation.execute("SELECT value FROM curation_meta WHERE key='schema_version'").fetchone()
        if not row or row[0]!="curation-v1": errors.append("curation: unexpected schema version")
    finally: corpus.close(); knowledge.close(); curation.close()
    if errors:
        print("FAILED"); [print(f"  - {e}") for e in errors]; return 1
    print("OK — corpus, knowledge, and durable curation databases passed integrity checks."); return 0
if __name__=="__main__": raise SystemExit(main())
