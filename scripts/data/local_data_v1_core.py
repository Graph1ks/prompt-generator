#!/usr/bin/env python3
"""V1 semantic/data helpers retained for the resumable local-data builder."""
from __future__ import annotations
import argparse, collections, datetime as dt, gzip, hashlib, json, re, sqlite3, unicodedata
from pathlib import Path

VAULT_SCHEMA="graph1ks-prompt-control-deck-v1"; GENRE_SCHEMA="graph1ks-genre-map-v2"; RULES="corpus-extract-v1"
SECTION_MAP={
 "Genre":("genre","Genre","canonical"),"Era":("era","Era","canonical"),"BPM":("bpm","BPM","canonical"),
 "BPM/Meter":("bpm_meter","BPM/Meter","compound"),"Meter":("meter","Meter","canonical"),
 "Meter/Groove":("meter_groove","Meter/Groove","compound"),"Key/Mode":("key_mode","Key/Mode","canonical"),
 "Groove":("groove","Groove","canonical"),"Melody":("melody","Melody","canonical"),
 "Harmony":("harmony","Harmony","canonical"),"Drums":("drums","Drums","canonical"),"Bass":("bass","Bass","canonical"),
 "Low End":("low_end","Low End","legacy"),"Instruments":("instruments","Instruments","canonical"),
 "Exciters":("exciters","Exciters","canonical"),"Texture":("texture","Texture","canonical"),"Vocal":("vocal","Vocal","canonical"),
 "Emotion":("emotion","Emotion","legacy"),"Density":("density","Density","legacy"),"Dynamics":("dynamics","Dynamics","canonical"),
 "Space/Mix":("space_mix","Space/Mix","canonical"),"Mix":("space_mix","Space/Mix","alias"),
 "Production":("production","Production","canonical"),"Structure":("structure","Structure","canonical")}
OUTPUT_SECTIONS=[("genre","Genre",10),("era","Era",20),("bpm","BPM",30),("key_mode","Key/Mode",40),("groove","Groove",50),
 ("melody","Melody",60),("harmony","Harmony",70),("drums","Drums",80),("bass","Bass",90),("instruments","Instruments",100),
 ("exciters","Exciters",110),("texture","Texture",120),("vocal","Vocal",130),("dynamics","Dynamics",140),("space_mix","Space/Mix",150),
 ("production","Production",160),("structure","Structure",170)]
SECTION_RE=re.compile(r"^\[([^:\]]+):\s*(.*?)\]$"); TOKEN_RE=re.compile(r"[^\W_]+(?:[-'][^\W_]+)*",re.UNICODE); NEG_RE=re.compile(r"\s*,\s*")

def now(): return dt.datetime.now(dt.timezone.utc).isoformat().replace("+00:00","Z")
def load(p):
 with (gzip.open(p,"rt",encoding="utf-8") if p.suffix==".gz" else p.open(encoding="utf-8")) as f:return json.load(f)
def sha(p):
 h=hashlib.sha256()
 with p.open("rb") as f:
  for b in iter(lambda:f.read(1048576),b""):h.update(b)
 return h.hexdigest()
def space(s): return " ".join((s or "").strip().split())
def norm(s): return space(unicodedata.normalize("NFKC",s or "")).casefold()
def lookup(s):
 s=unicodedata.normalize("NFKD",s or ""); s="".join(c for c in s if not unicodedata.combining(c)).casefold().replace("&"," and ")
 return " ".join(re.sub(r"[^a-z0-9]+"," ",s).split())
def slug(s): return re.sub(r"\s+","-",lookup(s)).strip("-") or "unnamed"
def sid(prefix,s): return f"{prefix}:{slug(s)}:{hashlib.sha1(s.encode()).hexdigest()[:12]}"
def sections(text):
 out=[]
 for i,line in enumerate((x.strip() for x in (text or "").splitlines() if x.strip()),1):
  m=SECTION_RE.match(line)
  if not m: raise ValueError(f"Malformed structured prompt line: {line!r}")
  label=space(m.group(1)); content=space(m.group(2)); key,outlabel,status=SECTION_MAP.get(label,(f"unknown:{slug(label)}",label,"unknown"))
  out.append((i,label,key,outlabel,status,content,norm(content),line))
 return out
def clauses(text):
 out=[]; start=0; i=1
 for m in re.finditer(r"[,;]",text):
  raw=text[start:m.start()].strip()
  if raw:
   rs=text.find(raw,start,m.start()+1); out.append((i,raw,norm(raw),m.group(0),rs,rs+len(raw))); i+=1
  start=m.end()
 raw=text[start:].strip()
 if raw:
  rs=text.find(raw,start); out.append((i,raw,norm(raw),None,rs,rs+len(raw)))
 return out
