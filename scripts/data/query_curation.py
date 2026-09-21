#!/usr/bin/env python3
"""Read-only inspection CLI for durable Prompt V'gine curation state."""
from __future__ import annotations
import argparse, json, sqlite3
from pathlib import Path

def connect(path: Path):
    if not path.is_file(): raise SystemExit(f"curation DB not found: {path}")
    c=sqlite3.connect(f"file:{path}?mode=ro",uri=True); c.row_factory=sqlite3.Row; return c
def dump(v): print(json.dumps(v,indent=2,ensure_ascii=False))
def stats(c):
    tables=["entry_patch","term_variant_patch","definition_patch","context_definition_patch","relation_patch","genre_crosswalk_decision","instrument_family_patch","instrument_patch","instrument_alias_patch","parameter_patch","parameter_option_patch","statement_patch","candidate_review"]
    out={}
    for t in tables: out[t]=c.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]
    out["review_queue"]={r["review_status"]:r["n"] for r in c.execute("SELECT review_status,COUNT(*) n FROM candidate_review GROUP BY review_status")}
    dump(out)
def queue(c,status,kind,limit):
    sql="SELECT candidate_key,candidate_type,section_key,surface,normalized_surface,evidence_json,review_status,reviewer_note FROM candidate_review WHERE review_status=?"; args=[status]
    if kind: sql+=" AND candidate_type=?"; args.append(kind)
    sql+=" ORDER BY candidate_type,section_key,surface LIMIT ?"; args.append(limit)
    rows=[]
    for r in c.execute(sql,args):
        d=dict(r)
        try:d["evidence"]=json.loads(d.pop("evidence_json"))
        except Exception:d["evidence"]=d.pop("evidence_json")
        rows.append(d)
    dump(rows)
def entry(c,eid):
    out={"entry_id":eid}
    row=c.execute("SELECT * FROM entry_patch WHERE entry_id=?",(eid,)).fetchone(); out["entry_patch"]=dict(row) if row else None
    out["term_variants"]=[dict(x) for x in c.execute("SELECT * FROM term_variant_patch WHERE entry_id=? ORDER BY locale,is_primary DESC,surface",(eid,))]
    out["definitions"]=[dict(x) for x in c.execute("SELECT * FROM definition_patch WHERE entry_id=? ORDER BY locale,definition_kind,revision",(eid,))]
    out["context_definitions"]=[dict(x) for x in c.execute("SELECT * FROM context_definition_patch WHERE entry_id=? ORDER BY locale,context_type,context_key,revision",(eid,))]
    out["relations_from"]=[dict(x) for x in c.execute("SELECT * FROM relation_patch WHERE source_entry_id=? ORDER BY relation_type,target_entry_id",(eid,))]
    out["relations_to"]=[dict(x) for x in c.execute("SELECT * FROM relation_patch WHERE target_entry_id=? ORDER BY relation_type,source_entry_id",(eid,))]
    dump(out)
def genre(c,surface):
    n=" ".join(surface.casefold().replace("&"," and ").split())
    rows=c.execute("SELECT * FROM genre_crosswalk_decision WHERE source_norm=? OR lower(source_surface)=lower(?) ORDER BY revision DESC,ordinal",(n,surface)).fetchall(); dump([dict(x) for x in rows])
def main():
    ap=argparse.ArgumentParser(); ap.add_argument("--db",type=Path,required=True); sub=ap.add_subparsers(dest="cmd",required=True)
    sub.add_parser("stats")
    p=sub.add_parser("queue"); p.add_argument("--status",default="unreviewed",choices=["unreviewed","accepted","rejected","deferred"]); p.add_argument("--type"); p.add_argument("--limit",type=int,default=100)
    p=sub.add_parser("entry"); p.add_argument("entry_id")
    p=sub.add_parser("genre"); p.add_argument("surface")
    a=ap.parse_args()
    with connect(a.db) as c:
        if a.cmd=="stats": stats(c)
        elif a.cmd=="queue": queue(c,a.status,a.type,a.limit)
        elif a.cmd=="entry": entry(c,a.entry_id)
        elif a.cmd=="genre": genre(c,a.surface)
    return 0
if __name__=="__main__": raise SystemExit(main())
