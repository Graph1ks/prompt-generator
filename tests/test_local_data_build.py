import gzip, json, sqlite3, subprocess, sys, tempfile, unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
BUILDER=ROOT/"scripts"/"data"/"build_local_data.py"
VAULT={"schema":"graph1ks-prompt-control-deck-v1","version":"test","exported_at":"2026-01-01T00:00:00Z","vault":{},"tracks":[
 {"id":1,"title":"One","genre":"Boom Bap","bpm":90,"emotion":"focused","style":"test","year":1995,"key":"C minor","reference_artist":None,"reference_song":None,
  "structured_prompt":"[Genre: Boom Bap]\n[BPM: 90]\n[Key/Mode: C minor]\n[Groove: laid-back swing, firm backbeat]\n[Drums: dry snare, rounded kick]\n[Bass: warm electric bass, short attack]\n[Space/Mix: dry center, controlled low end]",
  "negative_prompt":"vocals, huge reverb","instrumental_arrangement":"[Intro: four bars]","used":True,"favorite":False},
 {"id":2,"title":"Two","genre":"Dark Jazz","bpm":76,"emotion":"dark","style":"test","year":2024,"key":"D minor","reference_artist":None,"reference_song":None,
  "structured_prompt":"[Genre: Dark Jazz]\n[Era: modern studio production]\n[BPM: 76]\n[Key/Mode: D minor]\n[Melody: muted trumpet carries a short motif]\n[Harmony: suspended minor harmony]\n[Texture: subtle tape grit]\n[Production: softened transients]",
  "negative_prompt":"bright supersaws, trap hats","instrumental_arrangement":"[Intro: four bars]","used":False,"favorite":True}
]}
GENRES={"schema":"graph1ks-genre-map-v2","taxonomy":"GRAPH1KS_24","taxonomy_version":1,"generated_at":"2026-01-01T00:00:00Z","major_genres":["Hip-Hop / Rap","Jazz"],"genres":[
 {"genre":"Boom Bap","track_count":1,"major_genres":["Hip-Hop / Rap"]},{"genre":"Dark Jazz","track_count":1,"major_genres":["Jazz"]}]}

class LocalDataBuildTests(unittest.TestCase):
 def build(self,tmp):
  vault=tmp/"vault.json.gz"; genres=tmp/"genres.json"; out=tmp/"out"
  with gzip.open(vault,"wt",encoding="utf-8") as f: json.dump(VAULT,f)
  genres.write_text(json.dumps(GENRES),encoding="utf-8")
  subprocess.run([sys.executable,str(BUILDER),"--vault",str(vault),"--genre-map",str(genres),"--out-dir",str(out),"--force"],cwd=ROOT,check=True,capture_output=True,text=True)
  return out
 def test_build_contract(self):
  with tempfile.TemporaryDirectory() as td:
   out=self.build(Path(td))
   c=sqlite3.connect(out/"corpus.sqlite"); k=sqlite3.connect(out/"knowledge.sqlite"); x=sqlite3.connect(out/"curation.sqlite")
   try:
    self.assertEqual(c.execute("select count(*) from track").fetchone()[0],2)
    self.assertEqual(k.execute("select count(*) from genre").fetchone()[0],2)
    self.assertEqual(k.execute("select count(*) from prompt_section_definition where lower(output_label)='exclude'").fetchone()[0],0)
    self.assertEqual(x.execute("select value from curation_meta where key='schema_version'").fetchone()[0],"curation-v1")
   finally: c.close(); k.close(); x.close()
 def test_curation_survives_and_compiles(self):
  with tempfile.TemporaryDirectory() as td:
   tmp=Path(td); out=self.build(tmp); x=sqlite3.connect(out/"curation.sqlite"); stamp="2026-01-01T00:00:00Z"
   try:
    x.execute("insert into entry_patch(entry_id,entry_type,canonical_label,canonical_slug,status,difficulty,revision,updated_at) values (?,?,?,?,?,?,?,?)",("concept:grit","production_term","Grit","grit","approved","beginner",1,stamp))
    x.execute("insert into definition_patch(id,entry_id,locale,definition_kind,text,status,revision,updated_at) values (?,?,?,?,?,?,?,?)",("def:grit","concept:grit","en","one_liner","Audible roughness or dirt in a sound.","approved",1,stamp)); x.commit()
   finally: x.close()
   self.build(tmp)
   x=sqlite3.connect(out/"curation.sqlite"); k=sqlite3.connect(out/"knowledge.sqlite")
   try:
    self.assertEqual(x.execute("select canonical_label from entry_patch where entry_id='concept:grit'").fetchone()[0],"Grit")
    self.assertEqual(k.execute("select canonical_label from knowledge_entry where id='concept:grit'").fetchone()[0],"Grit")
    self.assertEqual(k.execute("select text from definition where entry_id='concept:grit'").fetchone()[0],"Audible roughness or dirt in a sound.")
   finally: x.close(); k.close()

if __name__=="__main__": unittest.main()