def tokens(text): return [(i,m.group(),norm(m.group()),m.start(),m.end()) for i,m in enumerate(TOKEN_RE.finditer(text),1)]
def meta(c,d): c.executemany("INSERT OR REPLACE INTO build_meta(key,value) VALUES (?,?)",[(k,str(v)) for k,v in d.items()])
def schema(c,p): c.executescript(p.read_text(encoding="utf-8")); c.execute("PRAGMA synchronous=OFF"); c.execute("PRAGMA temp_store=MEMORY")

def build_corpus(c,v,g,vp,gp,vsha,gsha,deep=False):
 cur=c.cursor(); stamp=now(); meta(c,{"schema_version":"corpus-v1","rules":RULES,"vault_sha256":vsha,"genre_map_sha256":gsha,"built_at":stamp})
 cur.execute("INSERT INTO source_file(kind,basename,sha256,schema_name,schema_version,source_timestamp,imported_at) VALUES (?,?,?,?,?,?,?)",("prompt_vault",vp.name,vsha,v["schema"],v.get("version"),v.get("exported_at"),stamp)); vsid=cur.lastrowid
 cur.execute("INSERT INTO source_file(kind,basename,sha256,schema_name,schema_version,source_timestamp,imported_at) VALUES (?,?,?,?,?,?,?)",("genre_map",gp.name,gsha,g["schema"],str(g.get("taxonomy_version")),g.get("generated_at"),stamp))
 cur.executemany("INSERT INTO section_label_map(raw_label,canonical_key,canonical_output_label,mapping_status) VALUES (?,?,?,?)",[(k,*val) for k,val in SECTION_MAP.items()])
 majors={label:sid("major",label) for label in g["major_genres"]}
 cur.executemany("INSERT INTO major_genre_raw(major_key,label,source_ordinal) VALUES (?,?,?)",[(majors[x],x,i) for i,x in enumerate(g["major_genres"],1)])
 genres={}; gnorm={}
 for i,item in enumerate(g["genres"],1):
  label=space(item["genre"]); gid=sid("genre",label); genres[label]=gid; gnorm.setdefault(lookup(label),gid)
  cur.execute("INSERT INTO genre_raw(genre_key,label,label_norm,source_ordinal,track_count_declared) VALUES (?,?,?,?,?)",(gid,label,lookup(label),i,int(item.get("track_count") or 0)))
  cur.executemany("INSERT INTO genre_major_raw(genre_key,major_key,ordinal) VALUES (?,?,?)",[(gid,majors[m],j) for j,m in enumerate(item.get("major_genres",[]),1)])
 tok=collections.Counter(); tok_tracks=collections.Counter(); gtok=collections.Counter(); gtok_tracks=collections.Counter(); phr=collections.Counter(); phr_tracks=collections.Counter(); phr_first={}; vals=collections.Counter(); val_tracks=collections.Counter(); val_example={}; seqs=collections.Counter(); neg=collections.Counter(); neg_tracks=collections.defaultdict(set); neg_raw={}; neg_occ=[]; vg=collections.Counter(); section_count=token_count=0
 for pos,t in enumerate(v["tracks"],1):
  tid=str(t.get("id") if t.get("id") is not None else pos); genre=space(str(t.get("genre") or "")); vg[genre]+=1
  cur.execute("INSERT INTO track(track_id,source_file_id,source_ordinal,title,genre_raw,bpm,emotion_raw,style_raw,year,key_raw,reference_artist,reference_song,structured_prompt,negative_prompt,instrumental_arrangement,used,favorite) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",(tid,vsid,pos,t.get("title"),genre,t.get("bpm"),t.get("emotion"),t.get("style"),t.get("year"),t.get("key"),t.get("reference_artist"),t.get("reference_song"),t.get("structured_prompt") or "",t.get("negative_prompt"),t.get("instrumental_arrangement"),int(bool(t.get("used"))),int(bool(t.get("favorite")))))
  ss=sections(t.get("structured_prompt") or ""); seqs[tuple(x[1] for x in ss)]+=1; seen_tok=set(); seen_gtok=set(); seen_phr=set(); seen_vals=set()
  for ordinal,label,key,outlabel,status,raw,rawnorm,line in ss:
   section_count+=1; cur.execute("INSERT INTO prompt_section(track_id,ordinal,raw_label,canonical_key,canonical_output_label,content_raw,content_norm,source_line_raw) VALUES (?,?,?,?,?,?,?,?)",(tid,ordinal,label,key,outlabel,raw,rawnorm,line)); secid=cur.lastrowid
   vkey=(key,rawnorm); vals[vkey]+=1; val_tracks[vkey]+=int(vkey not in seen_vals); seen_vals.add(vkey); val_example.setdefault(vkey,raw)
   cls=clauses(raw); cur.executemany("INSERT INTO prompt_clause(section_id,ordinal,content_raw,content_norm,delimiter_after,start_char,end_char) VALUES (?,?,?,?,?,?,?)",[(secid,*x) for x in cls])
   ts=tokens(raw); token_count+=len(ts); tnorm=[x[2] for x in ts]
   for oi,tr,tn,a,b in ts:
    k=(tn,key); tok[k]+=1; seen_tok.add(k); gk=(lookup(genre),key,tn); gtok[gk]+=1; seen_gtok.add(gk)
    if deep: cur.execute("INSERT INTO token_occurrence(section_id,ordinal_section,token_raw,token_norm,start_char,end_char) VALUES (?,?,?,?,?,?)",(secid,oi,tr,tn,a,b))
   for n in range(2,min(5,len(tnorm))+1):
    for i in range(len(tnorm)-n+1):
     p=" ".join(tnorm[i:i+n]); pk=(key,n,p); phr[pk]+=1; seen_phr.add(pk); phr_first.setdefault(pk,secid)
  for k in seen_tok: tok_tracks[k]+=1
  for k in seen_gtok: gtok_tracks[k]+=1
  for k in seen_phr: phr_tracks[k]+=1
  for i,item in enumerate((space(x) for x in NEG_RE.split(space(str(t.get("negative_prompt") or ""))) if space(x)),1):
   n=norm(item); neg[n]+=1; neg_tracks[n].add(tid); neg_raw.setdefault(n,item); neg_occ.append((tid,i,item,n))
 c.executemany("INSERT INTO token_section_stat(token_norm,canonical_key,occurrence_count,track_count) VALUES (?,?,?,?)",[(a,b,n,tok_tracks[(a,b)]) for (a,b),n in tok.items()])
 c.executemany("INSERT INTO genre_section_token_stat(vault_genre_norm,canonical_key,token_norm,occurrence_count,track_count) VALUES (?,?,?,?,?)",[(a,b,d,n,gtok_tracks[(a,b,d)]) for (a,b,d),n in gtok.items()])
 c.executemany("INSERT INTO section_value_stat(canonical_key,content_norm,content_raw_example,occurrence_count,track_count) VALUES (?,?,?,?,?)",[(a,b,val_example[(a,b)],n,val_tracks[(a,b)]) for (a,b),n in vals.items()])
 c.executemany("INSERT INTO phrase_candidate(canonical_key,n,phrase_norm,occurrence_count,track_count,first_section_id) VALUES (?,?,?,?,?,?)",[(a,n,p,count,phr_tracks[(a,n,p)],phr_first[(a,n,p)]) for (a,n,p),count in phr.items() if count>=3])
 negids={}
 for n,count in neg.items():
  cur.execute("INSERT INTO negative_item(item_raw_example,item_norm) VALUES (?,?)",(neg_raw[n],n)); negids[n]=cur.lastrowid; cur.execute("INSERT INTO negative_item_stat(negative_item_id,occurrence_count,track_count) VALUES (?,?,?)",(cur.lastrowid,count,len(neg_tracks[n])))
 c.executemany("INSERT INTO track_negative_item(track_id,negative_item_id,ordinal,item_raw) VALUES (?,?,?,?)",[(tid,negids[n],i,raw) for tid,i,raw,n in neg_occ])
 c.execute("INSERT INTO prompt_section_fts(section_id,track_id,canonical_key,raw_label,content) SELECT id,track_id,canonical_key,raw_label,content_raw FROM prompt_section")
 for seq,count in seqs.items():
  js=json.dumps(list(seq),ensure_ascii=False); cur.execute("INSERT INTO section_sequence_stat(sequence_key,sequence_json,track_count) VALUES (?,?,?)",(hashlib.sha1(js.encode()).hexdigest(),js,count))
 exact={r[0]:r[1] for r in cur.execute("SELECT label,genre_key FROM genre_raw")}; bynorm={}
 for a,b in cur.execute("SELECT label_norm,genre_key FROM genre_raw"): bynorm.setdefault(a,b)
 x=collections.Counter()
 for label,count in vg.items():
  ln=lookup(label); status="exact" if label in exact else "normalized" if ln in bynorm else "unmatched"; match=exact.get(label) or bynorm.get(ln); x[status]+=1
  cur.execute("INSERT INTO genre_crosswalk_candidate(vault_genre_raw,vault_genre_norm,vault_track_count,match_status,matched_genre_key) VALUES (?,?,?,?,?)",(label,ln,count,status,match))
 raw_labels={x[1] for t in v["tracks"] for x in sections(t.get("structured_prompt") or "")}
 track_match=collections.Counter()
 for label,count in vg.items():
  row=cur.execute("SELECT match_status FROM genre_crosswalk_candidate WHERE vault_genre_raw=?",(label,)).fetchone()
  if row: track_match[row[0]]+=count
 prof={"track_count":len(v["tracks"]),"section_count":section_count,"token_count":token_count,"raw_section_label_count":len(raw_labels),"section_sequence_variant_count":len(seqs),"negative_item_occurrence_count":sum(neg.values()),"negative_unique_item_count":len(neg),"major_genre_count":len(g["major_genres"]),"taxonomy_genre_count":len(g["genres"]),"vault_genre_label_count":len(vg),"genre_crosswalk_exact_labels":x["exact"],"genre_crosswalk_normalized_labels":x["normalized"],"genre_crosswalk_unmatched_labels":x["unmatched"],"genre_crosswalk_exact_tracks":track_match["exact"],"genre_crosswalk_normalized_tracks":track_match["normalized"],"genre_crosswalk_unmatched_tracks":track_match["unmatched"],"deep_token_index":deep}
 c.executemany("INSERT INTO corpus_profile(metric_key,metric_value) VALUES (?,?)",[(k,json.dumps(v)) for k,v in prof.items()]); c.commit(); return prof

