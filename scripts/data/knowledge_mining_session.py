#!/usr/bin/env python3
"""Prepare local Prompt V'gine knowledge-mining reports without terminal spam.

This stage is intentionally read-only with respect to corpus/curation knowledge.
It creates an integrity-checked curation backup and writes detailed local reports
for AI/human review.
"""
from __future__ import annotations

import argparse
import csv
import datetime as dt
import hashlib
import json
import math
import re
import sqlite3
from collections import Counter, defaultdict
from pathlib import Path

SCHEMA = "promptvgine-knowledge-mining-review-v1"
MAX_EXAMPLES = 3

# Conservative function/scaffolding filter. Domain words remain visible even
# when common; frequency alone never promotes anything into curated knowledge.
STOPWORDS = {
    "a","an","and","are","as","at","be","by","for","from","in","into","is","it","its",
    "of","on","or","the","to","with","without","while","via","that","this","these","those",
    "very","more","less","slightly","mostly","often","some","around","across","through",
    "using","use","used","keeps","keep","kept","adds","add","carries","carry","supports",
    "support","creates","create","provides","provide","gives","give","moves","move","stays",
    "stay","sits","sit","drives","drive","locks","lock","feels","feel","sounds","sound",
}

TARGET_SECTIONS = [
    "era","key_mode","groove","melody","harmony","drums","bass","instruments",
    "exciters","texture","dynamics","space_mix","production","structure",
]


def utc_now() -> str:
    return dt.datetime.now(dt.timezone.utc).isoformat().replace("+00:00", "Z")


def compact(value: str) -> str:
    return " ".join((value or "").split())


def norm(value: str) -> str:
    return compact(value).casefold()


def slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", norm(value)).strip("-")


