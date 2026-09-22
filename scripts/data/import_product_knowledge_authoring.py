#!/usr/bin/env python3
"""Validate and import human/AI-authored Product Knowledge definitions.

The authoring batch is intentionally plain text so it can be handed to a
separate writing/research thread without exposing repository internals.
Only the EN/DE plain definitions are replaced; IDs and semantic links remain
stable and context definitions are left untouched.
"""

from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Mapping, MutableMapping, Sequence

DEFAULT_KNOWLEDGE_PATH = Path("data/product/knowledge-foundation-v1.json")
EXPECTED_SCHEMA = "vgine-product-knowledge-foundation-v1"

_META_PATTERNS = (
    re.compile(r"\beasy preset for\b", re.IGNORECASE),
    re.compile(r"\bthis (?:preset|option|control)\b", re.IGNORECASE),
    re.compile(r"\bsets .{0,80} to [“\"]", re.IGNORECASE),
    re.compile(r"\bin the english prompt\b", re.IGNORECASE),
    re.compile(r"\badds .{0,100} to the separate exclude output\b", re.IGNORECASE),
    re.compile(r"\bpackages? a usable musical direction\b", re.IGNORECASE),
    re.compile(r"\bproduct editor\b", re.IGNORECASE),
    re.compile(r"\beasy-preset für\b", re.IGNORECASE),
    re.compile(r"\bdieses (?:preset|option|control)\b", re.IGNORECASE),
    re.compile(r"\bsetzt .{0,80} auf [„\"]", re.IGNORECASE),
    re.compile(r"\bim englischen prompt\b", re.IGNORECASE),
    re.compile(r"\bseparaten exclude-ausgabe\b", re.IGNORECASE),
    re.compile(r"\bbündelt eine direkt nutzbare musikalische richtung\b", re.IGNORECASE),
)


class AuthoringError(ValueError):
    """Raised when the returned authoring text violates the import contract."""


@dataclass(frozen=True)
class AuthoredDefinition:
    entry_id: str
    en: str
    de: str


def _clean_value(value: str) -> str:
    return " ".join(value.strip().split())


def parse_authoring_text(text: str) -> list[AuthoredDefinition]:
    """Parse strict four-line ID/EN/DE/--- blocks."""
    records: list[AuthoredDefinition] = []
    current: dict[str, str] = {}

    def finish() -> None:
        nonlocal current
        if not current:
            return
        missing = {"ID", "EN", "DE"} - current.keys()
        if missing:
            raise AuthoringError(
                "Incomplete authoring block; missing " + ", ".join(sorted(missing))
            )
        records.append(
            AuthoredDefinition(
                entry_id=_clean_value(current["ID"]),
                en=_clean_value(current["EN"]),
                de=_clean_value(current["DE"]),
            )
        )
        current = {}

    for line_no, raw_line in enumerate(text.splitlines(), start=1):
        line = raw_line.strip()
        if not line:
            continue
        if line == "---":
            finish()
            continue
        if ": " not in line:
            raise AuthoringError(
                f"Line {line_no}: expected 'ID: ', 'EN: ', 'DE: ', or '---'."
            )
        key, value = line.split(": ", 1)
        if key not in {"ID", "EN", "DE"}:
            raise AuthoringError(f"Line {line_no}: unsupported field {key!r}.")
        if key in current:
            raise AuthoringError(f"Line {line_no}: duplicate field {key!r}.")
        current[key] = value

    finish()
    if not records:
        raise AuthoringError("No authoring records found.")
    return records


def _validate_explanation(entry_id: str, locale: str, text: str) -> None:
    if len(text) < 24:
        raise AuthoringError(
            f"{entry_id} {locale}: explanation is too short to teach the term."
        )
    if len(text) > 900:
        raise AuthoringError(
            f"{entry_id} {locale}: explanation exceeds the 900-character ceiling."
        )
    for pattern in _META_PATTERNS:
        if pattern.search(text):
            raise AuthoringError(
                f"{entry_id} {locale}: contains rejected UI/meta wording "
                f"({pattern.pattern!r})."
            )


