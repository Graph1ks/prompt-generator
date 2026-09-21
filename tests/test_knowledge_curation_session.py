import gzip
import hashlib
import json
import sqlite3
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BUILDER = ROOT / "scripts" / "data" / "build_local_data.py"
MINER = ROOT / "scripts" / "data" / "knowledge_mining_session.py"
APPLY = ROOT / "scripts" / "data" / "knowledge_curation_session.py"

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
            "structured_prompt": (
                "[Genre: Boom Bap]\n"
                "[BPM: 90]\n"
                "[Groove: laid-back swing, firm backbeat]\n"
                "[Drums: dry snare, rounded kick]\n"
                "[Bass: electric bass, short roots]\n"
                "[Instruments: clean rhythm electric guitar, electric guitar, piano, tenor sax]\n"
                "[Production: softened transients, dry center]"
            ),
            "negative_prompt": "vocals",
            "instrumental_arrangement": "[Intro: four bars]",
            "used": False,
            "favorite": False,
        },
        {
            "id": 2,
            "title": "Two",
            "genre": "Boom Bap",
            "bpm": 92,
            "emotion": "focused",
            "style": "test",
            "year": 1996,
            "key": "D minor",
            "reference_artist": None,
            "reference_song": None,
            "structured_prompt": (
                "[Genre: Boom Bap]\n"
                "[BPM: 92]\n"
                "[Groove: loose swing, firm backbeat]\n"
                "[Drums: dry snare, soft kick]\n"
                "[Bass: electric bass, short roots]\n"
                "[Instruments: piano, electric guitar, trumpet]\n"
                "[Production: controlled transients, dry center]"
            ),
            "negative_prompt": "vocals",
            "instrumental_arrangement": "[Intro: four bars]",
            "used": False,
            "favorite": False,
        },
    ],
}
GENRES = {
    "schema": "graph1ks-genre-map-v2",
    "taxonomy": "GRAPH1KS_24",
    "taxonomy_version": 1,
    "generated_at": "2026-01-01T00:00:00Z",
    "major_genres": ["Hip-Hop / Rap"],
    "genres": [
        {"genre": "Boom Bap", "track_count": 2, "major_genres": ["Hip-Hop / Rap"]}
    ],
}


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