def candidate_id(kind: str, surface: str, section: str | None = None) -> str:
    raw = f"{kind}|{section or ''}|{norm(surface)}"
    return f"{kind}:" + hashlib.sha1(raw.encode("utf-8")).hexdigest()[:18]


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def open_ro(path: Path) -> sqlite3.Connection:
    if not path.is_file():
        raise SystemExit(f"database not found: {path}")
    conn = sqlite3.connect(f"file:{path.resolve()}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    return conn


def integrity(path: Path) -> None:
    conn = sqlite3.connect(path)
    try:
        result = conn.execute("PRAGMA integrity_check").fetchone()[0]
    finally:
        conn.close()
    if result != "ok":
        raise SystemExit(f"integrity_check failed for {path}: {result}")


def backup_sqlite(source: Path, backup_dir: Path) -> Path:
    integrity(source)
    backup_dir.mkdir(parents=True, exist_ok=True)
    stamp = dt.datetime.now().strftime("%Y%m%d-%H%M%S-%f")
    target = backup_dir / f"curation-{stamp}.sqlite"
    src = sqlite3.connect(source)
    dst = sqlite3.connect(target)
    try:
        src.backup(dst)
        dst.commit()
    finally:
        dst.close()
        src.close()
    integrity(target)
    return target


def source_meta(corpus: sqlite3.Connection) -> dict:
    return {
        row["kind"]: {
            "sha256": row["sha256"],
            "schema": row["schema_name"],
            "version": row["schema_version"],
        }
        for row in corpus.execute(
            "SELECT kind,sha256,schema_name,schema_version FROM source_file ORDER BY kind,id"
        )
    }


def curated_surfaces(curation: sqlite3.Connection) -> tuple[set[str], set[str]]:
    instruments = set()
    concepts = set()
    for row in curation.execute(
        "SELECT label_norm FROM instrument_patch WHERE status<>'deprecated'"
    ):
        instruments.add(norm(row[0]))
    for row in curation.execute(
        "SELECT alias_norm FROM instrument_alias_patch WHERE status<>'deprecated'"
    ):
        instruments.add(norm(row[0]))
    for row in curation.execute(
        "SELECT canonical_label FROM entry_patch WHERE status<>'deprecated'"
    ):
        concepts.add(norm(row[0]))
    for row in curation.execute(
        "SELECT surface_norm FROM term_variant_patch WHERE status<>'deprecated'"
    ):
        concepts.add(norm(row[0]))
    return instruments, concepts


def split_instrument_segments(content: str) -> list[str]:
    # The corpus overwhelmingly uses comma-separated instrument lists. Semicolon
    # is also safe as a list boundary. Do not split on "and": phrases such as
    # "kick and snare" or compound instrument descriptions would be damaged.
    raw = re.split(r"[,;]+", content or "")
    out = []
    for item in raw:
        item = compact(item).strip(" .:-")
        if not item:
            continue
        if len(item) > 120:
            continue
        out.append(item)
    return out


def head_token(surface: str) -> str:
    tokens = re.findall(r"[a-z0-9]+", norm(surface))
    return tokens[-1] if tokens else ""


def instrument_report(
    corpus: sqlite3.Connection,
    curated_instruments: set[str],
    prioritized_limit: int,
) -> dict:
    stats: dict[str, dict] = {}
    groups: dict[str, Counter] = defaultdict(Counter)

    for row in corpus.execute(
        """SELECT track_id,content_raw
           FROM prompt_section
           WHERE canonical_key='instruments'
           ORDER BY track_id,ordinal"""
    ):
        seen_this_track = set()
        for surface in split_instrument_segments(row["content_raw"]):
            n = norm(surface)
            if not n:
                continue
            item = stats.setdefault(
                n,
                {
                    "surface": surface,
                    "normalized": n,
                    "occurrence_count": 0,
                    "track_ids": set(),
                    "examples": [],
                    "head_token": head_token(surface),
                },
            )
            item["occurrence_count"] += 1
            item["track_ids"].add(row["track_id"])
            if len(item["examples"]) < MAX_EXAMPLES and row["content_raw"] not in item["examples"]:
                item["examples"].append(row["content_raw"])
            groups[item["head_token"]][n] += 1
            seen_this_track.add(n)

    rows = []
    for n, item in stats.items():
        track_count = len(item.pop("track_ids"))
        item["track_count"] = track_count
        item["candidate_id"] = candidate_id("instrument-segment", item["surface"], "instruments")
        item["already_curated"] = n in curated_instruments
        item["priority_score"] = round(
            track_count + math.log2(item["occurrence_count"] + 1) * 3, 3
        )
        rows.append(item)

    rows.sort(
        key=lambda x: (x["already_curated"], -x["priority_score"], -x["track_count"], x["normalized"])
    )
    uncurated = [row for row in rows if not row["already_curated"]]

    group_rows = []
    for head, variants in groups.items():
        if not head:
            continue
        surfaces = []
        total = 0
        for n, count in variants.most_common():
            item = stats[n]
            surfaces.append(
                {
                    "surface": item["surface"],
                    "normalized": n,
                    "occurrence_count": count,
                    "track_count": item.get("track_count", 0),
                    "already_curated": n in curated_instruments,
                }
            )
            total += count
        if total < 2:
            continue
        group_rows.append(
            {
                "head_token": head,
                "occurrence_count": total,
                "variant_count": len(surfaces),
                "variants": surfaces[:30],
            }
        )
    group_rows.sort(key=lambda x: (-x["occurrence_count"], -x["variant_count"], x["head_token"]))

    return {
        "section": "instruments",
        "total_unique_segments": len(rows),
        "uncurated_unique_segments": len(uncurated),
        "prioritized_candidates": uncurated[:prioritized_limit],
        "head_groups": group_rows[:400],
        "notes": [
            "A segment is evidence, not automatically an instrument identity.",
            "Descriptors such as electric, muted, warm, lead, rhythm, vintage, or processed may belong to traits rather than the instrument name.",
            "Head-token groups are heuristic review aids only.",
        ],
        "_full_rows": rows,
    }


def fts_examples(corpus: sqlite3.Connection, surface: str, limit: int = MAX_EXAMPLES) -> list[dict]:
    # Quote the phrase so FTS treats multiword candidates as a phrase.
    q = '"' + surface.replace('"', '""') + '"'
    try:
        rows = corpus.execute(
            """SELECT track_id,canonical_key,raw_label,content
               FROM prompt_section_fts
               WHERE prompt_section_fts MATCH ?
               LIMIT ?""",
            (q, limit),
        ).fetchall()
    except sqlite3.OperationalError:
        return []
    return [dict(row) for row in rows]


def valid_term(term: str) -> bool:
    n = norm(term)
    if not n or n in STOPWORDS or len(n) < 3:
        return False
    if n.isdigit():
        return False
    if not re.search(r"[a-z]", n):
        return False
    return True


def lexicon_report(
    corpus: sqlite3.Connection,
    curated_concepts: set[str],
    term_limit: int,
    phrase_limit: int,
) -> dict:
    by_term: dict[str, list[dict]] = defaultdict(list)
    for row in corpus.execute(
        """SELECT token_norm,canonical_key,occurrence_count,track_count
           FROM token_section_stat
           WHERE canonical_key IN ({})
           ORDER BY token_norm,occurrence_count DESC""".format(
               ",".join("?" for _ in TARGET_SECTIONS)
           ),
        TARGET_SECTIONS,
    ):
        if valid_term(row["token_norm"]):
            by_term[row["token_norm"]].append(
                {
                    "section": row["canonical_key"],
                    "occurrence_count": int(row["occurrence_count"]),
                    "track_count": int(row["track_count"]),
                }
            )

    terms = []
    for surface, sections in by_term.items():
        total_occ = sum(x["occurrence_count"] for x in sections)
        total_tracks_upper = sum(x["track_count"] for x in sections)
        if total_occ < 5:
            continue
        max_occ = max(x["occurrence_count"] for x in sections)
        score = max_occ + math.log2(total_occ + 1) * 6 + len(sections) * 8
        terms.append(
            {
                "candidate_id": candidate_id("term", surface),
                "surface": surface,
                "normalized": surface,
                "total_occurrence_count": total_occ,
                "section_count": len(sections),
                "track_count_upper_bound": total_tracks_upper,
                "sections": sorted(sections, key=lambda x: (-x["occurrence_count"], x["section"])),
                "already_curated": surface in curated_concepts,
                "priority_score": round(score, 3),
            }
        )
    terms.sort(
        key=lambda x: (x["already_curated"], -x["priority_score"], -x["total_occurrence_count"], x["surface"])
    )
    prioritized_terms = [x for x in terms if not x["already_curated"]][:term_limit]
    for item in prioritized_terms:
        item["examples"] = fts_examples(corpus, item["surface"])

    phrases = []
    for row in corpus.execute(
        """SELECT canonical_key,n,phrase_norm,occurrence_count,track_count
           FROM phrase_candidate
           WHERE n BETWEEN 2 AND 4
             AND occurrence_count>=5
             AND canonical_key IN ({})
           ORDER BY occurrence_count DESC,track_count DESC""".format(
               ",".join("?" for _ in TARGET_SECTIONS)
           ),
        TARGET_SECTIONS,
    ):
        phrase = row["phrase_norm"]
        words = phrase.split()
        useful_words = [w for w in words if valid_term(w)]
        if not useful_words:
            continue
        stop_ratio = 1.0 - (len(useful_words) / len(words))
        if stop_ratio > 0.67:
            continue
        n = norm(phrase)
        if n in curated_concepts:
            already = True
        else:
            already = False
        score = (
            int(row["occurrence_count"])
            + math.log2(int(row["track_count"]) + 1) * 5
            + int(row["n"]) * 2
            - stop_ratio * 10
        )
        phrases.append(
            {
                "candidate_id": candidate_id("phrase", phrase, row["canonical_key"]),
                "surface": phrase,
                "normalized": n,
                "section": row["canonical_key"],
                "n": int(row["n"]),
                "occurrence_count": int(row["occurrence_count"]),
                "track_count": int(row["track_count"]),
                "already_curated": already,
                "priority_score": round(score, 3),
                "scaffolding_ratio": round(stop_ratio, 3),
            }
        )
    phrases.sort(
        key=lambda x: (x["already_curated"], -x["priority_score"], -x["occurrence_count"], x["surface"])
    )
    prioritized_phrases = [x for x in phrases if not x["already_curated"]][:phrase_limit]
    for item in prioritized_phrases[: min(250, len(prioritized_phrases))]:
        item["examples"] = fts_examples(corpus, item["surface"])

    return {
        "target_sections": TARGET_SECTIONS,
        "prioritized_terms": prioritized_terms,
        "prioritized_phrases": prioritized_phrases,
        "term_candidate_count_before_limit": len([x for x in terms if not x["already_curated"]]),
        "phrase_candidate_count_before_limit": len([x for x in phrases if not x["already_curated"]]),
        "notes": [
            "Frequency is evidence, not approval.",
            "Function words and obvious grammatical scaffolding are conservatively filtered.",
            "The same term can have different meanings by section; sections are retained for context-definition review.",
            "Phrases may still contain corpus grammar patterns and must be reviewed before promotion.",
        ],
        "_full_terms": terms,
        "_full_phrases": phrases,
    }


def write_json(path: Path, value: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    tmp.replace(path)


def write_instrument_csv(path: Path, rows: list[dict]) -> None:
    with path.open("w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow(
            [
                "candidate_id","surface","normalized","occurrence_count","track_count",
                "head_token","priority_score","already_curated",
            ]
        )
        for row in rows:
            w.writerow(
                [
                    row["candidate_id"],row["surface"],row["normalized"],row["occurrence_count"],
                    row["track_count"],row["head_token"],row["priority_score"],row["already_curated"],
                ]
            )


def write_lexicon_csv(path: Path, terms: list[dict], phrases: list[dict]) -> None:
    with path.open("w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f)
        w.writerow(
            [
                "kind","candidate_id","surface","section","occurrence_count",
                "track_count_or_upper_bound","section_count","priority_score","already_curated",
            ]
        )
        for row in terms:
            w.writerow(
                [
                    "term",row["candidate_id"],row["surface"],"",
                    row["total_occurrence_count"],row["track_count_upper_bound"],
                    row["section_count"],row["priority_score"],row["already_curated"],
                ]
            )
        for row in phrases:
            w.writerow(
                [
                    "phrase",row["candidate_id"],row["surface"],row["section"],
                    row["occurrence_count"],row["track_count"],1,
                    row["priority_score"],row["already_curated"],
                ]
            )


def prepare(args) -> int:
    out_dir = args.out_dir.resolve()
    corpus_path = out_dir / "corpus.sqlite"
    curation_path = out_dir / "curation.sqlite"
    reports_dir = out_dir / "reports" / "knowledge"

    integrity(corpus_path)
    integrity(curation_path)
    backup = backup_sqlite(curation_path, out_dir.parent / "backups")

    with open_ro(corpus_path) as corpus, open_ro(curation_path) as curation:
        sources = source_meta(corpus)
        curated_instruments, curated_concepts = curated_surfaces(curation)
        instruments = instrument_report(corpus, curated_instruments, args.instrument_limit)
        lexicon = lexicon_report(corpus, curated_concepts, args.term_limit, args.phrase_limit)

    full_instrument_rows = instruments.pop("_full_rows")
    full_terms = lexicon.pop("_full_terms")
    full_phrases = lexicon.pop("_full_phrases")

    generated_at = utc_now()
    review_id_raw = json.dumps(
        {
            "schema": SCHEMA,
            "sources": sources,
            "instrument_count": len(full_instrument_rows),
            "term_count": len(full_terms),
            "phrase_count": len(full_phrases),
        },
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")
    review_id = "knowledge-mining-" + hashlib.sha256(review_id_raw).hexdigest()[:24]

    instrument_json = reports_dir / "instrument-candidates-v1.json"
    lexicon_json = reports_dir / "lexicon-candidates-v1.json"
    instrument_csv = reports_dir / "instrument-candidates-full-v1.csv"
    lexicon_csv = reports_dir / "lexicon-candidates-full-v1.csv"
    summary_path = reports_dir / "knowledge-mining-summary-v1.json"

    write_json(
        instrument_json,
        {
            "schema": SCHEMA,
            "report_kind": "instrument_candidates",
            "review_id": review_id,
            "generated_at": generated_at,
            "source": sources,
            **instruments,
        },
    )
    write_json(
        lexicon_json,
        {
            "schema": SCHEMA,
            "report_kind": "lexicon_candidates",
            "review_id": review_id,
            "generated_at": generated_at,
            "source": sources,
            **lexicon,
        },
    )
    reports_dir.mkdir(parents=True, exist_ok=True)
    write_instrument_csv(instrument_csv, full_instrument_rows)
    write_lexicon_csv(lexicon_csv, full_terms, full_phrases)

    summary = {
        "schema": "promptvgine-knowledge-mining-summary-v1",
        "review_id": review_id,
        "generated_at": generated_at,
        "source": sources,
        "backup": str(backup),
        "reports": {
            "instrument_review": str(instrument_json),
            "lexicon_review": str(lexicon_json),
            "instrument_full_csv": str(instrument_csv),
            "lexicon_full_csv": str(lexicon_csv),
        },
        "counts": {
            "instrument_unique_segments": len(full_instrument_rows),
            "instrument_prioritized": len(instruments["prioritized_candidates"]),
            "term_candidates_before_limit": lexicon["term_candidate_count_before_limit"],
            "term_prioritized": len(lexicon["prioritized_terms"]),
            "phrase_candidates_before_limit": lexicon["phrase_candidate_count_before_limit"],
            "phrase_prioritized": len(lexicon["prioritized_phrases"]),
        },
        "sha256": {
            "instrument_review": sha256_file(instrument_json),
            "lexicon_review": sha256_file(lexicon_json),
            "instrument_full_csv": sha256_file(instrument_csv),
            "lexicon_full_csv": sha256_file(lexicon_csv),
        },
        "next_step": "AI/human review of the JSON reports; no candidate is promoted automatically.",
    }
    write_json(summary_path, summary)

    print(
        "[knowledge-mining] prepared"
        f" · instruments {summary['counts']['instrument_prioritized']}/{summary['counts']['instrument_unique_segments']}"
        f" · terms {summary['counts']['term_prioritized']}"
        f" · phrases {summary['counts']['phrase_prioritized']}"
        f" · backup OK"
        f" · reports: {reports_dir}"
    )
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(
        description="Prepare file-based Prompt V'gine instrument/lexicon mining reports."
    )
    ap.add_argument("command", choices=["prepare"])
    ap.add_argument("--out-dir", type=Path, required=True)
    ap.add_argument("--instrument-limit", type=int, default=1000)
    ap.add_argument("--term-limit", type=int, default=750)
    ap.add_argument("--phrase-limit", type=int, default=750)
    args = ap.parse_args()
    if min(args.instrument_limit, args.term_limit, args.phrase_limit) < 1:
        raise SystemExit("candidate limits must be >= 1")
    return prepare(args)


if __name__ == "__main__":
    raise SystemExit(main())
