#!/usr/bin/env python3
"""Acceptance-gated read-only planning for Prompt V'gine knowledge completion.

This phase runs only after the owner-local database foundation acceptance report
is successful. It reconciles the accepted instrument-expression inventory with
the full semantic decomposition export, then writes bounded review batches for
remaining partial/unresolved semantics. It never mutates curation.sqlite and it
never removes, hides, or replaces a source-backed instrument expression.
"""
from __future__ import annotations

import argparse
import csv
import datetime as dt
import hashlib
import json
import math
from pathlib import Path

ACCEPTANCE_SCHEMA = "promptvgine-database-foundation-acceptance-v1"
DECOMPOSITION_SCHEMA = "promptvgine-instrument-decomposition-review-v1"
PLAN_SCHEMA = "promptvgine-knowledge-completion-plan-v1"
BATCH_SCHEMA = "promptvgine-instrument-semantic-review-batch-v1"
REQUIRED_CSV_COLUMNS = {
    "candidate_id",
    "surface",
    "occurrence_count",
    "track_count",
    "coverage",
    "fully_semantic",
    "fully_identity_decomposed",
    "instrument_ids",
    "concept_ids",
    "residual_tokens",
}


def utc_now() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat().replace("+00:00", "Z")


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def load_json(path: Path) -> dict:
    if not path.is_file():
        raise SystemExit(f"required report not found: {path}")
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise SystemExit(f"cannot read JSON report {path}: {exc}") from exc
    if not isinstance(value, dict):
        raise SystemExit(f"expected JSON object: {path}")
    return value


def parse_bool(value: str) -> bool:
    normalized = (value or "").strip().casefold()
    if normalized in {"1", "true", "yes"}:
        return True
    if normalized in {"0", "false", "no", ""}:
        return False
    raise ValueError(f"invalid boolean value {value!r}")


def split_pipe(value: str) -> list[str]:
    return [part for part in (value or "").split("|") if part]