class KnowledgeCurationApplyTests(unittest.TestCase):
    def setup_local(self, tmp: Path):
        vault = tmp / "vault.json.gz"
        genres = tmp / "genres.json"
        out = tmp / "out"
        with gzip.open(vault, "wt", encoding="utf-8") as f:
            json.dump(VAULT, f)
        genres.write_text(json.dumps(GENRES), encoding="utf-8")
        subprocess.run(
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
        subprocess.run(
            [sys.executable, str(MINER), "prepare", "--out-dir", str(out)],
            cwd=ROOT,
            check=True,
            capture_output=True,
            text=True,
        )
        return vault, genres, out

    def bundle(self, out: Path):
        reports = out / "reports" / "knowledge"
        instrument_path = reports / "instrument-candidates-v1.json"
        lexicon_path = reports / "lexicon-candidates-v1.json"
        instrument = json.loads(instrument_path.read_text(encoding="utf-8"))
        return {
            "schema": "promptvgine-knowledge-curation-decisions-v1",
            "bundle_id": "synthetic-core-v1",
            "review_id": instrument["review_id"],
            "curation_fingerprint": instrument["curation_fingerprint"],
            "source": {
                "prompt_vault_sha256": instrument["source"]["prompt_vault"]["sha256"],
                "genre_map_sha256": instrument["source"]["genre_map"]["sha256"],
            },
            "report_sha256": {
                "instrument": sha(instrument_path),
                "lexicon": sha(lexicon_path),
            },
            "instrument_families": [
                {"id": "family:keyboards", "label": "Keyboards", "status": "approved"}
            ],
            "instruments": [
                {
                    "id": "instrument:piano",
                    "label": "Piano",
                    "label_norm": "piano",
                    "family_id": "family:keyboards",
                    "status": "approved",
                    "entry": {
                        "entry_id": "instrument:piano",
                        "entry_type": "instrument",
                        "canonical_label": "Piano",
                        "canonical_slug": "piano",
                        "status": "approved",
                        "difficulty": "beginner",
                        "variants": [
                            {
                                "surface": "piano",
                                "match_kind": "word",
                                "match_priority": 200,
                                "is_primary": True,
                            }
                        ],
                        "definitions": [
                            {
                                "kind": "one_liner",
                                "text": "A keyboard instrument used for melody, chords, rhythm, and accompaniment.",
                                "status": "approved",
                            }
                        ],
                        "contexts": [],
                        "evidence": {"surface": "piano"},
                    },
                    "aliases": [],
                    "evidence": {"surface": "piano"},
                }
            ],
            "concepts": [
                {
                    "entry_id": "concept:swing",
                    "entry_type": "rhythm_concept",
                    "canonical_label": "Swing",
                    "canonical_slug": "swing",
                    "status": "approved",
                    "difficulty": "beginner",
                    "variants": [
                        {
                            "surface": "swing",
                            "match_kind": "word",
                            "match_priority": 200,
                            "is_primary": True,
                        }
                    ],
                    "definitions": [
                        {
                            "kind": "one_liner",
                            "text": "A timing feel that makes equal written subdivisions play with an uneven long-short relationship.",
                            "status": "approved",
                        }
                    ],
                    "contexts": [
                        {
                            "context_type": "section",
                            "context_key": "groove",
                            "text": "Here it changes the subdivision feel and forward motion of the groove.",
                            "status": "approved",
                        }
                    ],
                    "evidence": {"surface": "swing"},
                }
            ],
        }

    def test_apply_compiles_and_refreshes_reports(self):
        with tempfile.TemporaryDirectory() as td:
            vault, genres, out = self.setup_local(Path(td))
            bundle = self.bundle(out)
            bundle_path = out / "reports" / "knowledge" / "knowledge-curation-decisions-v1.json"
            bundle_path.write_text(json.dumps(bundle, indent=2), encoding="utf-8")
            result = subprocess.run(
                [
                    sys.executable,
                    str(APPLY),
                    "apply",
                    "--out-dir",
                    str(out),
                    "--bundle",
                    str(bundle_path),
                    "--vault",
                    str(vault),
                    "--genre-map",
                    str(genres),
                ],
                cwd=ROOT,
                check=True,
                capture_output=True,
                text=True,
            )
            self.assertIn("[knowledge-curation] applied", result.stdout)
            self.assertIn("instruments 1", result.stdout)
            self.assertIn("concepts 1", result.stdout)

            curation = sqlite3.connect(out / "curation.sqlite")
            knowledge = sqlite3.connect(out / "knowledge.sqlite")
            try:
                self.assertEqual(
                    curation.execute(
                        "select count(*) from instrument_patch where id='instrument:piano'"
                    ).fetchone()[0],
                    1,
                )
                self.assertEqual(
                    curation.execute(
                        "select count(*) from entry_patch where entry_id='concept:swing'"
                    ).fetchone()[0],
                    1,
                )
                self.assertEqual(
                    knowledge.execute(
                        "select count(*) from instrument where id='instrument:piano' and status='approved'"
                    ).fetchone()[0],
                    1,
                )
                self.assertEqual(
                    knowledge.execute(
                        "select count(*) from knowledge_entry where id='concept:swing' and status='approved'"
                    ).fetchone()[0],
                    1,
                )
            finally:
                curation.close()
                knowledge.close()

            refreshed = json.loads(
                (out / "reports" / "knowledge" / "lexicon-candidates-v1.json").read_text(
                    encoding="utf-8"
                )
            )
            self.assertNotEqual(refreshed["review_id"], bundle["review_id"])
            self.assertNotIn(
                "swing", {x["normalized"] for x in refreshed["prioritized_terms"]}
            )

    def test_v2_scoped_instrument_bundle_compiles_traits_and_parameters(self):
        with tempfile.TemporaryDirectory() as td:
            vault, genres, out = self.setup_local(Path(td))
            reports = out / "reports" / "knowledge"
            instrument_path = reports / "instrument-candidates-v1.json"
            instrument_report = json.loads(instrument_path.read_text(encoding="utf-8"))
            bundle = {
                "schema": "promptvgine-knowledge-curation-decisions-v2",
                "bundle_id": "synthetic-instrument-ontology-v2",
                "review_id": instrument_report["review_id"],
                "curation_fingerprint": instrument_report["curation_fingerprint"],
                "source": {
                    "prompt_vault_sha256": instrument_report["source"]["prompt_vault"]["sha256"],
                    "genre_map_sha256": instrument_report["source"]["genre_map"]["sha256"],
                },
                "report_sha256": {"instrument": sha(instrument_path)},
                "instrument_families": [
                    {"id": "family:electronic", "label": "Electronic", "status": "approved"}
                ],
                "instruments": [
                    {
                        "id": "instrument:synth-bass",
                        "label": "Synth Bass",
                        "label_norm": "synth bass",
                        "family_id": "family:electronic",
                        "status": "approved",
                        "entry": {
                            "entry_id": "instrument:synth-bass",
                            "entry_type": "instrument",
                            "canonical_label": "Synth Bass",
                            "canonical_slug": "synth-bass",
                            "status": "approved",
                            "difficulty": "beginner",
                            "variants": [
                                {
                                    "surface": "synth bass",
                                    "match_kind": "phrase",
                                    "match_priority": 200,
                                    "is_primary": True,
                                }
                            ],
                            "definitions": [
                                {
                                    "kind": "one_liner",
                                    "text": "A synthesizer configured for bass-register parts.",
                                    "status": "approved",
                                }
                            ],
                            "contexts": [],
                        },
                        "aliases": [{"surface": "bass synth"}],
                    }
                ],
                "instrument_aliases": [
                    {
                        "instrument_id": "instrument:synth-bass",
                        "surface": "synth-bass",
                        "status": "approved",
                    }
                ],
                "concepts": [
                    {
                        "entry_id": "concept:synthetic-test",
                        "entry_type": "source_character",
                        "canonical_label": "Synthetic Test",
                        "canonical_slug": "synthetic-test",
                        "status": "approved",
                        "difficulty": "beginner",
                        "variants": [
                            {
                                "surface": "synthetic-test",
                                "match_kind": "word",
                                "match_priority": 200,
                                "is_primary": True,
                            }
                        ],
                        "definitions": [
                            {
                                "kind": "one_liner",
                                "text": "Generated primarily through synthesis.",
                                "status": "approved",
                            }
                        ],
                        "contexts": [],
                    }
                ],
                "instrument_traits": [
                    {
                        "instrument_id": "instrument:synth-bass",
                        "entry_id": "concept:synthetic-test",
                        "trait_type": "source",
                        "confidence": 1.0,
                        "status": "approved",
                    }
                ],
                "parameters": [
                    {
                        "id": "parameter:instrument-source-test",
                        "section_key": "instruments",
                        "label": "Instrument Source Test",
                        "canonical_slug": "instrument-source-test",
                        "value_type": "multi",
                        "easy_visible": False,
                        "advanced_visible": True,
                        "allow_custom_text": False,
                        "status": "approved",
                    }
                ],
                "parameter_options": [
                    {
                        "id": "option:instrument-source-test:synthetic",
                        "parameter_id": "parameter:instrument-source-test",
                        "label": "Synthetic",
                        "canonical_slug": "synthetic",
                        "output_fragment": "synthetic",
                        "knowledge_entry_id": "concept:synthetic-test",
                        "easy_visible": False,
                        "advanced_visible": True,
                        "sort_order": 10,
                        "status": "approved",
                    }
                ],
            }
            bundle_path = reports / "knowledge-curation-decisions-v2.json"
            bundle_path.write_text(json.dumps(bundle, indent=2), encoding="utf-8")
            result = subprocess.run(
                [
                    sys.executable,
                    str(APPLY),
                    "apply",
                    "--out-dir",
                    str(out),
                    "--bundle",
                    str(bundle_path),
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
            self.assertIn("parameters 1/1", result.stdout)
            self.assertIn("traits 1", result.stdout)

            knowledge = sqlite3.connect(out / "knowledge.sqlite")
            try:
                self.assertEqual(
                    knowledge.execute(
                        "select count(*) from instrument where id='instrument:synth-bass'"
                    ).fetchone()[0],
                    1,
                )
                self.assertEqual(
                    knowledge.execute(
                        "select count(*) from instrument_alias where alias_norm='synth-bass'"
                    ).fetchone()[0],
                    1,
                )
                self.assertEqual(
                    knowledge.execute(
                        """select count(*) from instrument_trait
                           where instrument_id='instrument:synth-bass'
                             and entry_id='concept:synthetic-test'"""
                    ).fetchone()[0],
                    1,
                )
                self.assertEqual(
                    knowledge.execute(
                        """select count(*) from parameter_option
                           where id='option:instrument-source-test:synthetic'
                             and status='approved'"""
                    ).fetchone()[0],
                    1,
                )
            finally:
                knowledge.close()

    def test_compound_playing_expression_stays_selectable_and_links_semantics(self):
        with tempfile.TemporaryDirectory() as td:
            vault, genres, out = self.setup_local(Path(td))
            reports = out / "reports" / "knowledge"
            instrument_path = reports / "instrument-candidates-v1.json"
            instrument_report = json.loads(instrument_path.read_text(encoding="utf-8"))

            def concept(eid, label, slug, entry_type):
                return {
                    "entry_id": eid,
                    "entry_type": entry_type,
                    "canonical_label": label,
                    "canonical_slug": slug,
                    "status": "approved",
                    "difficulty": "beginner",
                    "variants": [
                        {
                            "surface": label.casefold(),
                            "match_kind": "word",
                            "match_priority": 200,
                            "is_primary": True,
                        }
                    ],
                    "definitions": [
                        {
                            "kind": "one_liner",
                            "text": f"Semantic test concept for {label}.",
                            "status": "approved",
                        }
                    ],
                    "contexts": [],
                }

            bundle = {
                "schema": "promptvgine-knowledge-curation-decisions-v2",
                "bundle_id": "synthetic-expression-preservation-v2",
                "review_id": instrument_report["review_id"],
                "curation_fingerprint": instrument_report["curation_fingerprint"],
                "source": {
                    "prompt_vault_sha256": instrument_report["source"]["prompt_vault"]["sha256"],
                    "genre_map_sha256": instrument_report["source"]["genre_map"]["sha256"],
                },
                "report_sha256": {"instrument": sha(instrument_path)},
                "instrument_families": [
                    {"id": "family:guitars", "label": "Guitars", "status": "approved"}
                ],
                "instruments": [
                    {
                        "id": "instrument:electric-guitar",
                        "label": "Electric Guitar",
                        "label_norm": "electric guitar",
                        "family_id": "family:guitars",
                        "status": "approved",
                        "entry": {
                            "entry_id": "instrument:electric-guitar",
                            "entry_type": "instrument",
                            "canonical_label": "Electric Guitar",
                            "canonical_slug": "electric-guitar",
                            "status": "approved",
                            "difficulty": "beginner",
                            "variants": [
                                {
                                    "surface": "electric guitar",
                                    "match_kind": "phrase",
                                    "match_priority": 300,
                                    "is_primary": True,
                                }
                            ],
                            "definitions": [
                                {
                                    "kind": "one_liner",
                                    "text": "A guitar whose pickup signal is amplified or processed electrically.",
                                    "status": "approved",
                                }
                            ],
                            "contexts": [],
                        },
                        "aliases": [],
                    }
                ],
                "concepts": [
                    concept("concept:clean", "Clean", "clean", "processing_character"),
                    concept("concept:rhythm-role", "Rhythm", "rhythm-role", "instrument_role"),
                ],
            }
            bundle_path = reports / "expression-preservation-v2.json"
            bundle_path.write_text(json.dumps(bundle, indent=2), encoding="utf-8")
            result = subprocess.run(
                [
                    sys.executable,
                    str(APPLY),
                    "apply",
                    "--out-dir",
                    str(out),
                    "--bundle",
                    str(bundle_path),
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

            knowledge = sqlite3.connect(out / "knowledge.sqlite")
            try:
                row = knowledge.execute(
                    """select id,output_text,selectable,base_instrument_id,decomposition_state
                       from instrument_expression
                       where label_norm='clean rhythm electric guitar'"""
                ).fetchone()
                self.assertIsNotNone(row)
                self.assertEqual(row[1], "clean rhythm electric guitar")
                self.assertEqual(row[2], 1)
                self.assertEqual(row[3], "instrument:electric-guitar")
                self.assertEqual(row[4], "identity")
                self.assertEqual(
                    knowledge.execute(
                        """select count(*) from instrument_expression_instrument
                           where expression_id=? and instrument_id='instrument:electric-guitar'""",
                        (row[0],),
                    ).fetchone()[0],
                    1,
                )
                self.assertEqual(
                    knowledge.execute(
                        """select count(*) from instrument_expression_concept
                           where expression_id=? and entry_id in ('concept:clean','concept:rhythm-role')""",
                        (row[0],),
                    ).fetchone()[0],
                    2,
                )
            finally:
                knowledge.close()

    def test_stale_curation_fingerprint_is_rejected(self):
        with tempfile.TemporaryDirectory() as td:
            vault, genres, out = self.setup_local(Path(td))
            bundle = self.bundle(out)
            curation = sqlite3.connect(out / "curation.sqlite")
            try:
                curation.execute(
                    """INSERT INTO entry_patch(
                         entry_id,entry_type,canonical_label,canonical_slug,status,difficulty,
                         revision,updated_at
                       ) VALUES ('concept:other','music_term','Other','other','approved',
                                 'beginner',1,'2026-01-01T00:00:00Z')"""
                )
                curation.commit()
            finally:
                curation.close()

            bundle_path = out / "reports" / "knowledge" / "knowledge-curation-decisions-v1.json"
            bundle_path.write_text(json.dumps(bundle, indent=2), encoding="utf-8")
            result = subprocess.run(
                [
                    sys.executable,
                    str(APPLY),
                    "apply",
                    "--out-dir",
                    str(out),
                    "--bundle",
                    str(bundle_path),
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
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("curation changed", result.stderr + result.stdout)

    def test_compile_failure_restores_curation(self):
        with tempfile.TemporaryDirectory() as td:
            vault, genres, out = self.setup_local(Path(td))
            bundle = self.bundle(out)
            before = (out / "curation.sqlite").read_bytes()
            bundle_path = out / "reports" / "knowledge" / "knowledge-curation-decisions-v1.json"
            bundle_path.write_text(json.dumps(bundle, indent=2), encoding="utf-8")
            result = subprocess.run(
                [
                    sys.executable,
                    str(APPLY),
                    "apply",
                    "--out-dir",
                    str(out),
                    "--bundle",
                    str(bundle_path),
                    "--vault",
                    str(vault),
                    "--genre-map",
                    str(Path(td) / "missing-genres.json"),
                ],
                cwd=ROOT,
                check=False,
                capture_output=True,
                text=True,
            )
            self.assertNotEqual(result.returncode, 0)
            curation = sqlite3.connect(out / "curation.sqlite")
            try:
                self.assertEqual(
                    curation.execute(
                        "select count(*) from instrument_patch where id='instrument:piano'"
                    ).fetchone()[0],
                    0,
                )
                self.assertEqual(
                    curation.execute(
                        "select count(*) from entry_patch where entry_id='concept:swing'"
                    ).fetchone()[0],
                    0,
                )
            finally:
                curation.close()


if __name__ == "__main__":
    unittest.main()
