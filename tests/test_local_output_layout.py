import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MIGRATOR = ROOT / "scripts" / "data" / "normalize_local_output_layout.py"


class LocalOutputLayoutTests(unittest.TestCase):
    def run_migrator(self, out: Path, *extra: str, check: bool = True):
        return subprocess.run(
            [sys.executable, str(MIGRATOR), "--out-dir", str(out), *extra],
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=check,
        )

    def test_plan_is_read_only_and_apply_flattens_reports(self):
        with tempfile.TemporaryDirectory() as td:
            out = Path(td) / "current"
            (out / "reports" / "database").mkdir(parents=True)
            (out / "reports" / "knowledge").mkdir(parents=True)
            (out / "reports" / "knowledge-completion" / "batches").mkdir(parents=True)

            acceptance = out / "reports" / "database" / "database-foundation-acceptance-v1.json"
            acceptance.write_text('{"status":"ok"}', encoding="utf-8")
            log = out / "reports" / "database" / "01-build.stdout.txt"
            log.write_text("ok", encoding="utf-8")
            decomposition = out / "reports" / "knowledge" / "instrument-decomposition-v1.json"
            decomposition.write_text('{"count":6035}', encoding="utf-8")
            batch = (
                out
                / "reports"
                / "knowledge-completion"
                / "batches"
                / "instrument-semantic-review-batch-001-v1.json"
            )
            batch.write_text('{"batch":1}', encoding="utf-8")
            runtime = out / "runtime-v1-export-report.json"
            runtime.write_text('{"status":"ok"}', encoding="utf-8")

            planned = json.loads(self.run_migrator(out).stdout)
            self.assertEqual(planned["status"], "plan")
            self.assertEqual(planned["counts"]["move"], 5)
            self.assertTrue(acceptance.exists())

            applied = json.loads(self.run_migrator(out, "--apply").stdout)
            self.assertEqual(applied["status"], "ok")
            self.assertEqual(applied["counts"]["total"], 0)
            self.assertTrue((out / "reports" / "database-foundation-acceptance-v1.json").is_file())
            self.assertTrue((out / "logs" / "database-01-build.stdout.txt").is_file())
            self.assertTrue((out / "reports" / "knowledge-instrument-decomposition-v1.json").is_file())
            self.assertTrue((out / "reports" / "knowledge-completion-batch-001-v1.json").is_file())
            self.assertTrue((out / "reports" / "runtime-export-v1.json").is_file())
            self.assertFalse((out / "reports" / "database").exists())
            self.assertFalse((out / "reports" / "knowledge").exists())
            self.assertFalse((out / "reports" / "knowledge-completion").exists())

    def test_conflict_blocks_without_mutation(self):
        with tempfile.TemporaryDirectory() as td:
            out = Path(td) / "current"
            legacy = out / "reports" / "curation"
            legacy.mkdir(parents=True)
            source = legacy / "genre-crosswalk-review-v1.json"
            source.write_text("old", encoding="utf-8")
            target = out / "reports" / "curation-genre-crosswalk-review-v1.json"
            target.write_text("new", encoding="utf-8")

            result = self.run_migrator(out, "--apply", check=False)
            self.assertEqual(result.returncode, 2)
            payload = json.loads(result.stdout)
            self.assertEqual(payload["status"], "blocked")
            self.assertEqual(payload["counts"]["conflict"], 1)
            self.assertEqual(source.read_text(encoding="utf-8"), "old")
            self.assertEqual(target.read_text(encoding="utf-8"), "new")


if __name__ == "__main__":
    unittest.main()