def load_decomposition_csv(path: Path) -> list[dict]:
    if not path.is_file():
        raise SystemExit(f"required decomposition CSV not found: {path}")
    rows: list[dict] = []
    seen_ids: set[str] = set()
    try:
        with path.open("r", newline="", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            fieldnames = set(reader.fieldnames or [])
            missing = REQUIRED_CSV_COLUMNS - fieldnames
            if missing:
                raise SystemExit(
                    f"decomposition CSV missing required columns: {sorted(missing)}"
                )
            for line_no, row in enumerate(reader, start=2):
                try:
                    candidate_id = (row.get("candidate_id") or "").strip()
                    surface = (row.get("surface") or "").strip()
                    if not candidate_id or not surface:
                        raise ValueError("candidate_id and surface are required")
                    if candidate_id in seen_ids:
                        raise ValueError(f"duplicate candidate_id {candidate_id!r}")
                    seen_ids.add(candidate_id)
                    parsed = {
                        "candidate_id": candidate_id,
                        "surface": surface,
                        "occurrence_count": int(row.get("occurrence_count") or 0),
                        "track_count": int(row.get("track_count") or 0),
                        "coverage": float(row.get("coverage") or 0.0),
                        "fully_semantic": parse_bool(row.get("fully_semantic") or ""),
                        "fully_identity_decomposed": parse_bool(
                            row.get("fully_identity_decomposed") or ""
                        ),
                        "instrument_ids": split_pipe(row.get("instrument_ids") or ""),
                        "concept_ids": split_pipe(row.get("concept_ids") or ""),
                        "residual_tokens": split_pipe(row.get("residual_tokens") or ""),
                    }
                    if not 0.0 <= parsed["coverage"] <= 1.0:
                        raise ValueError("coverage must be between 0 and 1")
                    if parsed["occurrence_count"] < 0 or parsed["track_count"] < 0:
                        raise ValueError("counts must be non-negative")
                    rows.append(parsed)
                except (TypeError, ValueError) as exc:
                    raise SystemExit(
                        f"invalid decomposition CSV row {line_no}: {exc}"
                    ) from exc
    except OSError as exc:
        raise SystemExit(f"cannot read decomposition CSV {path}: {exc}") from exc
    return rows


def acceptance_counts(acceptance: dict) -> dict:
    if acceptance.get("schema") != ACCEPTANCE_SCHEMA:
        raise SystemExit(
            f"unsupported acceptance schema: {acceptance.get('schema')!r}"
        )
    if acceptance.get("status") != "ok":
        raise SystemExit(
            "database foundation acceptance is not ok; run/fix "
            "database_foundation_session.py finalize before semantic completion"
        )
    invariants = acceptance.get("invariants")
    if not isinstance(invariants, dict) or not invariants:
        raise SystemExit("acceptance report has no invariants")
    failed = sorted(key for key, value in invariants.items() if value is not True)
    if failed:
        raise SystemExit(f"database foundation acceptance invariants failed: {failed}")

    corpus = acceptance.get("corpus") or {}
    knowledge = acceptance.get("knowledge") or {}
    states = knowledge.get("instrument_expression_states") or {}
    required = {
        "source_expressions": corpus.get("source_instrument_expressions"),
        "instrument_expressions": knowledge.get("instrument_expressions"),
        "selectable_expressions": knowledge.get("selectable_instrument_expressions"),
        "semantic_residual": knowledge.get("expressions_with_semantic_residual"),
    }
    try:
        required = {key: int(value) for key, value in required.items()}
        state_counts = {
            key: int(states.get(key, 0))
            for key in ("identity", "semantic", "partial", "unresolved")
        }
    except (TypeError, ValueError) as exc:
        raise SystemExit("acceptance report contains non-integer expression counts") from exc

    expected = required["source_expressions"]
    if expected <= 0:
        raise SystemExit("acceptance report contains no source instrument expressions")
    if required["instrument_expressions"] != expected:
        raise SystemExit("accepted instrument-expression count does not match source count")
    if required["selectable_expressions"] != expected:
        raise SystemExit("accepted selectable-expression count does not match source count")
    if sum(state_counts.values()) != expected:
        raise SystemExit("accepted decomposition-state counts do not sum to source count")
    if state_counts["partial"] + state_counts["unresolved"] != required["semantic_residual"]:
        raise SystemExit("accepted residual count does not match partial+unresolved states")
    return {**required, "states": state_counts}


def review_priority(row: dict) -> float:
    """Deterministic review ordering only; never a semantic truth score."""
    identity_gap = 6.0 if not row["instrument_ids"] else 0.0
    residual_weight = min(20.0, len(row["residual_tokens"]) * 3.0)
    return round(
        row["track_count"] * 4.0
        + math.log2(row["occurrence_count"] + 1) * 8.0
        + (1.0 - row["coverage"]) * 25.0
        + residual_weight
        + identity_gap,
        3,
    )


def review_focus(row: dict) -> str:
    if row["instrument_ids"]:
        return "semantic_residual_with_identity"
    if row["concept_ids"]:
        return "identity_or_semantic_residual_gap"
    return "unresolved_identity_and_semantics"


def build_residual_groups(rows: list[dict]) -> list[dict]:
    groups: dict[str, dict] = {}
    for row in rows:
        for token in dict.fromkeys(row["residual_tokens"]):
            group = groups.setdefault(
                token,
                {
                    "token": token,
                    "expression_count": 0,
                    "weighted_occurrence_count": 0,
                    "track_count_upper_bound": 0,
                    "identity_linked_expression_count": 0,
                    "max_review_priority": 0.0,
                    "example_surfaces": [],
                },
            )
            group["expression_count"] += 1
            group["weighted_occurrence_count"] += row["occurrence_count"]
            group["track_count_upper_bound"] += row["track_count"]
            if row["instrument_ids"]:
                group["identity_linked_expression_count"] += 1
            group["max_review_priority"] = max(
                group["max_review_priority"], row["review_priority"]
            )
            if len(group["example_surfaces"]) < 8 and row["surface"] not in group["example_surfaces"]:
                group["example_surfaces"].append(row["surface"])
    result = list(groups.values())
    result.sort(
        key=lambda item: (
            -item["weighted_occurrence_count"],
            -item["expression_count"],
            item["token"],
        )
    )
    return result


def write_json(path: Path, value: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(
        json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    tmp.replace(path)


def write_groups_csv(path: Path, groups: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow(
            [
                "token",
                "expression_count",
                "weighted_occurrence_count",
                "track_count_upper_bound",
                "identity_linked_expression_count",
                "max_review_priority",
                "example_surfaces",
            ]
        )
        for group in groups:
            writer.writerow(
                [
                    group["token"],
                    group["expression_count"],
                    group["weighted_occurrence_count"],
                    group["track_count_upper_bound"],
                    group["identity_linked_expression_count"],
                    group["max_review_priority"],
                    " | ".join(group["example_surfaces"]),
                ]
            )


def clear_old_batches(batch_dir: Path) -> None:
    if not batch_dir.exists():
        return
    for path in batch_dir.glob("instrument-semantic-review-batch-*-v1.json"):
        if path.is_file():
            path.unlink()


def prepare(args) -> int:
    out_dir = args.out_dir.resolve()
    acceptance_path = (
        args.acceptance.resolve()
        if args.acceptance
        else out_dir / "reports" / "database" / "database-foundation-acceptance-v1.json"
    )
    decomposition_json_path = (
        args.decomposition_json.resolve()
        if args.decomposition_json
        else out_dir / "reports" / "knowledge" / "instrument-decomposition-v1.json"
    )
    decomposition_csv_path = (
        args.decomposition_csv.resolve()
        if args.decomposition_csv
        else out_dir / "reports" / "knowledge" / "instrument-decomposition-full-v1.csv"
    )
    if args.batch_size <= 0 or args.batch_size > 1000:
        raise SystemExit("--batch-size must be between 1 and 1000")

    acceptance = load_json(acceptance_path)
    accepted = acceptance_counts(acceptance)
    decomposition = load_json(decomposition_json_path)
    if decomposition.get("schema") != DECOMPOSITION_SCHEMA:
        raise SystemExit(
            f"unsupported decomposition schema: {decomposition.get('schema')!r}"
        )
    rows = load_decomposition_csv(decomposition_csv_path)

    expected = accepted["source_expressions"]
    try:
        reported_unique = int(decomposition.get("unique_segment_count"))
    except (TypeError, ValueError) as exc:
        raise SystemExit("decomposition report has invalid unique_segment_count") from exc
    if reported_unique != expected:
        raise SystemExit(
            f"decomposition JSON count {reported_unique} does not match accepted source count {expected}"
        )
    if len(rows) != expected:
        raise SystemExit(
            f"decomposition CSV row count {len(rows)} does not match accepted source count {expected}"
        )

    fully_semantic = [row for row in rows if row["fully_semantic"]]
    residual = [row for row in rows if not row["fully_semantic"]]
    fully_identity_decomposed = [
        row for row in rows if row["fully_identity_decomposed"]
    ]
    try:
        reported_fully_semantic = int(decomposition.get("fully_semantic_unique"))
        reported_fully_identity = int(
            decomposition.get("fully_identity_decomposed_unique")
        )
    except (TypeError, ValueError) as exc:
        raise SystemExit(
            "decomposition report has invalid current semantic/identity counts"
        ) from exc
    if reported_fully_semantic != len(fully_semantic):
        raise SystemExit(
            "current decomposition JSON/CSV fully-semantic counts do not match"
        )
    if reported_fully_identity != len(fully_identity_decomposed):
        raise SystemExit(
            "current decomposition JSON/CSV identity-decomposition counts do not match"
        )
    if len(fully_semantic) + len(residual) != expected:
        raise SystemExit(
            "current decomposition semantic partition does not match accepted source count"
        )

    # The acceptance report is a foundation snapshot. Durable additive curation is
    # expected to advance semantic coverage after that snapshot, so its old
    # identity/semantic/partial/unresolved distribution must not gate current
    # decomposition. Only immutable source/selectability foundation invariants are
    # reconciled against acceptance; semantic progress is measured against it.
    acceptance_fully_semantic = (
        accepted["states"]["identity"] + accepted["states"]["semantic"]
    )
    semantic_progress = {
        "acceptance_fully_semantic_expressions": acceptance_fully_semantic,
        "acceptance_semantic_residual_expressions": accepted["semantic_residual"],
        "fully_semantic_delta": len(fully_semantic) - acceptance_fully_semantic,
        "semantic_residual_delta": len(residual) - accepted["semantic_residual"],
    }

    missing_residual = [row["surface"] for row in residual if not row["residual_tokens"]]
    if missing_residual:
        raise SystemExit(
            "semantic-residual decomposition rows must carry residual tokens; "
            f"examples: {missing_residual[:5]}"
        )

    for row in residual:
        row["review_priority"] = review_priority(row)
        row["review_focus"] = review_focus(row)
    residual.sort(
        key=lambda row: (
            -row["review_priority"],
            -row["track_count"],
            -row["occurrence_count"],
            row["surface"].casefold(),
        )
    )
    groups = build_residual_groups(residual)

    reports_dir = out_dir / "reports" / "knowledge-completion"
    batch_dir = reports_dir / "batches"
    clear_old_batches(batch_dir)
    batch_dir.mkdir(parents=True, exist_ok=True)
    batch_count = math.ceil(len(residual) / args.batch_size) if residual else 0
    acceptance_sha = sha256_file(acceptance_path)
    decomposition_json_sha = sha256_file(decomposition_json_path)
    decomposition_csv_sha = sha256_file(decomposition_csv_path)
    source = decomposition.get("source")
    review_id = decomposition.get("review_id")
    curation_fingerprint = decomposition.get("curation_fingerprint")

    batch_reports: list[dict] = []
    for batch_index in range(batch_count):
        start = batch_index * args.batch_size
        batch_rows = residual[start : start + args.batch_size]
        path = batch_dir / f"instrument-semantic-review-batch-{batch_index + 1:03d}-v1.json"
        write_json(
            path,
            {
                "schema": BATCH_SCHEMA,
                "generated_at": utc_now(),
                "batch_index": batch_index + 1,
                "batch_count": batch_count,
                "review_id": review_id,
                "source": source,
                "curation_fingerprint": curation_fingerprint,
                "acceptance_sha256": acceptance_sha,
                "decomposition_json_sha256": decomposition_json_sha,
                "decomposition_csv_sha256": decomposition_csv_sha,
                "contract": {
                    "source_expressions_remain_first_class_selectable_entities": True,
                    "canonical_identity_and_concepts_are_additive_metadata": True,
                    "review_batch_is_not_a_product_filter": True,
                    "frequency_is_review_priority_evidence_only": True,
                },
                "rows": batch_rows,
            },
        )
        batch_reports.append({"path": str(path), "sha256": sha256_file(path)})

    groups_path = reports_dir / "residual-token-groups-v1.csv"
    write_groups_csv(groups_path, groups)
    plan_path = reports_dir / "knowledge-completion-plan-v1.json"
    plan = {
        "schema": PLAN_SCHEMA,
        "generated_at": utc_now(),
        "status": "ready",
        "review_id": review_id,
        "source": source,
        "curation_fingerprint": curation_fingerprint,
        "inputs": {
            "acceptance_report": str(acceptance_path),
            "acceptance_sha256": acceptance_sha,
            "decomposition_json": str(decomposition_json_path),
            "decomposition_json_sha256": decomposition_json_sha,
            "decomposition_csv": str(decomposition_csv_path),
            "decomposition_csv_sha256": decomposition_csv_sha,
        },
        "counts": {
            "source_instrument_expressions": expected,
            "fully_semantic_expressions": len(fully_semantic),
            "semantic_residual_expressions": len(residual),
            "current_fully_identity_decomposed_expressions": len(
                fully_identity_decomposed
            ),
            "decomposition_states": accepted["states"],
            "decomposition_states_source": "acceptance_baseline",
            "semantic_progress_since_acceptance": semantic_progress,
            "residual_token_groups": len(groups),
            "batch_size": args.batch_size,
            "batch_count": batch_count,
        },
        "contract": {
            "source_expressions_remain_first_class_selectable_entities": True,
            "source_expression_inventory_unchanged": True,
            "curation_mutated": False,
            "canonical_identity_and_concepts_are_additive_metadata": True,
            "semantic_coverage_may_advance_after_acceptance": True,
            "frequency_is_review_priority_evidence_only": True,
        },
        "top_residual_token_groups": groups[:100],
        "reports": {
            "residual_token_groups_csv": str(groups_path),
            "review_batches": batch_reports,
            "decision_bundle_template": str(reports_dir / "knowledge-curation-decisions-v2.template.json"),
        },
        "next_action": (
            "Review one or more generated batches and encode accepted additive canonical "
            "instrument/concept/alias/trait/parameter decisions in a fingerprint-bound "
            "knowledge-curation-decisions-v2 bundle; then apply through "
            "knowledge_curation_session.py and regenerate this plan."
        ),
    }
    write_json(plan_path, plan)
    plan_sha = sha256_file(plan_path)
    try:
        bundle_source = {
            "prompt_vault_sha256": source["prompt_vault"]["sha256"],
            "genre_map_sha256": source["genre_map"]["sha256"],
        }
    except (KeyError, TypeError) as exc:
        raise SystemExit("decomposition report is missing source fingerprints") from exc
    if not review_id:
        raise SystemExit("decomposition report is missing review_id")
    template_path = reports_dir / "knowledge-curation-decisions-v2.template.json"
    write_json(
        template_path,
        {
            "schema": "promptvgine-knowledge-curation-decisions-v2",
            "bundle_id": f"instrument-semantic-completion-{review_id}",
            "review_id": review_id,
            "curation_fingerprint": curation_fingerprint,
            "source": bundle_source,
            "report_sha256": {"completion_plan": plan_sha},
            "instrument_families": [],
            "instruments": [],
            "instrument_aliases": [],
            "instrument_traits": [],
            "concepts": [],
            "parameters": [],
            "parameter_options": [],
        },
    )
    print(
        f"[knowledge-completion] prepared · residual {len(residual):,}"
        f" · batches {batch_count:,} · report: {plan_path}"
    )
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Prepare acceptance-gated Prompt V'gine semantic completion review batches."
    )
    sub = parser.add_subparsers(dest="command", required=True)
    prepare_parser = sub.add_parser("prepare")
    prepare_parser.add_argument("--out-dir", type=Path, required=True)
    prepare_parser.add_argument("--acceptance", type=Path)
    prepare_parser.add_argument("--decomposition-json", type=Path)
    prepare_parser.add_argument("--decomposition-csv", type=Path)
    prepare_parser.add_argument("--batch-size", type=int, default=250)
    args = parser.parse_args()
    if args.command == "prepare":
        return prepare(args)
    raise SystemExit(f"unsupported command: {args.command}")


if __name__ == "__main__":
    raise SystemExit(main())
