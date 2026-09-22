import hashlib
import json
import sqlite3
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXPORTER = ROOT / "scripts" / "data" / "export_runtime_v1.py"

MINIMAL_SCHEMA = """
CREATE TABLE build_meta(key TEXT PRIMARY KEY,value TEXT NOT NULL);
CREATE TABLE knowledge_entry(id TEXT PRIMARY KEY,entry_type TEXT,canonical_label TEXT,canonical_slug TEXT,status TEXT,difficulty TEXT,replaces_entry_id TEXT);
CREATE TABLE term_variant(entry_id TEXT,surface TEXT,surface_norm TEXT,locale TEXT,match_kind TEXT,match_priority INTEGER,is_primary INTEGER);
CREATE TABLE definition(entry_id TEXT,locale TEXT,definition_kind TEXT,text TEXT,status TEXT,revision INTEGER);
CREATE TABLE context_definition(entry_id TEXT,locale TEXT,context_type TEXT,context_key TEXT,text TEXT,status TEXT,revision INTEGER);
CREATE TABLE knowledge_relation(source_entry_id TEXT,relation_type TEXT,target_entry_id TEXT,strength REAL,status TEXT);
CREATE TABLE major_genre(id TEXT PRIMARY KEY,label TEXT,source_ordinal INTEGER,knowledge_entry_id TEXT);
CREATE TABLE genre(id TEXT PRIMARY KEY,label TEXT,label_norm TEXT,status TEXT,knowledge_entry_id TEXT);
CREATE TABLE genre_major(genre_id TEXT,major_genre_id TEXT,ordinal INTEGER);
CREATE TABLE genre_alias(alias_norm TEXT,alias_surface TEXT,genre_id TEXT,alias_kind TEXT,status TEXT);
CREATE TABLE genre_trait(genre_id TEXT,section_key TEXT,entry_id TEXT,role TEXT,evidence_count INTEGER,confidence REAL,status TEXT);
CREATE TABLE instrument_family(id TEXT PRIMARY KEY,label TEXT,knowledge_entry_id TEXT);
CREATE TABLE instrument(id TEXT PRIMARY KEY,label TEXT,label_norm TEXT,family_id TEXT,status TEXT,knowledge_entry_id TEXT);
CREATE TABLE instrument_alias(alias_norm TEXT,alias_surface TEXT,instrument_id TEXT,status TEXT);
CREATE TABLE instrument_trait(instrument_id TEXT,entry_id TEXT,trait_type TEXT,confidence REAL,status TEXT);
CREATE TABLE instrument_expression(id TEXT PRIMARY KEY,label TEXT,label_norm TEXT,output_text TEXT,source_kind TEXT,status TEXT,selectable INTEGER,base_instrument_id TEXT,occurrence_count INTEGER,track_count INTEGER,decomposition_state TEXT,semantic_coverage REAL,residual_json TEXT);
CREATE TABLE instrument_expression_instrument(expression_id TEXT,instrument_id TEXT,role TEXT,ordinal INTEGER);
CREATE TABLE instrument_expression_concept(expression_id TEXT,entry_id TEXT,role TEXT,ordinal INTEGER);
CREATE TABLE prompt_section_definition(section_key TEXT PRIMARY KEY,output_label TEXT,output_order INTEGER,optional INTEGER,easy_visible INTEGER,advanced_visible INTEGER,knowledge_entry_id TEXT,notes TEXT);
CREATE TABLE parameter(id TEXT PRIMARY KEY,section_key TEXT,label TEXT,canonical_slug TEXT,value_type TEXT,easy_visible INTEGER,advanced_visible INTEGER,allow_custom_text INTEGER,knowledge_entry_id TEXT,sort_order INTEGER);
CREATE TABLE parameter_option(id TEXT PRIMARY KEY,parameter_id TEXT,label TEXT,canonical_slug TEXT,output_fragment TEXT,status TEXT,easy_visible INTEGER,advanced_visible INTEGER,knowledge_entry_id TEXT,sort_order INTEGER);
CREATE TABLE statement(id TEXT PRIMARY KEY,section_key TEXT,label TEXT,output_text TEXT,status TEXT,mode_scope TEXT,statement_kind TEXT,source_frequency INTEGER);
CREATE TABLE statement_concept(statement_id TEXT,entry_id TEXT,role TEXT,ordinal INTEGER);
CREATE TABLE statement_option(statement_id TEXT,option_id TEXT,ordinal INTEGER);
CREATE TABLE renderer_profile(id TEXT PRIMARY KEY,label TEXT,version INTEGER,active INTEGER,max_characters INTEGER,overflow_policy TEXT,notes TEXT);
CREATE TABLE renderer_section(renderer_profile_id TEXT,section_key TEXT,output_label_override TEXT,output_order INTEGER,emit_when_empty INTEGER,soft_max_characters INTEGER,source_sample_count INTEGER);
CREATE TABLE exclude_entry(id TEXT PRIMARY KEY,label TEXT,output_text TEXT,status TEXT,knowledge_entry_id TEXT);
"""