def validate_records(
    records: Sequence[AuthoredDefinition],
    known_ids: Iterable[str],
    *,
    require_complete: bool = True,
) -> None:
    known = set(known_ids)
    seen: set[str] = set()

    for record in records:
        if record.entry_id in seen:
            raise AuthoringError(f"Duplicate ID: {record.entry_id}")
        seen.add(record.entry_id)
        if record.entry_id not in known:
            raise AuthoringError(f"Unknown Product Knowledge ID: {record.entry_id}")
        _validate_explanation(record.entry_id, "EN", record.en)
        _validate_explanation(record.entry_id, "DE", record.de)
        if record.en.casefold() == record.de.casefold():
            raise AuthoringError(
                f"{record.entry_id}: EN and DE explanations are identical."
            )

    if require_complete:
        missing = known - seen
        extra = seen - known
        if missing or extra:
            parts: list[str] = []
            if missing:
                parts.append(f"missing {len(missing)} expected IDs")
            if extra:
                parts.append(f"contains {len(extra)} unexpected IDs")
            raise AuthoringError("Authoring batch is incomplete: " + "; ".join(parts))


def _replace_plain_definition(
    definitions: list[MutableMapping[str, object]],
    locale: str,
    text: str,
) -> None:
    candidates = [
        item
        for item in definitions
        if item.get("locale") == locale and item.get("kind") == "plain"
    ]
    if candidates:
        target = max(candidates, key=lambda item: int(item.get("revision", 0)))
        target["text"] = text
        target["revision"] = int(target.get("revision", 0)) + 1
        return

    max_revision = max(
        (
            int(item.get("revision", 0))
            for item in definitions
            if item.get("locale") == locale
        ),
        default=0,
    )
    definitions.append(
        {
            "locale": locale,
            "kind": "plain",
            "text": text,
            "revision": max_revision + 1,
        }
    )


def apply_records(
    payload: MutableMapping[str, object],
    records: Sequence[AuthoredDefinition],
) -> int:
    entries = payload.get("entries")
    if not isinstance(entries, list):
        raise AuthoringError("Knowledge payload has no entries array.")

    by_id: dict[str, MutableMapping[str, object]] = {}
    for raw_entry in entries:
        if not isinstance(raw_entry, dict):
            raise AuthoringError("Knowledge payload contains a non-object entry.")
        entry_id = raw_entry.get("id")
        if not isinstance(entry_id, str):
            raise AuthoringError("Knowledge payload contains an entry without an ID.")
        by_id[entry_id] = raw_entry

    for record in records:
        entry = by_id[record.entry_id]
        definitions = entry.get("definitions")
        if not isinstance(definitions, list):
            raise AuthoringError(f"{record.entry_id}: definitions must be an array.")
        _replace_plain_definition(definitions, "en", record.en)
        _replace_plain_definition(definitions, "de", record.de)

    return len(records)


def load_payload(path: Path) -> MutableMapping[str, object]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise AuthoringError("Product Knowledge file must contain a JSON object.")
    if payload.get("schema") != EXPECTED_SCHEMA:
        raise AuthoringError(
            f"Unexpected schema {payload.get('schema')!r}; expected {EXPECTED_SCHEMA!r}."
        )
    return payload


def _known_ids(payload: Mapping[str, object]) -> list[str]:
    entries = payload.get("entries")
    if not isinstance(entries, list):
        raise AuthoringError("Knowledge payload has no entries array.")
    ids: list[str] = []
    for entry in entries:
        if not isinstance(entry, dict) or not isinstance(entry.get("id"), str):
            raise AuthoringError("Knowledge payload contains an invalid entry ID.")
        ids.append(entry["id"])
    return ids


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Validate/import Product Knowledge authoring response text."
    )
    parser.add_argument(
        "--input",
        required=True,
        type=Path,
        help="Returned UTF-8 authoring .txt using ID/EN/DE/--- blocks.",
    )
    parser.add_argument(
        "--knowledge",
        type=Path,
        default=DEFAULT_KNOWLEDGE_PATH,
        help=f"Product Knowledge JSON (default: {DEFAULT_KNOWLEDGE_PATH}).",
    )
    parser.add_argument(
        "--allow-partial",
        action="store_true",
        help="Permit a subset of known IDs instead of requiring the complete batch.",
    )
    parser.add_argument(
        "--write",
        action="store_true",
        help="Write validated definitions back to the Product Knowledge JSON.",
    )
    return parser


def main(argv: Sequence[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    payload = load_payload(args.knowledge)
    records = parse_authoring_text(args.input.read_text(encoding="utf-8"))
    known_ids = _known_ids(payload)
    validate_records(
        records,
        known_ids,
        require_complete=not args.allow_partial,
    )
    changed = apply_records(payload, records)

    if args.write:
        args.knowledge.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        print(f"Imported {changed} Product Knowledge entries into {args.knowledge}.")
    else:
        print(
            f"Validated {changed} Product Knowledge entries. "
            "No file changed; pass --write to apply."
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
