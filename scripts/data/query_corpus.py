#!/usr/bin/env python3
"""Read-only inspection CLI for a locally generated Prompt V'gine corpus DB."""
from __future__ import annotations
import argparse, json, sqlite3
from pathlib import Path

def connect(path: Path):
    if not path.is_file(): raise SystemExit(f"corpus DB not found: {path}")
    c=sqlite3.connect(f"file:{path}?mode=ro",uri=True); c.row_factory=sqlite3.Row; return c
def dump(value): print(json.dumps(value,indent=2,ensure_ascii=False))
def term(c,value,limit):
    n=" ".join(value.casefold().split())
    rows=c.execute("SELECT canonical_key,occurrence_count,track_count FROM token_section_stat WHERE token_norm=? ORDER BY occurrence_count DESC",(n,)).fetchall()
    q='"'+value.replace('"','""')+'"'
    ex=c.execute("SELECT track_id,canonical_key,raw_label,content FROM prompt_section_fts WHERE prompt_section_fts MATCH ? LIMIT ?",(q,limit)).fetchall()
    dump({"term":value,"sections":[dict(x) for x in rows],"examples":[dict(x) for x in ex]})
def section(c,key,limit):
    terms=c.execute("SELECT token_norm,occurrence_count,track_count FROM token_section_stat WHERE canonical_key=? ORDER BY occurrence_count DESC LIMIT ?",(key,limit)).fetchall()
    phrases=c.execute("SELECT n,phrase_norm,occurrence_count,track_count FROM phrase_candidate WHERE canonical_key=? ORDER BY occurrence_count DESC,n DESC LIMIT ?",(key,limit)).fetchall()
    values=c.execute("SELECT content_raw_example,occurrence_count,track_count FROM section_value_stat WHERE canonical_key=? ORDER BY occurrence_count DESC LIMIT ?",(key,min(limit,20))).fetchall()
    dump({"section":key,"terms":[dict(x) for x in terms],"phrases":[dict(x) for x in phrases],"repeated_values":[dict(x) for x in values]})
def genre(c,label,limit):
    row=c.execute("SELECT vault_genre_norm FROM genre_crosswalk_candidate WHERE lower(vault_genre_raw)=lower(?)",(label,)).fetchone()
    n=row[0] if row else " ".join(label.casefold().replace("&"," and ").split())
    rows=c.execute("SELECT canonical_key,token_norm,occurrence_count,track_count FROM genre_section_token_stat WHERE vault_genre_norm=? ORDER BY canonical_key,occurrence_count DESC",(n,)).fetchall(); grouped={}
    for r in rows: grouped.setdefault(r["canonical_key"],[]).append(dict(r))
    dump({"genre":label,"normalized":n,"sections":{k:v[:limit] for k,v in grouped.items()}})
def unmatched(c,limit):
    rows=c.execute("SELECT vault_genre_raw,vault_track_count FROM genre_crosswalk_candidate WHERE match_status='unmatched' ORDER BY vault_track_count DESC,vault_genre_raw LIMIT ?",(limit,)).fetchall(); dump([dict(x) for x in rows])
def exclude(c,limit):
    rows=c.execute("SELECT n.item_raw_example,n.item_norm,s.occurrence_count,s.track_count FROM negative_item n JOIN negative_item_stat s ON s.negative_item_id=n.id ORDER BY s.occurrence_count DESC LIMIT ?",(limit,)).fetchall(); dump([dict(x) for x in rows])
def candidates(c,key,minimum,limit):
    rows=c.execute("SELECT n,phrase_norm,occurrence_count,track_count FROM phrase_candidate WHERE canonical_key=? AND occurrence_count>=? ORDER BY occurrence_count DESC,n DESC LIMIT ?",(key,minimum,limit)).fetchall(); dump([dict(x) for x in rows])
def profile(c):
    vals={r["metric_key"]:json.loads(r["metric_value"]) for r in c.execute("SELECT metric_key,metric_value FROM corpus_profile ORDER BY metric_key")}; dump(vals)
def main():
    ap=argparse.ArgumentParser(); ap.add_argument("--db",type=Path,required=True); sub=ap.add_subparsers(dest="cmd",required=True)
    p=sub.add_parser("term"); p.add_argument("value"); p.add_argument("--limit",type=int,default=12)
    p=sub.add_parser("section"); p.add_argument("key"); p.add_argument("--limit",type=int,default=30)
    p=sub.add_parser("genre"); p.add_argument("label"); p.add_argument("--limit",type=int,default=20)
    p=sub.add_parser("unmatched-genres"); p.add_argument("--limit",type=int,default=100)
    p=sub.add_parser("exclude"); p.add_argument("--limit",type=int,default=50)
    p=sub.add_parser("candidates"); p.add_argument("section"); p.add_argument("--min-count",type=int,default=10); p.add_argument("--limit",type=int,default=50)
    sub.add_parser("profile"); a=ap.parse_args()
    with connect(a.db) as c:
        if a.cmd=="term": term(c,a.value,a.limit)
        elif a.cmd=="section": section(c,a.key,a.limit)
        elif a.cmd=="genre": genre(c,a.label,a.limit)
        elif a.cmd=="unmatched-genres": unmatched(c,a.limit)
        elif a.cmd=="exclude": exclude(c,a.limit)
        elif a.cmd=="candidates": candidates(c,a.section,a.min_count,a.limit)
        elif a.cmd=="profile": profile(c)
    return 0
if __name__=="__main__": raise SystemExit(main())
