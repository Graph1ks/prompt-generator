#!/usr/bin/env python3
"""Shared instrument-expression semantics for build, mining, and runtime data."""
from __future__ import annotations

import hashlib
import json
import re
import sqlite3
import unicodedata
from collections import Counter

DECOMPOSITION_SYNTAX = {
    "and",
    "or",
    "with",
    "plus",
    "the",
    "a",
    "an",
    "of",
    "two",
    "three",
    "four",
    "multiple",
    "dual",
    "second",
    "additional",
    "as",
    "in",
    "used",
    "for",
    "on",
    "from",
    "using",
    "including",
    "played",
    "sharing",
    "one",
    "only",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "ten",
}


def compact(value: str) -> str:
    return " ".join((value or "").strip().split())


def norm(value: str) -> str:
    return compact(unicodedata.normalize("NFKC", value or "")).casefold()


def split_instrument_segments(content: str) -> list[str]:
    """Preserve compound playing/style expressions; only split list boundaries."""
    out = []
    for item in re.split(r"[,;]+", content or ""):
        item = compact(item).strip(" .:-")
        if not item or len(item) > 120:
            continue
        out.append(item)
    return out


_TOKEN_RE = re.compile(
    r"(?:[^\W_]+\.){2,}[^\W_]+\.?(?:-[^\W_]+)*|[^\W_]+(?:['’][^\W_]+)*(?:-[^\W_]+(?:['’][^\W_]+)*)*",
    re.UNICODE,
)


def phrase_tokens(value: str) -> tuple[str, ...]:
    out = []
    for match in _TOKEN_RE.finditer(norm(value)):
        token = match.group(0).replace(".", "").replace("'", "").replace("’", "")
        token = token.strip("-")
        if token:
            out.append(token)
    return tuple(out)


def expression_id(label_norm: str) -> str:
    return "instrument-expression:" + hashlib.sha1(label_norm.encode("utf-8")).hexdigest()[:20]


def compiled_semantic_lexicon(
    knowledge: sqlite3.Connection,
) -> tuple[dict[tuple[str, ...], dict], dict[tuple[str, ...], dict]]:
    instrument_phrases: dict[tuple[str, ...], dict] = {}
    for iid, label, label_norm, alias_surface, alias_norm in knowledge.execute(
        """SELECT i.id,i.label,i.label_norm,a.alias_surface,a.alias_norm
           FROM instrument i
           LEFT JOIN instrument_alias a
             ON a.instrument_id=i.id AND a.status IN ('reviewed','approved')
           WHERE i.status IN ('reviewed','approved')
           ORDER BY i.id,a.alias_norm"""
    ):
        for surface in (label, label_norm, alias_surface, alias_norm):
            toks = phrase_tokens(surface or "")
            if toks:
                instrument_phrases.setdefault(
                    toks,
                    {
                        "kind": "instrument",
                        "id": iid,
                        "label": label,
                        "role": "identity",
                    },
                )

    concept_phrases: dict[tuple[str, ...], dict] = {}
    for eid, entry_type, canonical_label, surface, surface_norm in knowledge.execute(
        """SELECT e.id,e.entry_type,e.canonical_label,t.surface,t.surface_norm
           FROM knowledge_entry e
           LEFT JOIN term_variant t ON t.entry_id=e.id
           WHERE e.status IN ('reviewed','approved')
             AND e.entry_type<>'instrument'
           ORDER BY e.id,t.match_priority DESC,t.surface_norm"""
    ):
        for candidate in (canonical_label, surface, surface_norm):
            toks = phrase_tokens(candidate or "")
            if toks:
                concept_phrases.setdefault(
                    toks,
                    {
                        "kind": "concept",
                        "id": eid,
                        "label": canonical_label,
                        "role": entry_type,
                    },
                )
    return instrument_phrases, concept_phrases