def build_knowledge(c,g,corpus,gsha):
 stamp=now(); meta(c,{"schema_version":"knowledge-v1","rules":RULES,"taxonomy":g.get("taxonomy"),"taxonomy_version":g.get("taxonomy_version"),"genre_map_sha256":gsha,"built_at":stamp,"curation_state":"bootstrap-candidates"}); cur=c.cursor(); prov="genre-map-factory"
 cur.execute("INSERT INTO provenance(provenance_key,source_kind,source_ref,source_version,source_hash,extraction_rule_version,notes) VALUES (?,?,?,?,?,?,?)",(prov,"factory","GRAPH1KS_GENRE_MAP_FACTORY.json",str(g.get("taxonomy_version")),gsha,RULES,"Full source file remains local-only."))
 for key,label,order in OUTPUT_SECTIONS: cur.execute("INSERT INTO prompt_section_definition(section_key,output_label,output_order,optional,easy_visible,advanced_visible) VALUES (?,?,?,?,?,?)",(key,label,order,1,1,1))
 cur.execute("INSERT INTO renderer_profile(id,label,version,active,notes) VALUES (?,?,?,?,?)",("suno-structured-v1","Suno structured prompt",1,1,"[Header: content] lines; Exclude is separate comma-list output."))
 cur.executemany("INSERT INTO renderer_section(renderer_profile_id,section_key,output_order,emit_when_empty) VALUES (?,?,?,0)",[("suno-structured-v1",k,o) for k,_,o in OUTPUT_SECTIONS])
 mids={}
 for i,label in enumerate(g["major_genres"],1):
  mid=sid("major",label); eid=sid("knowledge:genre",f"major::{label}"); mids[label]=mid
  cur.execute("INSERT INTO knowledge_entry(id,entry_type,canonical_label,canonical_slug,status,difficulty,created_from,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)",(eid,"major_genre",label,f"major-{slug(label)}","approved","beginner","genre-map",stamp,stamp))
  cur.execute("INSERT INTO term_variant(entry_id,surface,surface_norm,locale,match_kind,match_priority,is_primary) VALUES (?,?,?,?,?,?,1)",(eid,label,norm(label),"en","phrase",200))
  cur.execute("INSERT INTO major_genre(id,label,source_ordinal,knowledge_entry_id) VALUES (?,?,?,?)",(mid,label,i,eid))
 gids={}
 for item in g["genres"]:
  label=space(item["genre"]); gid=sid("genre",label); eid=sid("knowledge:genre",label); gids[label]=gid
  cur.execute("INSERT INTO knowledge_entry(id,entry_type,canonical_label,canonical_slug,status,difficulty,created_from,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)",(eid,"genre",label,f"genre-{slug(label)}","approved","beginner","genre-map",stamp,stamp))
  cur.execute("INSERT INTO term_variant(entry_id,surface,surface_norm,locale,match_kind,match_priority,is_primary) VALUES (?,?,?,?,?,?,1)",(eid,label,norm(label),"en","phrase",300))
  cur.execute("INSERT INTO genre(id,label,label_norm,status,knowledge_entry_id,provenance_key) VALUES (?,?,?,?,?,?)",(gid,label,lookup(label),"approved",eid,prov))
  cur.executemany("INSERT INTO genre_major(genre_id,major_genre_id,ordinal) VALUES (?,?,?)",[(gid,mids[m],i) for i,m in enumerate(item.get("major_genres",[]),1)])
 raw_to_label={k:l for k,l in corpus.execute("SELECT genre_key,label FROM genre_raw")}; aliases=0
 for surface,n,status,gk in corpus.execute("SELECT vault_genre_raw,vault_genre_norm,match_status,matched_genre_key FROM genre_crosswalk_candidate WHERE match_status IN ('exact','normalized')"):
  label=raw_to_label.get(gk)
  if label:
   cur.execute("INSERT OR IGNORE INTO genre_alias(alias_norm,alias_surface,genre_id,alias_kind,status,provenance_key) VALUES (?,?,?,?,?,?)",(n,surface,gids[label],status,"approved",prov)); aliases+=cur.rowcount
 c.commit(); return {"major_genres":len(mids),"genres":len(gids),"approved_genre_aliases":aliases,"renderer_sections":len(OUTPUT_SECTIONS)}


