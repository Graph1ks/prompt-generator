import gzip
import json
import sqlite3
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts" / "data"))

from instrument_semantics import decompose_surface

BUILDER = ROOT / "scripts" / "data" / "build_local_data.py"
MINER = ROOT / "scripts" / "data" / "knowledge_mining_session.py"

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
                "[Drums: dry snare, rounded kick, restrained fills]\n"
                "[Bass: warm electric bass, short notes, soft attack]\n"
                "[Instruments: electric guitar, piano, tenor sax, trumpet]\n"
                "[Texture: subtle tape grit]\n"
                "[Production: softened transients, dry center]"
            ),
            "negative_prompt": "vocals, huge reverb",
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
                "[Groove: laid-back swing, firm backbeat]\n"
                "[Drums: dry snare, rounded kick, restrained fills]\n"
                "[Bass: electric bass, short notes, sharp attack]\n"
                "[Instruments: electric guitar, piano, muted trumpet]\n"
                "[Texture: subtle tape grit]\n"
                "[Production: controlled transients, dry center]"
            ),
            "negative_prompt": "vocals, huge reverb",
            "instrumental_arrangement": "[Intro: four bars]",
            "used": False,
            "favorite": False,
        },
        {
            "id": 3,
            "title": "Three",
            "genre": "Dark Jazz",
            "bpm": 76,
            "emotion": "dark",
            "style": "test",
            "year": 2024,
            "key": "D minor",
            "reference_artist": None,
            "reference_song": None,
            "structured_prompt": (
                "[Genre: Dark Jazz]\n"
                "[BPM: 76]\n"
                "[Groove: loose swing, restrained pulse]\n"
                "[Drums: dry snare, soft kick]\n"
                "[Bass: upright bass, sustained notes]\n"
                "[Instruments: piano, muted trumpet, upright bass]\n"
                "[Texture: tape grit, soft saturation]\n"
                "[Production: softened transients, narrow image]"
            ),
            "negative_prompt": "bright supersaws",
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
    "major_genres": ["Hip-Hop / Rap", "Jazz"],
    "genres": [
        {"genre": "Boom Bap", "track_count": 2, "major_genres": ["Hip-Hop / Rap"]},
        {"genre": "Dark Jazz", "track_count": 1, "major_genres": ["Jazz"]},
    ],
}