def infer_coordinated_shared_head_identities(
    toks: list[str],
    covered: list[bool],
    matches: list[dict],
    instrument_phrases: dict[tuple[str, ...], dict],
) -> None:
    """Infer coordinated identities only from exact reviewed phrases.

    Example: when baritone saxophones, tenor saxophones, and generic
    saxophones are all known, tenor and baritone saxophones may safely share
    the right-hand head. No new identity is invented.
    """
    coordinators = {"and", "or"}
    right_matches = [
        match
        for match in matches
        if match.get("kind") == "instrument"
        and match["start"] > 0
        and toks[match["start"] - 1] in coordinators
    ]
    inferred_keys: set[tuple[str, int, int]] = set()

    for right in right_matches:
        coordinator = right["start"] - 1
        right_tokens = tuple(toks[right["start"] : right["end"]])
        if len(right_tokens) < 2:
            continue

        shared_suffixes = [
            right_tokens[suffix_start:]
            for suffix_start in range(1, len(right_tokens))
            if right_tokens[suffix_start:] in instrument_phrases
        ]
        if not shared_suffixes:
            continue

        window_start = max(0, coordinator - 4)
        candidates: list[tuple[int, int, tuple[str, ...], dict]] = []
        for start in range(window_start, coordinator):
            for end in range(start + 1, coordinator + 1):
                if any(covered[start:end]):
                    continue
                span = toks[start:end]
                if any(token in DECOMPOSITION_SYNTAX for token in span):
                    continue
                for suffix in shared_suffixes:
                    key = tuple(span) + suffix
                    found = instrument_phrases.get(key)
                    if found:
                        candidates.append((start, end, key, found))

        candidates.sort(key=lambda item: (-(item[1] - item[0]), item[0], item[1]))
        for start, end, key, found in candidates:
            if any(covered[start:end]):
                continue
            dedupe_key = (found["id"], start, end)
            if dedupe_key in inferred_keys:
                continue
            inferred_keys.add(dedupe_key)
            matches.append(
                {
                    **found,
                    "surface": " ".join(key),
                    "start": start,
                    "end": end,
                    "inference": "coordinated_shared_head",
                }
            )
            for idx in range(start, end):
                covered[idx] = True

def infer_hyphen_compound_semantics(
    toks: list[str],
    covered: list[bool],
    matches: list[dict],
    instrument_phrases: dict[tuple[str, ...], dict],
    concept_phrases: dict[tuple[str, ...], dict],
) -> None:
    """Decompose unresolved hyphen compounds without inventing identities.

    Exact de-hyphenated reviewed phrases win first. Otherwise every component
    must be fully explainable by reviewed concepts or identities and at most
    one canonical instrument identity may be produced.
    """
    lexicons = (instrument_phrases, concept_phrases)

    for token_index, token in enumerate(toks):
        if covered[token_index] or "-" not in token:
            continue
        parts = tuple(part for part in token.split("-") if part)
        if len(parts) < 2:
            continue

        direct = None
        for lexicon in lexicons:
            if parts in lexicon:
                direct = lexicon[parts]
                break
        if direct:
            matches.append(
                {
                    **direct,
                    "surface": token,
                    "start": token_index,
                    "end": token_index + 1,
                    "inference": "hyphen_reconstructed_phrase",
                }
            )
            covered[token_index] = True
            continue

        local_matches: list[dict] = []
        local_covered = [False] * len(parts)
        max_len = max(
            [1]
            + [
                max((len(key) for key in lexicon), default=1)
                for lexicon in lexicons
            ]
        )
        for span_len in range(max_len, 0, -1):
            for start in range(0, len(parts) - span_len + 1):
                end = start + span_len
                if any(local_covered[start:end]):
                    continue
                key = parts[start:end]
                found = None
                for lexicon in lexicons:
                    if key in lexicon:
                        found = lexicon[key]
                        break
                if not found:
                    continue
                local_matches.append(
                    {
                        **found,
                        "surface": " ".join(parts[start:end]),
                        "start": token_index,
                        "end": token_index + 1,
                        "component_start": start,
                        "component_end": end,
                        "inference": "hyphen_component",
                    }
                )
                for idx in range(start, end):
                    local_covered[idx] = True

        unexplained = [
            part
            for idx, part in enumerate(parts)
            if not local_covered[idx] and part not in DECOMPOSITION_SYNTAX
        ]
        instrument_ids = {
            match["id"]
            for match in local_matches
            if match.get("kind") == "instrument"
        }
        if unexplained or not local_matches or len(instrument_ids) > 1:
            continue

        matches.extend(local_matches)
        covered[token_index] = True