def init_curation(path,schema_dir):
 c=sqlite3.connect(path); c.execute("PRAGMA foreign_keys=ON"); c.executescript((schema_dir/"curation-v1.sql").read_text(encoding="utf-8")); c.execute("INSERT OR REPLACE INTO curation_meta(key,value) VALUES (?,?)",("last_opened_at",now())); c.commit(); return c

def seed_review_queue(curation,corpus,vault_sha):
 added=0
 for raw,n,count in corpus.execute("SELECT vault_genre_raw,vault_genre_norm,vault_track_count FROM genre_crosswalk_candidate WHERE match_status='unmatched' ORDER BY vault_track_count DESC,vault_genre_raw"):
  key="genre-crosswalk:"+hashlib.sha1(n.encode()).hexdigest()[:16]; evidence=json.dumps({"vault_track_count":count,"vault_sha256":vault_sha},ensure_ascii=False,sort_keys=True)
  cur=curation.execute("INSERT OR IGNORE INTO candidate_review(candidate_key,candidate_type,section_key,surface,normalized_surface,evidence_json) VALUES (?,?,?,?,?,?)",(key,"genre_crosswalk","genre",raw,n,evidence)); added+=cur.rowcount
 curation.commit(); return {"genre_crosswalk_candidates_added":added}

