import csv
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COMPLETION = ROOT / "scripts" / "data" / "knowledge_completion_session.py"
sys.path.insert(0, str(ROOT / "scripts" / "data"))

from knowledge_curation_session import load_review_state
from knowledge_mining_session import sha256_file


class KnowledgeCompletionSessionTests(unittest.TestCase):
    def write_fixture(self, root: Path):
        out = root / "out"
        database = out / "reports" / "database"
        knowledge = out / "reports" / "knowledge"
        database.mkdir(parents=True)
        knowledge.mkdir(parents=True)
        acceptance = {
            "schema": "promptvgine-database-foundation-acceptance-v1",
            "status": "ok",
            "corpus": {"source_instrument_expressions": 4},
            "knowledge": {
                "instrument_expressions": 4,
                "selectable_instrument_expressions": 4,
                "instrument_expression_states": {
                    "identity": 1,
                    "semantic": 1,
                    "partial": 1,
                    "unresolved": 1,
                },
                "expressions_with_semantic_residual": 2,
            },
            "invariants": {
                "all_source_expressions_materialized": True,
                "all_source_expressions_selectable": True,
                "all_source_output_text_preserved": True,
                "exclude_not_structured_section": True,
                "corpus_integrity": True,
                "knowledge_integrity": True,
                "curation_integrity": True,
            },
        }
        acceptance_path = database / "database-foundation-acceptance-v1.json"
        acceptance_path.write_text(json.dumps(acceptance, indent=2), encoding="utf-8")
        decomposition = {
            "schema": "promptvgine-instrument-decomposition-review-v1",
            "report_kind": "instrument_decomposition",
            "review_id": "synthetic-review",
            "source": {
                "prompt_vault": {"sha256": "a" * 64},
                "genre_map": {"sha256": "b" * 64},
            },
            "curation_fingerprint": "c" * 64,
            "unique_segment_count": 4,
            "fully_semantic_unique": 2,
            "fully_identity_decomposed_unique": 1,
        }
        decomposition_path = knowledge / "instrument-decomposition-v1.json"
        decomposition_path.write_text(json.dumps(decomposition, indent=2), encoding="utf-8")
        csv_path = knowledge / "instrument-decomposition-full-v1.csv"
        rows = [
            {
                "candidate_id": "instrument-segment:1",
                "surface": "electric guitar",
                "occurrence_count": 20,
                "track_count": 18,
                "coverage": 1.0,
                "fully_semantic": True,
                "fully_identity_decomposed": True,
                "instrument_ids": "instrument:electric-guitar",
                "concept_ids": "",
                "residual_tokens": "",
            },
            {
                "candidate_id": "instrument-segment:2",
                "surface": "warm pad",
                "occurrence_count": 10,
                "track_count": 9,
                "coverage": 1.0,
                "fully_semantic": True,
                "fully_identity_decomposed": False,
                "instrument_ids": "",
                "concept_ids": "concept:warm|concept:pad",
                "residual_tokens": "",
            },
            {
                "candidate_id": "instrument-segment:3",
                "surface": "muted silver trumpet",
                "occurrence_count": 8,
                "track_count": 7,
                "coverage": 0.6667,
                "fully_semantic": False,
                "fully_identity_decomposed": False,
                "instrument_ids": "instrument:trumpet",
                "concept_ids": "concept:muted",
                "residual_tokens": "silver",
            },
            {
                "candidate_id": "instrument-segment:4",
                "surface": "glass cloud",
                "occurrence_count": 3,
                "track_count": 3,
                "coverage": 0.0,
                "fully_semantic": False,
                "fully_identity_decomposed": False,
                "instrument_ids": "",
                "concept_ids": "",
                "residual_tokens": "glass|cloud",
            },
        ]
        with csv_path.open("w", newline="", encoding="utf-8-sig") as f:
            writer = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
            writer.writeheader()
            writer.writerows(rows)
        curation = out / "curation.sqlite"
        curation.write_bytes(b"durable-curation-sentinel")
        return out, acceptance_path, curation

    def run_prepare(self, out: Path, *extra: str):
        return subprocess.run(
            [
                sys.executable,
                str(COMPLETION),
                "prepare",
                "--out-dir",
                str(out),
                "--batch-size",
                "1",
                *extra,
            ],
            cwd=ROOT,
            check=False,
            capture_output=True,
            text=True,
        )

    def test_prepare_is_acceptance_gated_read_only_and_batched(self):
        with tempfile.TemporaryDirectory() as td:
            out, _, curation = self.write_fixture(Path(td))
            before = curation.read_bytes()
            result = self.run_prepare(out)
            self.assertEqual(
                result.returncode,
                0,
                msg=f"stdout:\n{result.stdout}\nstderr:\n{result.stderr}",
            )
            self.assertEqual(len([x for x in result.stdout.splitlines() if x.strip()]), 1)
            self.assertIn("[knowledge-completion] prepared", result.stdout)
            self.assertEqual(curation.read_bytes(), before)

            reports = out / "reports" / "knowledge-completion"
            plan = json.loads(
                (reports / "knowledge-completion-plan-v1.json").read_text(encoding="utf-8")
            )
            self.assertEqual(plan["status"], "ready")
            self.assertEqual(plan["counts"]["source_instrument_expressions"], 4)
            self.assertEqual(plan["counts"]["fully_semantic_expressions"], 2)
            self.assertEqual(plan["counts"]["semantic_residual_expressions"], 2)
            self.assertEqual(plan["counts"]["batch_count"], 2)
            self.assertTrue(
                plan["contract"]["source_expressions_remain_first_class_selectable_entities"]
            )
            self.assertTrue(plan["contract"]["source_expression_inventory_unchanged"])
            self.assertFalse(plan["contract"]["curation_mutated"])
            self.assertTrue(
                plan["contract"]["canonical_identity_and_concepts_are_additive_metadata"]
            )

            batches = sorted((reports / "batches").glob("*.json"))
            self.assertEqual(len(batches), 2)
            self.assertEqual(len(plan["reports"]["review_batches"]), 2)
            for item in plan["reports"]["review_batches"]:
                self.assertEqual(len(item["sha256"]), 64)
            surfaces = []
            for path in batches:
                batch = json.loads(path.read_text(encoding="utf-8"))
                self.assertTrue(batch["contract"]["review_batch_is_not_a_product_filter"])
                self.assertEqual(len(batch["rows"]), 1)
                self.assertTrue(batch["rows"][0]["residual_tokens"])
                surfaces.append(batch["rows"][0]["surface"])
            self.assertCountEqual(surfaces, ["muted silver trumpet", "glass cloud"])
            self.assertTrue((reports / "residual-token-groups-v1.csv").is_file())
            template_path = reports / "knowledge-curation-decisions-v2.template.json"
            template = json.loads(template_path.read_text(encoding="utf-8"))
            self.assertEqual(template["schema"], "promptvgine-knowledge-curation-decisions-v2")
            self.assertEqual(template["review_id"], "synthetic-review")
            self.assertEqual(set(template["report_sha256"]), {"completion_plan"})
            self.assertEqual(len(template["report_sha256"]["completion_plan"]), 64)

    def test_prepare_accepts_semantic_progress_after_foundation_acceptance(self):
        with tempfile.TemporaryDirectory() as td:
            out, _, _ = self.write_fixture(Path(td))
            csv_path = (
                out / "reports" / "knowledge" / "instrument-decomposition-full-v1.csv"
            )
            with csv_path.open("r", newline="", encoding="utf-8-sig") as f:
                rows = list(csv.DictReader(f))
                fieldnames = list(rows[0].keys())
            rows[3]["coverage"] = "1.0"
            rows[3]["fully_semantic"] = "True"
            rows[3]["concept_ids"] = "concept:glass|concept:cloud"
            rows[3]["residual_tokens"] = ""
            with csv_path.open("w", newline="", encoding="utf-8-sig") as f:
                writer = csv.DictWriter(f, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(rows)

            decomposition_path = (
                out / "reports" / "knowledge" / "instrument-decomposition-v1.json"
            )
            decomposition = json.loads(decomposition_path.read_text(encoding="utf-8"))
            decomposition["fully_semantic_unique"] = 3
            decomposition_path.write_text(
                json.dumps(decomposition, indent=2), encoding="utf-8"
            )

            result = self.run_prepare(out)
            self.assertEqual(
                result.returncode,
                0,
                msg=f"stdout:\n{result.stdout}\nstderr:\n{result.stderr}",
            )
            plan = json.loads(
                (
                    out
                    / "reports"
                    / "knowledge-completion"
                    / "knowledge-completion-plan-v1.json"
                ).read_text(encoding="utf-8")
            )
            self.assertEqual(plan["counts"]["fully_semantic_expressions"], 3)
            self.assertEqual(plan["counts"]["semantic_residual_expressions"], 1)
            self.assertEqual(
                plan["counts"]["decomposition_states_source"],
                "acceptance_baseline",
            )
            self.assertEqual(
                plan["counts"]["semantic_progress_since_acceptance"],
                {
                    "acceptance_fully_semantic_expressions": 2,
                    "acceptance_semantic_residual_expressions": 2,
                    "fully_semantic_delta": 1,
                    "semantic_residual_delta": -1,
                },
            )
            self.assertTrue(
                plan["contract"]["semantic_coverage_may_advance_after_acceptance"]
            )

    def test_completion_plan_is_a_supported_v2_review_binding(self):
        with tempfile.TemporaryDirectory() as td:
            out, _, _ = self.write_fixture(Path(td))
            result = self.run_prepare(out)
            self.assertEqual(result.returncode, 0, msg=result.stderr)
            plan_path = (
                out
                / "reports"
                / "knowledge-completion"
                / "knowledge-completion-plan-v1.json"
            )
            state = load_review_state(
                out,
                {"completion_plan": sha256_file(plan_path)},
            )
            self.assertEqual(state["review_id"], "synthetic-review")
            self.assertEqual(state["curation_fingerprint"], "c" * 64)
            self.assertIn("completion_plan", state["reports"])

    def test_prepare_fails_closed_when_acceptance_is_not_ok(self):
        with tempfile.TemporaryDirectory() as td:
            out, acceptance_path, _ = self.write_fixture(Path(td))
            acceptance = json.loads(acceptance_path.read_text(encoding="utf-8"))
            acceptance["status"] = "failed"
            acceptance_path.write_text(json.dumps(acceptance, indent=2), encoding="utf-8")
            result = self.run_prepare(out)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("acceptance is not ok", result.stderr.casefold())
            self.assertFalse(
                (out / "reports" / "knowledge-completion" / "knowledge-completion-plan-v1.json").exists()
            )

    def test_prepare_fails_closed_on_stale_decomposition_counts(self):
        with tempfile.TemporaryDirectory() as td:
            out, _, _ = self.write_fixture(Path(td))
            path = out / "reports" / "knowledge" / "instrument-decomposition-v1.json"
            decomposition = json.loads(path.read_text(encoding="utf-8"))
            decomposition["unique_segment_count"] = 3
            path.write_text(json.dumps(decomposition, indent=2), encoding="utf-8")
            result = self.run_prepare(out)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("does not match accepted source count", result.stderr)


if __name__ == "__main__":
    unittest.main()
