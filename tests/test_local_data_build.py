import copy
import gzip
import json
import sqlite3
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BUILDER = ROOT / "scripts" / "data" / "build_local_data.py"
V1_BUILDER = ROOT / "scripts" / "data" / "local_data_v1_core.py"
DATABASE_FINALIZER = ROOT / "scripts" / "data" / "database_foundation_session.py"

VAULT = {
    "schema": "graph1ks-prompt-control-deck-v1",
    "version": "test",
    "exported_at": "2026-01-01T00:00:00Z",
    "vault": {},
    "tracks": [
        {
            "id": 1,
            "title": "One",
            "genre": "Boom Bap",
            "bpm": 90,
            "emotion": "focused",
            "style": "test",
            "year": 1995,
            "key": "C minor",
            "reference_artist": None,
            "reference_song": None,
            "structured_prompt": "[Genre: Boom Bap]\n[BPM: 90]\n[Key/Mode: C minor]\n[Groove: laid-back swing, firm backbeat]\n[Drums: dry snare, rounded kick]\n[Bass: warm electric bass, short attack]\n[Instruments: electric guitar, clean rhythm guitar, piano]\n[Space/Mix: dry center, controlled low end]",
            "negative_prompt": "vocals, huge reverb",
            "instrumental_arrangement": "[Intro: four bars]",
            "used": True,
            "favorite": False,
        },
        {
            "id": 2,
            "title": "Two",
            "genre": "Dark Jazz",
            "bpm": 76,
            "emotion": "dark",
            "style": "test",
            "year": 2024,
            "key": "D minor",
            "reference_artist": None,
            "reference_song": None,
            "structured_prompt": "[Genre: Dark Jazz]\n[Era: modern studio production]\n[BPM: 76]\n[Key/Mode: D minor]\n[Melody: muted trumpet carries a short motif]\n[Harmony: suspended minor harmony]\n[Instruments: muted trumpet, restrained strings, warm pad]\n[Texture: subtle tape grit]\n[Production: softened transients]",
            "negative_prompt": "bright supersaws, trap hats",
            "instrumental_arrangement": "[Intro: four bars]",
            "used": False,
            "favorite": True,
        },
    ],
}

GENRES = {
    "schema": "graph1ks-genre-map-v2",
    "taxonomy": "GRAPH1KS_24",
    "taxonomy_version": 1,
    "generated_at": "2026-01-01T00:00:00Z",
    "major_genres": ["Hip-Hop / Rap", "Jazz"],
    "genres": [
        {"genre": "Boom Bap", "track_count": 1, "major_genres": ["Hip-Hop / Rap"]},
        {"genre": "Dark Jazz", "track_count": 1, "major_genres": ["Jazz"]},
    ],
}