def decompose_surface(
    surface: str,
    instrument_phrases: dict[tuple[str, ...], dict],
    concept_phrases: dict[tuple[str, ...], dict],
) -> dict:
    toks = list(phrase_tokens(surface))
    matches: list[dict] = []
    covered = [False] * len(toks)
    lexicons = (instrument_phrases, concept_phrases)

    max_len = 1
    for lexicon in lexicons:
        if lexicon:
            max_len = max(max_len, max(len(key) for key in lexicon))

    for span_len in range(max_len, 0, -1):
        for start in range(0, len(toks) - span_len + 1):
            end = start + span_len
            if any(covered[start:end]):
                continue
            key = tuple(toks[start:end])
            found = None
            for lexicon in lexicons:  # instrument identity wins equal-span ties
                if key in lexicon:
                    found = lexicon[key]
                    break
            if not found:
                continue
            matches.append(
                {
                    **found,
                    "surface": " ".join(toks[start:end]),
                    "start": start,
                    "end": end,
                }
            )
            for idx in range(start, end):
                covered[idx] = True

    infer_coordinated_shared_head_identities(
        toks,
        covered,
        matches,
        instrument_phrases,
    )
    infer_hyphen_compound_semantics(
        toks,
        covered,
        matches,
        instrument_phrases,
        concept_phrases,
    )

    residual = [
        token
        for idx, token in enumerate(toks)
        if not covered[idx] and token not in DECOMPOSITION_SYNTAX
    ]
    semantic_token_count = sum(1 for token in toks if token not in DECOMPOSITION_SYNTAX)
    covered_semantic = semantic_token_count - len(residual)
    coverage = (
        covered_semantic / semantic_token_count if semantic_token_count else 0.0
    )
    instrument_ids = []
    concept_ids = []
    for match in sorted(matches, key=lambda x: (x["start"], x["end"])):
        target = instrument_ids if match["kind"] == "instrument" else concept_ids
        if match["id"] not in target:
            target.append(match["id"])

    if not residual and instrument_ids:
        state = "identity"
    elif not residual and concept_ids:
        state = "semantic"
    elif matches:
        state = "partial"
    else:
        state = "unresolved"

    return {
        "matches": sorted(matches, key=lambda x: (x["start"], x["end"])),
        "instrument_ids": instrument_ids,
        "concept_ids": concept_ids,
        "residual_tokens": residual,
        "coverage": round(coverage, 6),
        "decomposition_state": state,
        "fully_semantic": state in {"identity", "semantic"},
        "fully_identity_decomposed": state == "identity",
    }


def collect_source_instrument_expressions(corpus: sqlite3.Connection) -> list[dict]:
    stats: dict[str, dict] = {}
    for track_id, content_raw in corpus.execute(
        """SELECT track_id,content_raw
           FROM prompt_section
           WHERE canonical_key='instruments'
           ORDER BY track_id,ordinal"""
    ):
        seen_track: set[str] = set()
        for surface in split_instrument_segments(content_raw):
            label_norm = norm(surface)
            if not label_norm:
                continue
            row = stats.setdefault(
                label_norm,
                {
                    "label": surface,
                    "label_norm": label_norm,
                    "occurrence_count": 0,
                    "track_count": 0,
                },
            )
            row["occurrence_count"] += 1
            if label_norm not in seen_track:
                row["track_count"] += 1
                seen_track.add(label_norm)
    return sorted(
        stats.values(),
        key=lambda row: (-row["track_count"], -row["occurrence_count"], row["label_norm"]),
    )


