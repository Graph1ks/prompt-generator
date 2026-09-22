from __future__ import annotations

import importlib.util
import unittest
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "data" / "import_product_knowledge_authoring.py"
SPEC = importlib.util.spec_from_file_location("product_knowledge_import", SCRIPT)
assert SPEC and SPEC.loader
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class ProductKnowledgeAuthoringImportTests(unittest.TestCase):
    def test_parse_strict_blocks(self) -> None:
        records = MODULE.parse_authoring_text(
            """
ID: product:knowledge:test:a
EN: A useful musical definition that explains an audible concept clearly.
DE: Eine nützliche musikalische Definition, die das hörbare Konzept klar erklärt.
---
ID: product:knowledge:test:b
EN: Another useful musical definition with enough concrete explanatory detail.
DE: Eine weitere nützliche musikalische Definition mit genügend konkreter Erklärung.
---
"""
        )
        self.assertEqual([item.entry_id for item in records], [
            "product:knowledge:test:a",
            "product:knowledge:test:b",
        ])

    def test_rejects_generated_meta_copy(self) -> None:
        record = MODULE.AuthoredDefinition(
            entry_id="product:knowledge:test:a",
            en='Easy preset for Era: “1960s studio production”. It packages a usable musical direction.',
            de="Eine ausreichend lange, echte deutsche Erklärung dieses musikalischen Begriffs.",
        )
        with self.assertRaises(MODULE.AuthoringError):
            MODULE.validate_records(
                [record],
                ["product:knowledge:test:a"],
                require_complete=True,
            )

    def test_requires_complete_batch_by_default(self) -> None:
        record = MODULE.AuthoredDefinition(
            entry_id="product:knowledge:test:a",
            en="A concrete musical explanation long enough to pass the quality floor.",
            de="Eine konkrete musikalische Erklärung, die lang genug für die Qualitätsprüfung ist.",
        )
        with self.assertRaises(MODULE.AuthoringError):
            MODULE.validate_records(
                [record],
                ["product:knowledge:test:a", "product:knowledge:test:b"],
                require_complete=True,
            )

    def test_apply_replaces_plain_definitions_and_bumps_revision(self) -> None:
        payload = {
            "schema": MODULE.EXPECTED_SCHEMA,
            "entries": [
                {
                    "id": "product:knowledge:test:a",
                    "definitions": [
                        {
                            "locale": "en",
                            "kind": "plain",
                            "text": "Old English definition.",
                            "revision": 1,
                        },
                        {
                            "locale": "de",
                            "kind": "plain",
                            "text": "Alte deutsche Definition.",
                            "revision": 2,
                        },
                    ],
                }
            ],
        }
        records = [
            MODULE.AuthoredDefinition(
                entry_id="product:knowledge:test:a",
                en="A new detailed English musical definition with audible meaning.",
                de="Eine neue ausführliche deutsche Musikdefinition mit hörbarer Bedeutung.",
            )
        ]

        changed = MODULE.apply_records(payload, records)

        self.assertEqual(changed, 1)
        definitions = payload["entries"][0]["definitions"]
        english = next(item for item in definitions if item["locale"] == "en")
        german = next(item for item in definitions if item["locale"] == "de")
        self.assertEqual(english["revision"], 2)
        self.assertEqual(german["revision"], 3)
        self.assertEqual(english["text"], records[0].en)
        self.assertEqual(german["text"], records[0].de)


if __name__ == "__main__":
    unittest.main()