class RuntimeExportV1Tests(unittest.TestCase):
    def make_db(self, path: Path, selectable: int = 1) -> None:
        conn = sqlite3.connect(path)
        conn.executescript(MINIMAL_SCHEMA)
        conn.execute("INSERT INTO build_meta VALUES('build_revision','test')")
        conn.execute(
            "INSERT INTO knowledge_entry VALUES(?,?,?,?,?,?,?)",
            ("k:clean", "descriptor", "Clean", "clean", "approved", "beginner", None),
        )
        conn.execute(
            "INSERT INTO term_variant VALUES(?,?,?,?,?,?,?)",
            ("k:clean", "clean", "clean", "en", "exact", 100, 1),
        )
        conn.execute(
            "INSERT INTO definition VALUES(?,?,?,?,?,?)",
            ("k:clean", "en", "plain", "Clear and undistorted.", "approved", 1),
        )
        conn.execute("INSERT INTO major_genre VALUES(?,?,?,?)", ("major:rock", "Rock", 1, None))
        conn.execute(
            "INSERT INTO genre VALUES(?,?,?,?,?)",
            ("genre:rock", "Rock", "rock", "approved", None),
        )
        conn.execute("INSERT INTO genre_major VALUES(?,?,?)", ("genre:rock", "major:rock", 1))
        conn.execute(
            "INSERT INTO instrument_family VALUES(?,?,?)", ("family:guitar", "Guitars", None)
        )
        conn.execute(
            "INSERT INTO instrument VALUES(?,?,?,?,?,?)",
            (
                "instrument:electric-guitar",
                "Electric Guitar",
                "electric guitar",
                "family:guitar",
                "approved",
                None,
            ),
        )
        conn.execute(
            "INSERT INTO instrument_expression VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)",
            (
                "expr:clean-guitar",
                "clean electric guitar",
                "clean electric guitar",
                "clean electric guitar",
                "factory",
                "source",
                selectable,
                "instrument:electric-guitar",
                3,
                2,
                "identity",
                1.0,
                "[]",
            ),
        )
        conn.execute(
            "INSERT INTO instrument_expression_instrument VALUES(?,?,?,?)",
            ("expr:clean-guitar", "instrument:electric-guitar", "identity", 0),
        )
        conn.execute(
            "INSERT INTO instrument_expression_concept VALUES(?,?,?,?)",
            ("expr:clean-guitar", "k:clean", "tone", 0),
        )
        conn.execute(
            "INSERT INTO prompt_section_definition VALUES(?,?,?,?,?,?,?,?)",
            ("genre", "Genre", 1, 1, 1, 1, None, None),
        )
        conn.execute(
            "INSERT INTO renderer_profile VALUES(?,?,?,?,?,?,?)",
            ("suno-structured-v1", "Suno Structured v1", 1, 1, 1000, "semantic-budget", None),
        )
        conn.execute(
            "INSERT INTO renderer_section VALUES(?,?,?,?,?,?,?)",
            ("suno-structured-v1", "genre", None, 1, 0, 56, 2),
        )
        conn.execute(
            "INSERT INTO parameter VALUES(?,?,?,?,?,?,?,?,?,?)",
            ("p:tone", "genre", "Tone", "tone", "enum", 1, 1, 0, None, 1),
        )
        conn.execute(
            "INSERT INTO parameter_option VALUES(?,?,?,?,?,?,?,?,?,?)",
            ("o:clean", "p:tone", "Clean", "clean", "clean", "approved", 1, 1, "k:clean", 1),
        )
        conn.execute(
            "INSERT INTO statement VALUES(?,?,?,?,?,?,?,?)",
            ("s:clean", "genre", "Clean", "clean", "approved", "both", "word", 3),
        )
        conn.execute(
            "INSERT INTO statement_concept VALUES(?,?,?,?)", ("s:clean", "k:clean", "tone", 0)
        )
        conn.execute("INSERT INTO statement_option VALUES(?,?,?)", ("s:clean", "o:clean", 0))
        conn.execute(
            "INSERT INTO exclude_entry VALUES(?,?,?,?,?)", ("x:mud", "Mud", "mud", "approved", None)
        )
        conn.commit()
        conn.close()

    def run_exporter(self, db: Path, out: Path, *extra: str, check: bool = True):
        return subprocess.run(
            [sys.executable, str(EXPORTER), "--knowledge", str(db), "--out-dir", str(out), *extra],
            cwd=ROOT,
            check=check,
            capture_output=True,
            text=True,
        )

    def test_plan_export_and_noop_rerun(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            db = root / "knowledge.sqlite"
            out = root / "runtime-v1"
            self.make_db(db)

            planned = self.run_exporter(db, out, "--plan")
            self.assertFalse(out.exists())
            plan_payload = json.loads(planned.stdout)
            self.assertEqual(plan_payload["counts"]["instrument_expressions"], 1)
            self.assertGreater(plan_payload["editor_foundation_counts"]["parameters"], 0)
            self.assertGreater(plan_payload["editor_foundation_counts"]["statements"], 0)

            result = self.run_exporter(db, out)
            self.assertEqual(json.loads(result.stdout)["status"], "ok")
            manifest = json.loads((out / "manifest.json").read_text(encoding="utf-8"))
            self.assertEqual(manifest["schema"], "vgine-runtime-pack-v1")
            self.assertEqual(
                len(manifest["editor_foundation_sha256"]),
                64,
            )
            self.assertEqual(manifest["files"]["instrument-expressions.json"]["counts"]["expressions"], 1)

            editor = json.loads((out / "editor.json").read_text(encoding="utf-8"))
            expected_facets = {
                "era",
                "bpm",
                "key_mode",
                "groove",
                "melody",
                "harmony",
                "drums",
                "bass",
                "exciters",
                "texture",
                "vocal",
                "dynamics",
                "space_mix",
                "production",
                "structure",
            }
            self.assertEqual(
                {row["section_key"] for row in editor["parameters"] if row["id"].startswith("product:")},
                expected_facets,
            )
            self.assertEqual(
                {row["section_key"] for row in editor["statements"] if row["id"].startswith("product:")},
                expected_facets,
            )
            bpm = next(
                row
                for row in editor["parameters"]
                if row["id"] == "product:parameter:bpm:tempo"
            )
            self.assertEqual(bpm["value_type"], "number")
            self.assertEqual(bpm["ui"]["min"], 40)
            self.assertEqual(bpm["ui"]["max"], 220)
            self.assertIn(96, bpm["ui"]["recommended_values"])

            expressions = json.loads(
                (out / "instrument-expressions.json").read_text(encoding="utf-8")
            )["expressions"]
            self.assertEqual(expressions[0]["output_text"], "clean electric guitar")
            self.assertEqual(
                expressions[0]["instruments"][0]["instrument_id"], "instrument:electric-guitar"
            )
            self.assertEqual(expressions[0]["concepts"][0]["entry_id"], "k:clean")

            rerun = self.run_exporter(db, out)
            self.assertEqual(json.loads(rerun.stdout)["status"], "up-to-date")

    def test_database_editor_rows_overlay_matching_product_foundation_ids(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            db = root / "knowledge.sqlite"
            out = root / "runtime-v1"
            self.make_db(db)

            conn = sqlite3.connect(db)
            conn.execute(
                "INSERT INTO parameter VALUES(?,?,?,?,?,?,?,?,?,?)",
                (
                    "product:parameter:groove:pocket",
                    "groove",
                    "Pocket (reviewed override)",
                    "pocket",
                    "enum",
                    0,
                    1,
                    0,
                    None,
                    7,
                ),
            )
            conn.execute(
                "INSERT INTO parameter_option VALUES(?,?,?,?,?,?,?,?,?,?)",
                (
                    "product:option:groove:pocket:laid-back",
                    "product:parameter:groove:pocket",
                    "Laid-back reviewed",
                    "laid-back",
                    "reviewed laid-back pocket",
                    "approved",
                    0,
                    1,
                    None,
                    7,
                ),
            )
            conn.commit()
            conn.close()

            self.run_exporter(db, out)
            editor = json.loads((out / "editor.json").read_text(encoding="utf-8"))

            parameter = next(
                row
                for row in editor["parameters"]
                if row["id"] == "product:parameter:groove:pocket"
            )
            option = next(
                row
                for row in editor["parameter_options"]
                if row["id"] == "product:option:groove:pocket:laid-back"
            )

            self.assertEqual(parameter["label"], "Pocket (reviewed override)")
            self.assertEqual(parameter["sort_order"], 7)
            self.assertEqual(option["label"], "Laid-back reviewed")
            self.assertEqual(option["output_fragment"], "reviewed laid-back pocket")

    def test_rejects_nonselectable_source_expression(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            db = root / "knowledge.sqlite"
            self.make_db(db, selectable=0)
            result = self.run_exporter(db, root / "runtime-v1", check=False)
            self.assertEqual(result.returncode, 2)
            self.assertIn("source instrument-expression invariant failed", result.stderr)

    def test_stale_work_state_fails_closed(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            db = root / "knowledge.sqlite"
            out = root / "runtime-v1"
            self.make_db(db)
            work = root / "runtime-v1.work"
            work.mkdir()
            stale_sha = "0" * 64
            (work / "state.json").write_text(
                json.dumps(
                    {
                        "schema": "vgine-runtime-pack-v1",
                        "schema_version": 1,
                        "knowledge_db_sha256": stale_sha,
                        "completed": {},
                    }
                ),
                encoding="utf-8",
            )
            result = self.run_exporter(db, out, check=False)
            self.assertEqual(result.returncode, 2)
            self.assertIn("stale runtime export work state", result.stderr)

            recovered = self.run_exporter(db, out, "--reset-incomplete")
            self.assertEqual(json.loads(recovered.stdout)["status"], "ok")

    def test_rebuild_retains_previous_promoted_pack(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            db = root / "knowledge.sqlite"
            out = root / "runtime-v1"
            self.make_db(db)
            self.run_exporter(db, out)
            first_manifest = (out / "manifest.json").read_bytes()

            conn = sqlite3.connect(db)
            conn.execute("UPDATE build_meta SET value='test-2' WHERE key='build_revision'")
            conn.commit()
            conn.close()
            self.run_exporter(db, out)

            previous = root / "runtime-v1.previous"
            self.assertTrue(previous.is_dir())
            self.assertEqual((previous / "manifest.json").read_bytes(), first_manifest)
            self.assertNotEqual(
                hashlib.sha256((previous / "manifest.json").read_bytes()).hexdigest(),
                hashlib.sha256((out / "manifest.json").read_bytes()).hexdigest(),
            )


if __name__ == "__main__":
    unittest.main()