class LocalDataBuildTests(unittest.TestCase):
    def write_sources(self, tmp: Path, vault_data=None):
        vault = tmp / "vault.json.gz"
        genres = tmp / "genres.json"
        if vault_data is not None or not vault.exists():
            with gzip.open(vault, "wt", encoding="utf-8") as f:
                json.dump(vault_data or VAULT, f)
        if not genres.exists():
            genres.write_text(json.dumps(GENRES), encoding="utf-8")
        return vault, genres

    def run_builder(self, tmp: Path, extra=None, vault_data=None, check=True):
        vault, genres = self.write_sources(tmp, vault_data)
        out = tmp / "out"
        cmd = [
            sys.executable,
            str(BUILDER),
            "--vault",
            str(vault),
            "--genre-map",
            str(genres),
            "--out-dir",
            str(out),
            "--batch-size",
            "1",
            *(extra or []),
        ]
        result = subprocess.run(cmd, cwd=ROOT, check=check, capture_output=True, text=True)
        return out, result

    def test_build_contract(self):
        with tempfile.TemporaryDirectory() as td:
            out, result = self.run_builder(Path(td))
            self.assertEqual(result.returncode, 0)
            c = sqlite3.connect(out / "corpus.sqlite")
            k = sqlite3.connect(out / "knowledge.sqlite")
            x = sqlite3.connect(out / "curation.sqlite")
            try:
                self.assertEqual(c.execute("select count(*) from track").fetchone()[0], 2)
                self.assertEqual(c.execute("select count(*) from token_occurrence").fetchone()[0] > 0, True)
                self.assertEqual(k.execute("select count(*) from genre").fetchone()[0], 2)
                self.assertEqual(
                    k.execute("select count(*) from instrument_expression").fetchone()[0],
                    6,
                )
                self.assertEqual(
                    k.execute("select count(*) from instrument_expression where selectable=1 and status='source'").fetchone()[0],
                    6,
                )
                self.assertEqual(
                    k.execute("select output_text from instrument_expression where label_norm='clean rhythm guitar'").fetchone()[0],
                    "clean rhythm guitar",
                )
                self.assertEqual(
                    k.execute("select count(*) from prompt_section_definition where lower(output_label)='exclude'").fetchone()[0],
                    0,
                )
                self.assertEqual(
                    x.execute("select value from curation_meta where key='schema_version'").fetchone()[0],
                    "curation-v1",
                )
            finally:
                c.close()
                k.close()
                x.close()

    def test_curation_survives_and_recompiles(self):
        with tempfile.TemporaryDirectory() as td:
            tmp = Path(td)
            out, _ = self.run_builder(tmp)
            x = sqlite3.connect(out / "curation.sqlite")
            stamp = "2026-01-01T00:00:00Z"
            try:
                x.execute(
                    "insert into entry_patch(entry_id,entry_type,canonical_label,canonical_slug,status,difficulty,revision,updated_at) values (?,?,?,?,?,?,?,?)",
                    ("concept:grit", "production_term", "Grit", "grit", "approved", "beginner", 1, stamp),
                )
                x.execute(
                    "insert into definition_patch(id,entry_id,locale,definition_kind,text,status,revision,updated_at) values (?,?,?,?,?,?,?,?)",
                    (
                        "def:grit",
                        "concept:grit",
                        "en",
                        "one_liner",
                        "Audible roughness or dirt in a sound.",
                        "approved",
                        1,
                        stamp,
                    ),
                )
                x.commit()
            finally:
                x.close()

            _, result = self.run_builder(tmp)
            self.assertEqual(result.returncode, 0)
            x = sqlite3.connect(out / "curation.sqlite")
            k = sqlite3.connect(out / "knowledge.sqlite")
            try:
                self.assertEqual(
                    x.execute("select canonical_label from entry_patch where entry_id='concept:grit'").fetchone()[0],
                    "Grit",
                )
                self.assertEqual(
                    k.execute("select canonical_label from knowledge_entry where id='concept:grit'").fetchone()[0],
                    "Grit",
                )
                self.assertEqual(
                    k.execute("select text from definition where entry_id='concept:grit'").fetchone()[0],
                    "Audible roughness or dirt in a sound.",
                )
            finally:
                x.close()
                k.close()

    def test_pause_and_ordinary_rerun_resume(self):
        with tempfile.TemporaryDirectory() as td:
            tmp = Path(td)
            out, paused = self.run_builder(tmp, ["--test-stop-after-batches", "1"], check=False)
            self.assertEqual(paused.returncode, 75)
            self.assertFalse((out / "corpus.sqlite").exists())
            state = sqlite3.connect(out / ".build-v2" / "state.sqlite")
            try:
                row = state.execute("select status,processed,total from build_stage where name='ingest_tracks'").fetchone()
                self.assertEqual(row[0], "paused")
                self.assertEqual(row[1], 1)
                self.assertEqual(row[2], 2)
            finally:
                state.close()

            _, resumed = self.run_builder(tmp)
            self.assertEqual(resumed.returncode, 0)
            c = sqlite3.connect(out / "corpus.sqlite")
            try:
                self.assertEqual(c.execute("select count(*) from track").fetchone()[0], 2)
            finally:
                c.close()

    def test_stale_checkpoint_is_rejected(self):
        with tempfile.TemporaryDirectory() as td:
            tmp = Path(td)
            out, paused = self.run_builder(tmp, ["--test-stop-after-batches", "1"], check=False)
            self.assertEqual(paused.returncode, 75)
            changed = copy.deepcopy(VAULT)
            changed["tracks"][1]["title"] = "Changed source"
            _, rejected = self.run_builder(tmp, vault_data=changed, check=False)
            self.assertNotEqual(rejected.returncode, 0)
            self.assertIn("different source/build fingerprints", rejected.stderr)
            self.assertTrue((out / ".build-v2" / "state.sqlite").exists())

    def test_reset_work_never_deletes_promoted_or_curation(self):
        with tempfile.TemporaryDirectory() as td:
            tmp = Path(td)
            out, _ = self.run_builder(tmp)
            curation = sqlite3.connect(out / "curation.sqlite")
            try:
                curation.execute(
                    "insert into curation_meta(key,value) values ('test_marker','keep-me') on conflict(key) do update set value=excluded.value"
                )
                curation.commit()
            finally:
                curation.close()

            result = subprocess.run(
                [sys.executable, str(BUILDER), "--out-dir", str(out), "--reset-work"],
                cwd=ROOT,
                check=True,
                capture_output=True,
                text=True,
            )
            self.assertIn("were not touched", result.stdout)
            self.assertTrue((out / "corpus.sqlite").exists())
            self.assertTrue((out / "knowledge.sqlite").exists())
            self.assertTrue((out / "curation.sqlite").exists())
            self.assertFalse((out / ".build-v2").exists())
            curation = sqlite3.connect(out / "curation.sqlite")
            try:
                self.assertEqual(
                    curation.execute("select value from curation_meta where key='test_marker'").fetchone()[0],
                    "keep-me",
                )
            finally:
                curation.close()


    def test_existing_v1_build_is_adopted_without_data_loss(self):
        with tempfile.TemporaryDirectory() as td:
            tmp = Path(td)
            vault, genres = self.write_sources(tmp)
            out = tmp / "out"
            subprocess.run(
                [
                    sys.executable,
                    str(V1_BUILDER),
                    "--vault",
                    str(vault),
                    "--genre-map",
                    str(genres),
                    "--out-dir",
                    str(out),
                    "--force",
                ],
                cwd=ROOT,
                check=True,
                capture_output=True,
                text=True,
            )
            old_corpus_hash = __import__("hashlib").sha256((out / "corpus.sqlite").read_bytes()).hexdigest()
            result = subprocess.run(
                [
                    sys.executable,
                    str(BUILDER),
                    "--vault",
                    str(vault),
                    "--genre-map",
                    str(genres),
                    "--out-dir",
                    str(out),
                    "--batch-size",
                    "1",
                ],
                cwd=ROOT,
                check=True,
                capture_output=True,
                text=True,
            )
            self.assertIn('"status": "ok"', result.stdout)
            new_corpus_hash = __import__("hashlib").sha256((out / "corpus.sqlite").read_bytes()).hexdigest()
            self.assertEqual(old_corpus_hash, new_corpus_hash)
            self.assertTrue((out / "knowledge.previous.sqlite").exists())
            self.assertFalse((out / "corpus.previous.sqlite").exists())
            c = sqlite3.connect(out / "corpus.sqlite")
            k = sqlite3.connect(out / "knowledge.sqlite")
            try:
                self.assertEqual(c.execute("select count(*) from track").fetchone()[0], 2)
                self.assertEqual(
                    k.execute("select value from build_meta where key='build_revision'").fetchone()[0],
                    "promptvgine-local-data-build-v2-resumable-3-prompt-budget",
                )
            finally:
                c.close()
                k.close()

    def test_rebuild_retains_previous_promoted_corpus(self):
        with tempfile.TemporaryDirectory() as td:
            tmp = Path(td)
            out, _ = self.run_builder(tmp)
            old_bytes = (out / "corpus.sqlite").read_bytes()
            vault, genres = self.write_sources(tmp)
            result = subprocess.run(
                [
                    sys.executable,
                    str(BUILDER),
                    "--vault",
                    str(vault),
                    "--genre-map",
                    str(genres),
                    "--out-dir",
                    str(out),
                    "--batch-size",
                    "1",
                    "--rebuild-corpus",
                ],
                cwd=ROOT,
                check=True,
                capture_output=True,
                text=True,
            )
            self.assertIn('"status": "ok"', result.stdout)
            self.assertTrue((out / "corpus.previous.sqlite").exists())
            self.assertEqual((out / "corpus.previous.sqlite").read_bytes(), old_bytes)

    def test_completed_checkpoint_auto_advances_build_revision_without_reset(self):
        with tempfile.TemporaryDirectory() as td:
            tmp = Path(td)
            out, first = self.run_builder(tmp)
            self.assertEqual(first.returncode, 0)
            corpus_before = (out / "corpus.sqlite").read_bytes()

            state = sqlite3.connect(out / ".build-v2" / "state.sqlite")
            try:
                state.execute(
                    "update build_meta set value=? where key='build_revision'",
                    ("promptvgine-local-data-build-v2-resumable-1",),
                )
                state.execute(
                    "update build_meta set value='complete' where key='status'"
                )
                state.commit()
            finally:
                state.close()

            knowledge = sqlite3.connect(out / "knowledge.sqlite")
            try:
                knowledge.execute(
                    "update build_meta set value=? where key='build_revision'",
                    ("promptvgine-local-data-build-v2-resumable-1",),
                )
                knowledge.commit()
            finally:
                knowledge.close()

            _, result = self.run_builder(tmp)
            self.assertEqual(
                result.returncode,
                0,
                msg=f"stdout:\n{result.stdout}\nstderr:\n{result.stderr}",
            )
            self.assertEqual((out / "corpus.sqlite").read_bytes(), corpus_before)
            self.assertTrue((out / "knowledge.previous.sqlite").exists())

            state = sqlite3.connect(out / ".build-v2" / "state.sqlite")
            try:
                self.assertEqual(
                    state.execute(
                        "select value from build_meta where key='build_revision'"
                    ).fetchone()[0],
                    "promptvgine-local-data-build-v2-resumable-3-prompt-budget",
                )
            finally:
                state.close()

    def test_database_foundation_finalize_is_bundled_and_reports_complete_expressions(self):
        with tempfile.TemporaryDirectory() as td:
            tmp = Path(td)
            vault, genres = self.write_sources(tmp)
            out = tmp / "out"
            result = subprocess.run(
                [
                    sys.executable,
                    str(DATABASE_FINALIZER),
                    "finalize",
                    "--out-dir",
                    str(out),
                    "--vault",
                    str(vault),
                    "--genre-map",
                    str(genres),
                ],
                cwd=ROOT,
                check=False,
                capture_output=True,
                text=True,
            )
            self.assertEqual(
                result.returncode,
                0,
                msg=f"stdout:\n{result.stdout}\nstderr:\n{result.stderr}",
            )
            self.assertEqual(
                len([line for line in result.stdout.splitlines() if line.strip()]),
                1,
            )
            self.assertIn("[database-foundation] OK", result.stdout)
            report_path = (
                out
                / "reports"
                / "database"
                / "database-foundation-acceptance-v1.json"
            )
            self.assertTrue(report_path.is_file())
            report = json.loads(report_path.read_text(encoding="utf-8"))
            self.assertEqual(report["status"], "ok")
            self.assertEqual(report["corpus"]["source_instrument_expressions"], 6)
            self.assertEqual(report["knowledge"]["instrument_expressions"], 6)
            self.assertEqual(
                report["knowledge"]["selectable_instrument_expressions"], 6
            )
            self.assertTrue(
                report["invariants"]["all_source_expressions_materialized"]
            )
            self.assertTrue(
                report["invariants"]["all_source_expressions_selectable"]
            )
            self.assertTrue(
                report["invariants"]["all_source_output_text_preserved"]
            )
            self.assertTrue(
                (out / "reports" / "01-build.stdout.txt").is_file()
            )
            self.assertTrue(
                (out / "reports" / "03-knowledge-mining.stdout.txt").is_file()
            )

    def test_renderer_profile_carries_source_derived_character_budget(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            out, result = self.run_builder(root)
            self.assertEqual(result.returncode, 0, msg=result.stderr)
            knowledge = sqlite3.connect(out / "knowledge.sqlite")
            try:
                profile = knowledge.execute(
                    "SELECT max_characters,overflow_policy FROM renderer_profile "
                    "WHERE id='suno-structured-v1'"
                ).fetchone()
                self.assertEqual(profile, (1000, "semantic-budget"))
                sections = {
                    key: (soft, samples)
                    for key, soft, samples in knowledge.execute(
                        "SELECT section_key,soft_max_characters,source_sample_count "
                        "FROM renderer_section WHERE renderer_profile_id='suno-structured-v1'"
                    )
                }
                self.assertEqual(sections["melody"], (110, 10043))
                self.assertEqual(sections["instruments"], (107, 9882))
                self.assertEqual(sections["production"], (120, 4459))
                self.assertEqual(sections["vocal"], (None, 0))
            finally:
                knowledge.close()

    def test_source_prompt_over_1000_characters_fails_preflight(self):
        with tempfile.TemporaryDirectory() as td:
            tmp = Path(td)
            changed = copy.deepcopy(VAULT)
            changed["tracks"][0]["structured_prompt"] = "[Genre: " + ("x" * 992) + "]"
            self.assertGreater(len(changed["tracks"][0]["structured_prompt"]), 1000)
            _, result = self.run_builder(tmp, vault_data=changed, check=False)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("1000-character limit", result.stderr)

    def test_plan_is_read_only(self):
        with tempfile.TemporaryDirectory() as td:
            tmp = Path(td)
            vault, genres = self.write_sources(tmp)
            out = tmp / "out"
            result = subprocess.run(
                [
                    sys.executable,
                    str(BUILDER),
                    "--vault",
                    str(vault),
                    "--genre-map",
                    str(genres),
                    "--out-dir",
                    str(out),
                    "--plan",
                ],
                cwd=ROOT,
                check=True,
                capture_output=True,
                text=True,
            )
            self.assertIn('"read_only": true', result.stdout)
            self.assertFalse(out.exists())


if __name__ == "__main__":
    unittest.main()
