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
CURATION = ROOT / "scripts" / "data" / "curation_session.py"

VAULT = {
    "schema": "graph1ks-prompt-control-deck-v1",
    "version": "test",
    "exported_at": "2026-01-01T00:00:00Z",
    "vault": {},
    "tracks": [
        {
            "id": 1,
            "title": "Alias Example",
            "genre": "Boom-Bap Hip Hop",
            "bpm": 90,
            "emotion": "focused",
            "style": "sample-driven hip-hop",
            "year": 1996,
            "key": "C minor",
            "reference_artist": None,
            "reference_song": None,
            "structured_prompt": "[Genre: Boom-Bap Hip Hop]\n[BPM: 90]\n[Groove: laid-back swing, firm backbeat]\n[Drums: dry snare, rounded kick]\n[Bass: warm bass, short notes]",
            "negative_prompt": "vocals, huge reverb",
            "instrumental_arrangement": "[Intro: four bars]",
            "used": False,
            "favorite": False,
        }
    ],
}

GENRES = {
    "schema": "graph1ks-genre-map-v2",
    "taxonomy": "GRAPH1KS_24",
    "taxonomy_version": 1,
    "generated_at": "2026-01-01T00:00:00Z",
    "major_genres": ["Hip-Hop / Rap"],
    "genres": [
        {"genre": "Boom Bap", "track_count": 1, "major_genres": ["Hip-Hop / Rap"]},
        {"genre": "Hip Hop", "track_count": 1, "major_genres": ["Hip-Hop / Rap"]},
    ],
}


class CurationSessionTests(unittest.TestCase):
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
        return vault, genres, out

    def test_prepare_writes_review_files_and_backup(self):
        with tempfile.TemporaryDirectory() as td:
            vault, genres, out = self.setup_local(Path(td))
            result = subprocess.run(
                [
                    sys.executable,
                    str(CURATION),
                    "prepare",
                    "--out-dir",
                    str(out),
                ],
                cwd=ROOT,
                check=True,
                capture_output=True,
                text=True,
            )
            self.assertIn("prepared 1 candidates", result.stdout)
            report_path = out / "reports" / "curation" / "genre-crosswalk-review-v1.json"
            csv_path = out / "reports" / "curation" / "genre-crosswalk-review-v1.csv"
            summary_path = out / "reports" / "curation" / "curation-session-summary.json"
            self.assertTrue(report_path.is_file())
            self.assertTrue(csv_path.is_file())
            self.assertTrue(summary_path.is_file())
            report = json.loads(report_path.read_text(encoding="utf-8"))
            self.assertEqual(report["counts"]["unreviewed_genre_crosswalk_candidates"], 1)
            self.assertEqual(report["candidates"][0]["surface"], "Boom-Bap Hip Hop")
            labels = [x["label"] for x in report["candidates"][0]["nearest_taxonomy_candidates"]]
            self.assertIn("Boom Bap", labels)
            backups = list((out.parent / "backups").glob("curation-*.sqlite"))
            self.assertEqual(len(backups), 1)

    def test_apply_bundle_is_transactional_and_recompiles(self):
        with tempfile.TemporaryDirectory() as td:
            vault, genres, out = self.setup_local(Path(td))
            subprocess.run(
                [sys.executable, str(CURATION), "prepare", "--out-dir", str(out)],
                cwd=ROOT,
                check=True,
                capture_output=True,
                text=True,
            )
            report_path = out / "reports" / "curation" / "genre-crosswalk-review-v1.json"
            report = json.loads(report_path.read_text(encoding="utf-8"))
            candidate = report["candidates"][0]
            target = next(
                x for x in candidate["nearest_taxonomy_candidates"] if x["label"] == "Boom Bap"
            )
            bundle = {
                "schema": "promptvgine-genre-crosswalk-decisions-v1",
                "report_id": report["report_id"],
                "decisions": [
                    {
                        "candidate_key": candidate["candidate_key"],
                        "source_surface": candidate["surface"],
                        "decision_kind": "alias",
                        "targets": [{"genre_id": target["genre_id"], "role_hint": None}],
                        "rationale": "Synthetic spelling/compound alias used to verify the safe apply workflow.",
                        "confidence": "high",
                    }
                ],
            }
            bundle_path = out / "reports" / "curation" / "genre-crosswalk-decisions-v1.json"
            bundle_path.write_text(json.dumps(bundle, indent=2), encoding="utf-8")

            result = subprocess.run(
                [
                    sys.executable,
                    str(CURATION),
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
            self.assertIn("applied 1 decisions", result.stdout)
            self.assertIn("remaining 0", result.stdout)

            curation = sqlite3.connect(out / "curation.sqlite")
            knowledge = sqlite3.connect(out / "knowledge.sqlite")
            try:
                self.assertEqual(
                    curation.execute(
                        "select review_status from candidate_review where candidate_key=?",
                        (candidate["candidate_key"],),
                    ).fetchone()[0],
                    "accepted",
                )
                decision = curation.execute(
                    "select decision_kind,target_genre_id,status from genre_crosswalk_decision"
                ).fetchone()
                self.assertEqual(decision[0], "alias")
                self.assertEqual(decision[1], target["genre_id"])
                self.assertEqual(decision[2], "approved")
                self.assertEqual(
                    knowledge.execute(
                        "select count(*) from genre_alias where alias_surface='Boom-Bap Hip Hop' and status='approved'"
                    ).fetchone()[0],
                    1,
                )
            finally:
                curation.close()
                knowledge.close()

            receipt = json.loads(
                (out / "reports" / "curation" / "last-apply-receipt.json").read_text(
                    encoding="utf-8"
                )
            )
            self.assertEqual(receipt["status"], "ok")
            self.assertTrue(Path(receipt["backup"]).is_file())

    def test_stale_report_bundle_is_rejected_without_change(self):
        with tempfile.TemporaryDirectory() as td:
            vault, genres, out = self.setup_local(Path(td))
            subprocess.run(
                [sys.executable, str(CURATION), "prepare", "--out-dir", str(out)],
                cwd=ROOT,
                check=True,
                capture_output=True,
                text=True,
            )
            bundle_path = out / "reports" / "curation" / "genre-crosswalk-decisions-v1.json"
            bundle_path.write_text(
                json.dumps(
                    {
                        "schema": "promptvgine-genre-crosswalk-decisions-v1",
                        "report_id": "wrong-report-id",
                        "decisions": [
                            {
                                "candidate_key": "x",
                                "source_surface": "x",
                                "decision_kind": "defer",
                                "targets": [],
                                "rationale": "stale test",
                            }
                        ],
                    }
                ),
                encoding="utf-8",
            )
            result = subprocess.run(
                [
                    sys.executable,
                    str(CURATION),
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
            curation = sqlite3.connect(out / "curation.sqlite")
            try:
                self.assertEqual(
                    curation.execute(
                        "select count(*) from genre_crosswalk_decision"
                    ).fetchone()[0],
                    0,
                )
            finally:
                curation.close()


if __name__ == "__main__":
    unittest.main()