class KnowledgeMiningSessionTests(unittest.TestCase):
    def test_hyphen_compound_reuses_exact_reviewed_phrase(self):
        instrument = {
            "kind": "instrument",
            "id": "instrument:pedal-steel-guitar",
            "label": "Pedal Steel Guitar",
            "role": "identity",
        }
        result = decompose_surface(
            "pedal-steel accents",
            {("pedal", "steel"): instrument},
            {
                ("accents",): {
                    "kind": "concept",
                    "id": "concept:accents",
                    "label": "Accents",
                    "role": "arrangement_role",
                }
            },
        )
        self.assertEqual(result["residual_tokens"], [])
        self.assertEqual(result["instrument_ids"], ["instrument:pedal-steel-guitar"])
        self.assertTrue(
            any(
                match.get("inference") == "hyphen_reconstructed_phrase"
                for match in result["matches"]
            )
        )

    def test_hyphen_compound_can_combine_one_identity_with_reviewed_concept(self):
        result = decompose_surface(
            "clean-guitar",
            {
                ("guitar",): {
                    "kind": "instrument",
                    "id": "instrument:guitar",
                    "label": "Guitar",
                    "role": "identity",
                }
            },
            {
                ("clean",): {
                    "kind": "concept",
                    "id": "concept:clean",
                    "label": "Clean",
                    "role": "timbre_descriptor",
                }
            },
        )
        self.assertEqual(result["residual_tokens"], [])
        self.assertEqual(result["instrument_ids"], ["instrument:guitar"])
        self.assertEqual(result["concept_ids"], ["concept:clean"])
        self.assertTrue(result["fully_identity_decomposed"])

    def test_hyphen_compound_refuses_two_instrument_identities(self):
        def instrument(iid, label):
            return {
                "kind": "instrument",
                "id": iid,
                "label": label,
                "role": "identity",
            }

        result = decompose_surface(
            "brass-synth",
            {
                ("brass",): instrument("instrument:brass-section", "Brass Section"),
                ("synth",): instrument("instrument:synthesizer", "Synthesizer"),
            },
            {},
        )
        self.assertEqual(result["instrument_ids"], [])
        self.assertEqual(result["residual_tokens"], ["brass-synth"])
        self.assertFalse(result["fully_semantic"])
    def test_shared_head_coordination_resolves_only_reviewed_instrument_phrases(self):
        def instrument(iid, label):
            return {
                "kind": "instrument",
                "id": iid,
                "label": label,
                "role": "identity",
            }

        phrases = {
            ("saxophones",): instrument("instrument:saxophone", "Saxophone"),
            ("alto", "saxophones"): instrument(
                "instrument:alto-saxophone", "Alto Saxophone"
            ),
            ("tenor", "saxophones"): instrument(
                "instrument:tenor-saxophone", "Tenor Saxophone"
            ),
            ("baritone", "saxophones"): instrument(
                "instrument:baritone-saxophone", "Baritone Saxophone"
            ),
        }

        result = decompose_surface(
            "alto tenor and baritone saxophones",
            phrases,
            {},
        )
        self.assertEqual(result["residual_tokens"], [])
        self.assertEqual(
            result["instrument_ids"],
            [
                "instrument:alto-saxophone",
                "instrument:tenor-saxophone",
                "instrument:baritone-saxophone",
            ],
        )
        self.assertTrue(result["fully_identity_decomposed"])
        inferred = [
            match
            for match in result["matches"]
            if match.get("inference") == "coordinated_shared_head"
        ]
        self.assertEqual(
            [match["surface"] for match in inferred],
            ["alto saxophones", "tenor saxophones"],
        )

    def test_shared_head_coordination_does_not_invent_unknown_identity(self):
        def instrument(iid, label):
            return {
                "kind": "instrument",
                "id": iid,
                "label": label,
                "role": "identity",
            }

        phrases = {
            ("saxophones",): instrument("instrument:saxophone", "Saxophone"),
            ("baritone", "saxophones"): instrument(
                "instrument:baritone-saxophone", "Baritone Saxophone"
            ),
        }
        result = decompose_surface(
            "warm and baritone saxophones",
            phrases,
            {},
        )
        self.assertEqual(result["instrument_ids"], ["instrument:baritone-saxophone"])
        self.assertEqual(result["residual_tokens"], ["warm"])
        self.assertFalse(result["fully_semantic"])

    def test_decomposition_ignores_only_explicit_grammar_scaffolding(self):
        instrument = {
            "kind": "instrument",
            "id": "instrument:piano",
            "label": "Piano",
            "role": "identity",
        }
        concept = lambda eid, label: {
            "kind": "concept",
            "id": eid,
            "label": label,
            "role": "arrangement_role",
        }
        result = decompose_surface(
            "piano used as primary harmonic support",
            {("piano",): instrument},
            {
                ("primary",): concept("concept:primary", "Primary"),
                ("harmonic",): concept("concept:harmonic", "Harmonic"),
                ("support",): concept("concept:support", "Support"),
            },
        )
        self.assertEqual(result["residual_tokens"], [])
        self.assertTrue(result["fully_semantic"])

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
        return out

    def run_prepare(self, out: Path):
        return subprocess.run(
            [
                sys.executable,
                str(MINER),
                "prepare",
                "--out-dir",
                str(out),
                "--instrument-limit",
                "50",
                "--term-limit",
                "50",
                "--phrase-limit",
                "50",
            ],
            cwd=ROOT,
            check=True,
            capture_output=True,
            text=True,
        )

    def test_prepare_writes_reports_and_keeps_console_concise(self):
        with tempfile.TemporaryDirectory() as td:
            out = self.setup_local(Path(td))
            result = self.run_prepare(out)
            self.assertEqual(len([x for x in result.stdout.splitlines() if x.strip()]), 1)
            self.assertIn("[knowledge-mining] prepared", result.stdout)

            reports = out / "reports" / "knowledge"
            instrument_path = reports / "instrument-candidates-v1.json"
            lexicon_path = reports / "lexicon-candidates-v1.json"
            summary_path = reports / "knowledge-mining-summary-v1.json"
            self.assertTrue(instrument_path.is_file())
            self.assertTrue(lexicon_path.is_file())
            self.assertTrue(summary_path.is_file())
            self.assertTrue((reports / "instrument-candidates-full-v1.csv").is_file())
            self.assertTrue((reports / "lexicon-candidates-full-v1.csv").is_file())
            self.assertTrue((reports / "instrument-decomposition-v1.json").is_file())
            self.assertTrue((reports / "instrument-decomposition-full-v1.csv").is_file())

            decomposition = json.loads(
                (reports / "instrument-decomposition-v1.json").read_text(encoding="utf-8")
            )
            self.assertIn("fully_semantic_unique_ratio", decomposition)
            self.assertIn("fully_identity_decomposed_unique_ratio", decomposition)
            self.assertGreaterEqual(
                decomposition["fully_semantic_unique_ratio"],
                decomposition["fully_identity_decomposed_unique_ratio"],
            )
            self.assertTrue(
                all(row["residual_tokens"] for row in decomposition["priority_unresolved"])
            )

            instruments = json.loads(instrument_path.read_text(encoding="utf-8"))
            labels = {x["surface"] for x in instruments["prioritized_candidates"]}
            self.assertIn("electric guitar", labels)
            self.assertIn("piano", labels)
            self.assertIn("muted trumpet", labels)

            lexicon = json.loads(lexicon_path.read_text(encoding="utf-8"))
            terms = {x["surface"] for x in lexicon["prioritized_terms"]}
            self.assertIn("swing", terms)
            self.assertIn("grit", terms)
            self.assertIn("transients", terms)

            backups = list((out.parent / "backups").glob("curation-*.sqlite"))
            self.assertEqual(len(backups), 1)

    def test_curated_surfaces_are_marked_and_removed_from_prioritized_list(self):
        with tempfile.TemporaryDirectory() as td:
            out = self.setup_local(Path(td))
            curation = sqlite3.connect(out / "curation.sqlite")
            try:
                curation.execute(
                    """INSERT INTO instrument_patch(
                         id,label,label_norm,status,revision,updated_at
                       ) VALUES ('instrument:piano','Piano','piano','approved',1,'2026-01-01T00:00:00Z')"""
                )
                curation.execute(
                    """INSERT INTO entry_patch(
                         entry_id,entry_type,canonical_label,canonical_slug,status,difficulty,revision,updated_at
                       ) VALUES ('audio:grit','production_term','Grit','grit','approved','beginner',1,'2026-01-01T00:00:00Z')"""
                )
                curation.execute(
                    """INSERT INTO term_variant_patch(
                         id,entry_id,surface,surface_norm,locale,match_kind,match_priority,is_primary,status,revision,updated_at
                       ) VALUES ('term:grit','audio:grit','grit','grit','en','word',100,1,'approved',1,'2026-01-01T00:00:00Z')"""
                )
                curation.commit()
            finally:
                curation.close()

            self.run_prepare(out)
            reports = out / "reports" / "knowledge"
            instruments = json.loads((reports / "instrument-candidates-v1.json").read_text(encoding="utf-8"))
            self.assertNotIn("piano", {x["normalized"] for x in instruments["prioritized_candidates"]})

            lexicon = json.loads((reports / "lexicon-candidates-v1.json").read_text(encoding="utf-8"))
            self.assertNotIn("grit", {x["normalized"] for x in lexicon["prioritized_terms"]})

    def test_prepare_does_not_mutate_curation(self):
        with tempfile.TemporaryDirectory() as td:
            out = self.setup_local(Path(td))
            before = (out / "curation.sqlite").read_bytes()
            self.run_prepare(out)
            after = (out / "curation.sqlite").read_bytes()
            self.assertEqual(before, after)


if __name__ == "__main__":
    unittest.main()