def apply_curation(k,c):
 cur=k.cursor(); counts=collections.Counter()
 cur.execute("INSERT OR IGNORE INTO provenance(provenance_key,source_kind,source_ref,notes) VALUES ('local-curation','curation','curation.sqlite','Durable local authoring state; never committed.')")
 def has(table,col,value): return cur.execute(f"SELECT 1 FROM {table} WHERE {col}=?",(value,)).fetchone() is not None
 for eid,etype,label,eslug,status,difficulty,updated in c.execute("SELECT entry_id,entry_type,canonical_label,canonical_slug,status,difficulty,updated_at FROM entry_patch ORDER BY entry_id"):
  if status=="deprecated": cur.execute("UPDATE knowledge_entry SET status='deprecated',updated_at=? WHERE id=?",(updated,eid)); counts["entries_deprecated"]+=cur.rowcount; continue
  if has("knowledge_entry","id",eid): cur.execute("UPDATE knowledge_entry SET entry_type=?,canonical_label=?,canonical_slug=?,status=?,difficulty=?,created_from='curated',updated_at=? WHERE id=?",(etype,label,eslug,status,difficulty,updated,eid))
  else: cur.execute("INSERT INTO knowledge_entry(id,entry_type,canonical_label,canonical_slug,status,difficulty,created_from,created_at,updated_at) VALUES (?,?,?,?,?,?,'curated',?,?)",(eid,etype,label,eslug,status,difficulty,updated,updated))
  counts["entries_applied"]+=1
 for eid,surface,snorm,locale,mkind,priority,primary,status in c.execute("SELECT entry_id,surface,surface_norm,locale,match_kind,match_priority,is_primary,status FROM term_variant_patch ORDER BY id"):
  if not has("knowledge_entry","id",eid): counts["term_variants_skipped_missing_entry"]+=1; continue
  if status=="deprecated": cur.execute("DELETE FROM term_variant WHERE entry_id=? AND locale=? AND surface_norm=?",(eid,locale,snorm)); continue
  cur.execute("INSERT INTO term_variant(entry_id,surface,surface_norm,locale,match_kind,match_priority,is_primary) VALUES (?,?,?,?,?,?,?) ON CONFLICT(entry_id,locale,surface_norm) DO UPDATE SET surface=excluded.surface,match_kind=excluded.match_kind,match_priority=excluded.match_priority,is_primary=excluded.is_primary",(eid,surface,snorm,locale,mkind,priority,primary)); counts["term_variants_applied"]+=1
 for row in c.execute("SELECT entry_id,locale,definition_kind,text,status,revision FROM definition_patch ORDER BY id"):
  if not has("knowledge_entry","id",row[0]): counts["definitions_skipped_missing_entry"]+=1; continue
  cur.execute("INSERT INTO definition(entry_id,locale,definition_kind,text,status,revision) VALUES (?,?,?,?,?,?) ON CONFLICT(entry_id,locale,definition_kind,revision) DO UPDATE SET text=excluded.text,status=excluded.status",row); counts["definitions_applied"]+=1
 for row in c.execute("SELECT entry_id,locale,context_type,context_key,text,status,revision FROM context_definition_patch ORDER BY id"):
  if not has("knowledge_entry","id",row[0]): counts["context_definitions_skipped_missing_entry"]+=1; continue
  cur.execute("INSERT INTO context_definition(entry_id,locale,context_type,context_key,text,status,revision) VALUES (?,?,?,?,?,?,?) ON CONFLICT(entry_id,locale,context_type,context_key,revision) DO UPDATE SET text=excluded.text,status=excluded.status",row); counts["context_definitions_applied"]+=1
 for source,rtype,target,strength,status in c.execute("SELECT source_entry_id,relation_type,target_entry_id,strength,status FROM relation_patch ORDER BY id"):
  if not has("knowledge_entry","id",source) or not has("knowledge_entry","id",target): counts["relations_skipped_missing_entry"]+=1; continue
  cur.execute("INSERT INTO knowledge_relation(source_entry_id,relation_type,target_entry_id,strength,status,provenance_key) VALUES (?,?,?,?,?,'local-curation') ON CONFLICT(source_entry_id,relation_type,target_entry_id) DO UPDATE SET strength=excluded.strength,status=excluded.status,provenance_key=excluded.provenance_key",(source,rtype,target,strength,status)); counts["relations_applied"]+=1
 for surface,snorm,target,role,kind,ordinal,status in c.execute("SELECT source_surface,source_norm,target_genre_id,target_role_hint,decision_kind,ordinal,status FROM genre_crosswalk_decision ORDER BY source_norm,ordinal"):
  if kind in ("ignore","defer") or status=="deprecated": continue
  if target and not has("genre","id",target): counts["genre_mappings_skipped_missing_target"]+=1; continue
  cur.execute("INSERT INTO genre_source_mapping(source_norm,source_surface,mapping_kind,target_genre_id,target_role_hint,ordinal,status,provenance_key) VALUES (?,?,?,?,?,?,?,'local-curation') ON CONFLICT(source_norm,ordinal) DO UPDATE SET source_surface=excluded.source_surface,mapping_kind=excluded.mapping_kind,target_genre_id=excluded.target_genre_id,target_role_hint=excluded.target_role_hint,status=excluded.status,provenance_key=excluded.provenance_key",(snorm,surface,kind,target,role,ordinal,status))
  if kind=="alias" and target: cur.execute("INSERT INTO genre_alias(alias_norm,alias_surface,genre_id,alias_kind,status,provenance_key) VALUES (?,?,?,'manual',?,'local-curation') ON CONFLICT(alias_norm) DO UPDATE SET alias_surface=excluded.alias_surface,genre_id=excluded.genre_id,alias_kind='manual',status=excluded.status,provenance_key='local-curation'",(snorm,surface,target,status))
  counts["genre_mappings_applied"]+=1
 for fid,label,eid,status in c.execute("SELECT id,label,knowledge_entry_id,status FROM instrument_family_patch ORDER BY id"):
  if status=="deprecated": cur.execute("DELETE FROM instrument_family WHERE id=?",(fid,)); continue
  if status=="candidate": continue
  if eid and not has("knowledge_entry","id",eid): eid=None
  cur.execute("INSERT INTO instrument_family(id,label,knowledge_entry_id) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET label=excluded.label,knowledge_entry_id=excluded.knowledge_entry_id",(fid,label,eid)); counts["instrument_families_applied"]+=1
 for iid,label,ln,fid,eid,status in c.execute("SELECT id,label,label_norm,family_id,knowledge_entry_id,status FROM instrument_patch ORDER BY id"):
  if status=="deprecated": cur.execute("UPDATE instrument SET status='deprecated' WHERE id=?",(iid,)); continue
  if fid and not has("instrument_family","id",fid): fid=None
  if eid and not has("knowledge_entry","id",eid): eid=None
  cur.execute("INSERT INTO instrument(id,label,label_norm,family_id,status,knowledge_entry_id,provenance_key) VALUES (?,?,?,?,?,?,'local-curation') ON CONFLICT(id) DO UPDATE SET label=excluded.label,label_norm=excluded.label_norm,family_id=excluded.family_id,status=excluded.status,knowledge_entry_id=excluded.knowledge_entry_id,provenance_key='local-curation'",(iid,label,ln,fid,status,eid)); counts["instruments_applied"]+=1
 for _,iid,surface,snorm,status in c.execute("SELECT id,instrument_id,alias_surface,alias_norm,status FROM instrument_alias_patch ORDER BY id"):
  if not has("instrument","id",iid): counts["instrument_aliases_skipped_missing_instrument"]+=1; continue
  if status=="deprecated": cur.execute("DELETE FROM instrument_alias WHERE alias_norm=?",(snorm,)); continue
  cur.execute("INSERT INTO instrument_alias(alias_norm,alias_surface,instrument_id,status) VALUES (?,?,?,?) ON CONFLICT(alias_norm) DO UPDATE SET alias_surface=excluded.alias_surface,instrument_id=excluded.instrument_id,status=excluded.status",(snorm,surface,iid,status)); counts["instrument_aliases_applied"]+=1
 for row in c.execute("SELECT id,section_key,label,canonical_slug,value_type,easy_visible,advanced_visible,allow_custom_text,knowledge_entry_id,sort_order,status FROM parameter_patch ORDER BY id"):
  pid,section,label,pslug,vtype,easy,adv,custom,eid,sort_order,status=row
  if status=="deprecated": cur.execute("DELETE FROM parameter WHERE id=?",(pid,)); continue
  if status=="candidate": continue
  if not has("prompt_section_definition","section_key",section): counts["parameters_skipped_missing_section"]+=1; continue
  if eid and not has("knowledge_entry","id",eid): eid=None
  cur.execute("INSERT INTO parameter(id,section_key,label,canonical_slug,value_type,easy_visible,advanced_visible,allow_custom_text,knowledge_entry_id,sort_order) VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET section_key=excluded.section_key,label=excluded.label,canonical_slug=excluded.canonical_slug,value_type=excluded.value_type,easy_visible=excluded.easy_visible,advanced_visible=excluded.advanced_visible,allow_custom_text=excluded.allow_custom_text,knowledge_entry_id=excluded.knowledge_entry_id,sort_order=excluded.sort_order",(pid,section,label,pslug,vtype,easy,adv,custom,eid,sort_order)); counts["parameters_applied"]+=1
 for row in c.execute("SELECT id,parameter_id,label,canonical_slug,output_fragment,knowledge_entry_id,easy_visible,advanced_visible,sort_order,status FROM parameter_option_patch ORDER BY id"):
  oid,pid,label,oslug,fragment,eid,easy,adv,sort_order,status=row
  if status=="deprecated": cur.execute("DELETE FROM parameter_option WHERE id=?",(oid,)); continue
  if not has("parameter","id",pid): counts["parameter_options_skipped_missing_parameter"]+=1; continue
  if eid and not has("knowledge_entry","id",eid): eid=None
  cur.execute("INSERT INTO parameter_option(id,parameter_id,label,canonical_slug,output_fragment,status,easy_visible,advanced_visible,knowledge_entry_id,sort_order) VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET parameter_id=excluded.parameter_id,label=excluded.label,canonical_slug=excluded.canonical_slug,output_fragment=excluded.output_fragment,status=excluded.status,easy_visible=excluded.easy_visible,advanced_visible=excluded.advanced_visible,knowledge_entry_id=excluded.knowledge_entry_id,sort_order=excluded.sort_order",(oid,pid,label,oslug,fragment,status,easy,adv,eid,sort_order)); counts["parameter_options_applied"]+=1
 for stid,section,label,out,mode,kind,status in c.execute("SELECT id,section_key,label,output_text,mode_scope,statement_kind,status FROM statement_patch ORDER BY id"):
  if status=="deprecated": cur.execute("DELETE FROM statement WHERE id=?",(stid,)); continue
  if not has("prompt_section_definition","section_key",section): counts["statements_skipped_missing_section"]+=1; continue
  cur.execute("INSERT INTO statement(id,section_key,label,output_text,status,mode_scope,statement_kind,provenance_key) VALUES (?,?,?,?,?,?,?,'local-curation') ON CONFLICT(id) DO UPDATE SET section_key=excluded.section_key,label=excluded.label,output_text=excluded.output_text,status=excluded.status,mode_scope=excluded.mode_scope,statement_kind=excluded.statement_kind,provenance_key='local-curation'",(stid,section,label,out,status,mode,kind)); counts["statements_applied"]+=1
 for stid,eid,role,ordinal in c.execute("SELECT statement_id,entry_id,role,ordinal FROM statement_concept_patch ORDER BY statement_id,ordinal"):
  if has("statement","id",stid) and has("knowledge_entry","id",eid): cur.execute("INSERT OR REPLACE INTO statement_concept(statement_id,entry_id,role,ordinal) VALUES (?,?,?,?)",(stid,eid,role,ordinal)); counts["statement_concepts_applied"]+=1
 for stid,oid,ordinal in c.execute("SELECT statement_id,option_id,ordinal FROM statement_option_patch ORDER BY statement_id,ordinal"):
  if has("statement","id",stid) and has("parameter_option","id",oid): cur.execute("INSERT OR REPLACE INTO statement_option(statement_id,option_id,ordinal) VALUES (?,?,?)",(stid,oid,ordinal)); counts["statement_options_applied"]+=1
 cur.execute("DELETE FROM knowledge_search")
 cur.execute("""INSERT INTO knowledge_search(entry_id,label,terms,definition)
 SELECT e.id,e.canonical_label,
 COALESCE((SELECT group_concat(tv.surface,' ') FROM term_variant tv WHERE tv.entry_id=e.id),''),
 trim(COALESCE((SELECT group_concat(d.text,' ') FROM definition d WHERE d.entry_id=e.id AND d.status='approved'),'') || ' ' || COALESCE((SELECT group_concat(cd.text,' ') FROM context_definition cd WHERE cd.entry_id=e.id AND cd.status='approved'),''))
 FROM knowledge_entry e WHERE e.status<>'deprecated'""")
 meta(k,{"curation_compiled_at":now(),"curation_schema":"curation-v1"}); k.commit(); return dict(counts)

