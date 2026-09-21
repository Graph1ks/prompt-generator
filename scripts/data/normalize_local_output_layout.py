#!/usr/bin/env python3
"""Plan/apply the one-time migration from legacy nested local report folders."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def destination_for(out_dir: Path, source: Path) -> Path | None:
    reports = out_dir / "reports"
    logs = out_dir / "logs"
    try:
        rel = source.relative_to(out_dir)
    except ValueError:
        return None

    parts = rel.parts
    if rel == Path("runtime-v1-export-report.json"):
        return reports / "runtime-export-v1.json"

    if len(parts) < 3 or parts[0] != "reports":
        return None

    group = parts[1]
    tail = Path(*parts[2:])
    name = tail.name

    if group == "database":
        if name.endswith(".stdout.txt") or name.endswith(".stderr.txt"):
            return logs / f"database-{name}"
        return reports / name

    if group == "knowledge":
        known = {
            "instrument-candidates-v1.json": "knowledge-instrument-candidates-v1.json",
            "lexicon-candidates-v1.json": "knowledge-lexicon-candidates-v1.json",
            "instrument-candidates-full-v1.csv": "knowledge-instrument-candidates-full-v1.csv",
            "lexicon-candidates-full-v1.csv": "knowledge-lexicon-candidates-full-v1.csv",
            "instrument-decomposition-v1.json": "knowledge-instrument-decomposition-v1.json",
            "instrument-decomposition-full-v1.csv": "knowledge-instrument-decomposition-full-v1.csv",
            "last-knowledge-curation-apply-receipt.json": "knowledge-last-curation-apply-receipt.json",
        }
        if name in known:
            return reports / known[name]
        if name.endswith(".txt"):
            return logs / (name if name.startswith("knowledge-") else f"knowledge-{name}")
        return reports / name

    if group == "curation":
        known = {
            "genre-crosswalk-review-v1.json": "curation-genre-crosswalk-review-v1.json",
            "genre-crosswalk-review-v1.csv": "curation-genre-crosswalk-review-v1.csv",
            "genre-crosswalk-decisions-v1.json": "curation-genre-crosswalk-decisions-v1.json",
            "last-apply-receipt.json": "curation-last-apply-receipt.json",
        }
        if name in known:
            return reports / known[name]
        if name.endswith(".txt"):
            return logs / (name if name.startswith("curation-") else f"curation-{name}")
        return reports / (name if name.startswith("curation-") else f"curation-{name}")

    if group == "knowledge-completion":
        if tail.parts and tail.parts[0] == "batches":
            batch_name = name.replace("instrument-semantic-review-batch-", "knowledge-completion-batch-", 1)
            return reports / batch_name
        known = {
            "residual-token-groups-v1.csv": "knowledge-completion-residual-token-groups-v1.csv",
            "knowledge-completion-plan-v1.json": "knowledge-completion-plan-v1.json",
            "knowledge-curation-decisions-v2.template.json": "knowledge-curation-decisions-v2.template.json",
        }
        return reports / known.get(name, name if name.startswith("knowledge-") else f"knowledge-completion-{name}")

    return None


def discover(out_dir: Path) -> list[tuple[Path, Path]]:
    sources: list[Path] = []
    for legacy in (
        out_dir / "reports" / "database",
        out_dir / "reports" / "knowledge",
        out_dir / "reports" / "curation",
        out_dir / "reports" / "knowledge-completion",
    ):
        if legacy.exists():
            sources.extend(path for path in legacy.rglob("*") if path.is_file())
    legacy_runtime = out_dir / "runtime-v1-export-report.json"
    if legacy_runtime.is_file():
        sources.append(legacy_runtime)

    moves = []
    for source in sorted(set(sources), key=lambda p: str(p).casefold()):
        destination = destination_for(out_dir, source)
        if destination is not None and destination != source:
            moves.append((source, destination))
    return moves


def build_plan(out_dir: Path) -> dict:
    operations = []
    conflict_count = 0
    for source, destination in discover(out_dir):
        status = "move"
        if destination.exists():
            if sha256_file(source) == sha256_file(destination):
                status = "duplicate"
            else:
                status = "conflict"
                conflict_count += 1
        operations.append(
            {
                "source": str(source),
                "destination": str(destination),
                "status": status,
            }
        )
    return {
        "schema": "promptvgine-local-output-layout-migration-v1",
        "out_dir": str(out_dir),
        "operations": operations,
        "counts": {
            "total": len(operations),
            "move": sum(x["status"] == "move" for x in operations),
            "duplicate": sum(x["status"] == "duplicate" for x in operations),
            "conflict": conflict_count,
        },
    }


def remove_empty_legacy_dirs(out_dir: Path) -> None:
    roots = [
        out_dir / "reports" / "database",
        out_dir / "reports" / "knowledge",
        out_dir / "reports" / "curation",
        out_dir / "reports" / "knowledge-completion",
    ]
    for root in roots:
        if not root.exists():
            continue
        for path in sorted((p for p in root.rglob("*") if p.is_dir()), key=lambda p: len(p.parts), reverse=True):
            try:
                path.rmdir()
            except OSError:
                pass
        try:
            root.rmdir()
        except OSError:
            pass


def apply_plan(out_dir: Path, plan: dict) -> dict:
    if plan["counts"]["conflict"]:
        raise RuntimeError("migration has destination conflicts; no files were changed")
    for operation in plan["operations"]:
        source = Path(operation["source"])
        destination = Path(operation["destination"])
        destination.parent.mkdir(parents=True, exist_ok=True)
        if operation["status"] == "duplicate":
            source.unlink()
        elif operation["status"] == "move":
            os.replace(source, destination)
    remove_empty_legacy_dirs(out_dir)
    result = build_plan(out_dir)
    result["status"] = "ok"
    return result


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--out-dir", type=Path, default=Path(".local-data/current"))
    ap.add_argument("--apply", action="store_true", help="Apply the migration; default is read-only plan")
    args = ap.parse_args()
    out_dir = args.out_dir.resolve()
    plan = build_plan(out_dir)
    try:
        result = apply_plan(out_dir, plan) if args.apply else {**plan, "status": "plan"}
        print(json.dumps(result, indent=2, ensure_ascii=False))
        return 0
    except Exception as exc:
        print(json.dumps({**plan, "status": "blocked", "error": str(exc)}, indent=2, ensure_ascii=False))
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