def materialize_instrument_expressions(
    knowledge: sqlite3.Connection,
    corpus: sqlite3.Connection,
    *,
    provenance_key: str = "vault-instrument-expressions",
) -> dict:
    """Materialize every source-backed Instruments phrase as a selectable row."""
    cur = knowledge.cursor()
    cur.execute(
        """INSERT OR IGNORE INTO provenance(
             provenance_key,source_kind,source_ref,extraction_rule_version,notes
           ) VALUES (?,?,?,?,?)""",
        (
            provenance_key,
            "factory",
            "prompt_section:instruments",
            "instrument-expression-v1",
            "Every comma/semicolon-delimited Instruments source segment is preserved as a selectable expression; semantic decomposition is additive metadata.",
        ),
    )

    expressions = collect_source_instrument_expressions(corpus)
    instrument_phrases, concept_phrases = compiled_semantic_lexicon(knowledge)
    counts = Counter()

    cur.execute("DELETE FROM instrument_expression_search")
    cur.execute("DELETE FROM instrument_expression_concept")
    cur.execute("DELETE FROM instrument_expression_instrument")
    cur.execute("DELETE FROM instrument_expression")

    for row in expressions:
        result = decompose_surface(
            row["label"], instrument_phrases, concept_phrases
        )
        eid = expression_id(row["label_norm"])
        base_instrument_id = (
            result["instrument_ids"][0]
            if len(result["instrument_ids"]) == 1
            else None
        )
        cur.execute(
            """INSERT INTO instrument_expression(
                 id,label,label_norm,output_text,source_kind,status,selectable,
                 base_instrument_id,occurrence_count,track_count,
                 decomposition_state,semantic_coverage,residual_json,provenance_key
               ) VALUES (?,?,?,?,?,'source',1,?,?,?,?,?,?,?)""",
            (
                eid,
                row["label"],
                row["label_norm"],
                row["label"],
                "factory",
                base_instrument_id,
                row["occurrence_count"],
                row["track_count"],
                result["decomposition_state"],
                result["coverage"],
                json.dumps(result["residual_tokens"], ensure_ascii=False),
                provenance_key,
            ),
        )

        instrument_ordinal = 0
        concept_ordinal = 0
        semantic_terms: list[str] = []
        for match in result["matches"]:
            semantic_terms.append(match["label"])
            if match["kind"] == "instrument":
                cur.execute(
                    """INSERT OR IGNORE INTO instrument_expression_instrument(
                         expression_id,instrument_id,role,ordinal
                       ) VALUES (?,?,?,?)""",
                    (eid, match["id"], match.get("role") or "identity", instrument_ordinal),
                )
                instrument_ordinal += 1
            else:
                cur.execute(
                    """INSERT OR IGNORE INTO instrument_expression_concept(
                         expression_id,entry_id,role,ordinal
                       ) VALUES (?,?,?,?)""",
                    (eid, match["id"], match.get("role"), concept_ordinal),
                )
                concept_ordinal += 1
        semantic_terms.extend(result["residual_tokens"])
        cur.execute(
            """INSERT INTO instrument_expression_search(
                 expression_id,label,semantic_terms
               ) VALUES (?,?,?)""",
            (eid, row["label"], " ".join(semantic_terms)),
        )
        counts[result["decomposition_state"]] += 1

    knowledge.commit()
    return {
        "instrument_expressions": len(expressions),
        "instrument_expression_identity": counts["identity"],
        "instrument_expression_semantic_only": counts["semantic"],
        "instrument_expression_partial": counts["partial"],
        "instrument_expression_unresolved": counts["unresolved"],
        "instrument_expression_selectable": len(expressions),
    }
