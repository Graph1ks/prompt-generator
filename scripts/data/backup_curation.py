#!/usr/bin/env python3
"""Create an integrity-checked local backup of durable Prompt V'gine curation state."""
from __future__ import annotations
import argparse, datetime as dt, sqlite3
from pathlib import Path
def main():
    ap=argparse.ArgumentParser(); ap.add_argument("--source",type=Path,default=Path(".local-data/curation.sqlite")); ap.add_argument("--out-dir",type=Path,default=Path(".local-data/backups")); a=ap.parse_args(); source=a.source.expanduser().resolve()
    if not source.is_file(): raise SystemExit(f"curation database not found: {source}")
    stamp=dt.datetime.now().strftime("%Y%m%d-%H%M%S"); out=a.out_dir.expanduser().resolve(); out.mkdir(parents=True,exist_ok=True); target=out/f"curation-{stamp}.sqlite"
    src=sqlite3.connect(source)
    try:
        if src.execute("PRAGMA integrity_check").fetchone()[0]!="ok": raise SystemExit("source curation DB failed integrity_check; backup aborted")
        dst=sqlite3.connect(target)
        try: src.backup(dst); dst.commit()
        finally: dst.close()
    finally: src.close()
    chk=sqlite3.connect(target)
    try:
        if chk.execute("PRAGMA integrity_check").fetchone()[0]!="ok": target.unlink(missing_ok=True); raise SystemExit("backup failed integrity_check")
    finally: chk.close()
    print(target); return 0
if __name__=="__main__": raise SystemExit(main())
