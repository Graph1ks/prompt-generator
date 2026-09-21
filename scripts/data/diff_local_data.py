#!/usr/bin/env python3
"""Compare two locally generated Prompt V'gine corpus snapshots."""
from __future__ import annotations
import argparse, hashlib, json, sqlite3
from pathlib import Path
FIELDS=("title","genre_raw","bpm","emotion_raw","style_raw","year","key_raw","reference_artist","reference_song","used","favorite")
def db(path):
    if not path.is_file(): raise SystemExit(f"database not found: {path}")
    c=sqlite3.connect(path); c.row_factory=sqlite3.Row; return c
def h(v): return hashlib.sha256((v or "").encode()).hexdigest()
def tracks(c):
    out={}
    for r in c.execute(f"SELECT track_id,{','.join(FIELDS)},structured_prompt,negative_prompt,instrumental_arrangement FROM track"):
        d=dict(r); d["structured_prompt_sha256"]=h(d.pop("structured_prompt")); d["negative_prompt_sha256"]=h(d.pop("negative_prompt")); d["instrumental_arrangement_sha256"]=h(d.pop("instrumental_arrangement")); out[r["track_id"]]=d
    return out
def genres(c):
    out={}
    for r in c.execute("SELECT g.label,m.label major FROM genre_raw g LEFT JOIN genre_major_raw gm ON gm.genre_key=g.genre_key LEFT JOIN major_genre_raw m ON m.major_key=gm.major_key"):
        out.setdefault(r["label"],set())
        if r["major"]: out[r["label"]].add(r["major"])
    return out
def labels(c): return {r[0]:r[1] for r in c.execute("SELECT raw_label,COUNT(*) FROM prompt_section GROUP BY raw_label")}
def compare(a,b):
    at,bt=tracks(a),tracks(b); changed=[]
    for tid in sorted(set(at)&set(bt)):
        fields={k:{"old":at[tid][k],"new":bt[tid][k]} for k in at[tid] if at[tid][k]!=bt[tid][k]}
        if fields: changed.append({"track_id":tid,"fields":fields})
    ag,bg=genres(a),genres(b); gm=[{"genre":g,"old":sorted(ag[g]),"new":sorted(bg[g])} for g in sorted(set(ag)&set(bg)) if ag[g]!=bg[g]]; al,bl=labels(a),labels(b)
    return {"tracks":{"added":sorted(set(bt)-set(at)),"removed":sorted(set(at)-set(bt)),"changed":changed},"genres":{"added":sorted(set(bg)-set(ag)),"removed":sorted(set(ag)-set(bg)),"major_mapping_changed":gm},"source_labels":{"added":sorted(set(bl)-set(al)),"removed":sorted(set(al)-set(bl)),"count_changed":{k:{"old":al[k],"new":bl[k]} for k in sorted(set(al)&set(bl)) if al[k]!=bl[k]}}}
def main():
    ap=argparse.ArgumentParser(); ap.add_argument("--old",required=True,type=Path); ap.add_argument("--new",required=True,type=Path); ap.add_argument("--json",type=Path); a=ap.parse_args(); old,new=db(a.old),db(a.new)
    try:r=compare(old,new)
    finally:old.close();new.close()
    print("Prompt V'gine corpus diff"); print(f"  tracks: +{len(r['tracks']['added'])} -{len(r['tracks']['removed'])} changed={len(r['tracks']['changed'])}"); print(f"  genres: +{len(r['genres']['added'])} -{len(r['genres']['removed'])} mappings-changed={len(r['genres']['major_mapping_changed'])}"); print(f"  section labels: +{len(r['source_labels']['added'])} -{len(r['source_labels']['removed'])} count-changed={len(r['source_labels']['count_changed'])}")
    if r["source_labels"]["added"]: print("  NEW LABELS:",", ".join(r["source_labels"]["added"]))
    if a.json: a.json.parent.mkdir(parents=True,exist_ok=True); a.json.write_text(json.dumps(r,indent=2,ensure_ascii=False),encoding="utf-8"); print(f"  report: {a.json}")
    return 0
if __name__=="__main__": raise SystemExit(main())