def main():
 ap=argparse.ArgumentParser(); ap.add_argument("--vault",required=True,type=Path); ap.add_argument("--genre-map",required=True,type=Path); ap.add_argument("--out-dir",required=True,type=Path); ap.add_argument("--schema-dir",type=Path,default=Path(__file__).resolve().parents[2]/"schema"); ap.add_argument("--force",action="store_true",help="replace generated corpus/knowledge DBs; never deletes curation.sqlite"); ap.add_argument("--deep-token-index",action="store_true"); a=ap.parse_args()
 v=load(a.vault); g=load(a.genre_map)
 if v.get("schema")!=VAULT_SCHEMA or g.get("schema")!=GENRE_SCHEMA: raise SystemExit("Unsupported source schema; update importer explicitly.")
 a.out_dir.mkdir(parents=True,exist_ok=True); cp=a.out_dir/"corpus.sqlite"; kp=a.out_dir/"knowledge.sqlite"; xp=a.out_dir/"curation.sqlite"
 for p in (cp,kp):
  if p.exists():
   if not a.force: raise SystemExit(f"Generated output exists: {p}; use --force. curation.sqlite is preserved.")
   p.unlink()
 vc=sqlite3.connect(cp); kc=sqlite3.connect(kp); xc=init_curation(xp,a.schema_dir)
 try:
  schema(vc,a.schema_dir/"corpus-v1.sql"); schema(kc,a.schema_dir/"knowledge-v1.sql"); vs=sha(a.vault); gs=sha(a.genre_map)
  cprof=build_corpus(vc,v,g,a.vault,a.genre_map,vs,gs,a.deep_token_index); kprof=build_knowledge(kc,g,vc,gs)
  qprof=seed_review_queue(xc,vc,vs); oprof=apply_curation(kc,xc); xprof={**qprof,**oprof}; kprof["curation_overlay"]=oprof
  if vc.execute("PRAGMA integrity_check").fetchone()[0]!="ok" or kc.execute("PRAGMA integrity_check").fetchone()[0]!="ok" or xc.execute("PRAGMA integrity_check").fetchone()[0]!="ok": raise SystemExit("SQLite integrity check failed")
  report={"generated_at":now(),"corpus":cprof,"knowledge":kprof,"curation":xprof}; rp=a.out_dir/"reports"/"corpus-profile.json"; rp.parent.mkdir(parents=True,exist_ok=True); rp.write_text(json.dumps(report,indent=2,ensure_ascii=False),encoding="utf-8")
 finally: vc.close(); kc.close(); xc.close()
 print(json.dumps({"status":"ok","corpus_db":str(cp),"knowledge_db":str(kp),"curation_db":str(xp),"report":str(rp),"corpus":cprof,"knowledge":kprof,"curation":xprof},indent=2,ensure_ascii=False)); return 0
if __name__=="__main__": raise SystemExit(main())
