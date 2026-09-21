# Curation Workflow

**Status:** v1 local authoring contract

Prompt V'gine separates *evidence* from *accepted knowledge*. The corpus may suggest useful language; the curation DB records the deliberate decisions that the product may later expose.

## 1. Before curation

Build and validate:

```bash
python scripts/data/build_local_data.py \
  --vault /path/to/GRAPH1KS_PUBLIC_VAULT_FACTORY.json.gz \
  --genre-map /path/to/GRAPH1KS_GENRE_MAP_FACTORY.json \
  --out-dir .local-data/current

python scripts/data/validate_local_data.py --dir .local-data/current
python scripts/data/backup_curation.py --source .local-data/current/curation.sqlite
```

## 2. Evidence first

Use `query_corpus.py` before writing a concept.

Examples:

```bash
python scripts/data/query_corpus.py --db .local-data/current/corpus.sqlite term grit
python scripts/data/query_corpus.py --db .local-data/current/corpus.sqlite term transient
python scripts/data/query_corpus.py --db .local-data/current/corpus.sqlite section bass
python scripts/data/query_corpus.py --db .local-data/current/corpus.sqlite genre "Boom Bap"
python scripts/data/query_corpus.py --db .local-data/current/corpus.sqlite candidates space_mix --min-count 20
```

Frequency is evidence, not approval. Grammatical fragments such as `kick and` can be frequent while being useless as product concepts.

## 3. Knowledge entry

A new semantic concept starts in `entry_patch`.

Example conceptual record:

```text
entry_id:        audio:grit
entry_type:      production_term
canonical_label: Grit
status:          approved
difficulty:      beginner
```

Stable IDs should describe the concept rather than a temporary sentence. Once a stable ID is used in projects/relations, rename the display label rather than replacing the ID.

## 4. Inline dictionary variants

`term_variant_patch` connects visible words/phrases to an entry.

For `audio:transient` this may eventually include:

- transient
- transients
- transient-forward

Longest phrase matching wins in the future UI, so a specific phrase such as `Dark Jazz` can resolve before the shorter `Jazz`.

Term variants are locale-aware.

## 5. Definitions

Definitions are layered.

`definition_patch`:

- `one_liner` — shortest layperson answer;
- `plain` — fuller beginner explanation;
- `why_it_matters` — audible consequence;
- `hear_it_as` — useful sound analogy;
- `misconception` — optional correction;
- `expert_note` — optional deeper detail.

`context_definition_patch` answers what the same concept means in a specific context:

- section: drums / bass / production / space_mix;
- parameter;
- option;
- genre;
- instrument;
- role.

Do not explain one unknown term using several equally unknown terms. If specialist terminology is necessary, those words should themselves become dictionary concepts.

## 6. Current-project explanation

Do **not** store every possible “what this means in your song” sentence in the DB.

That third explanation layer is generated later from:

- MusicSpec;
- the selected concept/option;
- current facet;
- genre influence/routing;
- related active selections.

Static curation supplies the trustworthy building blocks.

## 7. Genre crosswalk decisions

The first real build seeds unresolved Vault genre labels into `candidate_review`.

A reviewed decision goes into `genre_crosswalk_decision`.

Decision kinds:

- `alias` — the source label is another name/spelling for one canonical genre;
- `composite` — the source label represents multiple canonical influences;
- `taxonomy-gap` — valid source identity not represented cleanly in the current taxonomy;
- `ignore` — deliberately not mapped;
- `defer` — needs more research.

A composite can use multiple rows with the same `source_norm` and different `ordinal`/targets.

Do not turn `Pop Soul` into `Pop` simply because string matching finds one word.

## 8. Instruments

Instrument identity is separate from how it is played/processed.

Curate separately:

- `instrument_family_patch`;
- `instrument_patch`;
- `instrument_alias_patch`.

Then model descriptors such as attack, sustain, register, articulation, saturation, width, and role as concepts/options—not as part of the instrument name.

## 9. Advanced parameters/options

`parameter_patch` defines a controllable musical dimension assigned to one prompt section.

Examples:

- Bass → Attack
- Groove → Swing
- Drums → Fill density
- Space/Mix → Width
- Melody → Register

`parameter_option_patch` defines reviewed verbal states.

Example:

```text
Parameter: Bass Attack
Options:
  soft   → "soft attack"
  medium → "balanced attack"
  sharp  → "sharp attack"
```

No user-facing fake percentages are required unless a real numeric value has musical meaning (for example BPM).

Candidate parameters are not compiled as active controls until reviewed/approved.

## 10. Easy statements

`statement_patch` contains reviewed phrases/combinations for Easy mode.

Examples:

- `laid-back swung pocket`;
- `dry punchy drums with restrained fills`;
- `warm centered bass with short notes`.

A statement can link to concepts/options through:

- `statement_concept_patch`;
- `statement_option_patch`.

This is what keeps Easy and Advanced reversible views of the same semantic state instead of two unrelated prompt systems.

## 11. Rebuild after curation

After changing `curation.sqlite`, rerun the normal builder command. The v2 builder detects the curation fingerprint change, keeps the corpus, and recompiles the affected knowledge stages.

The builder:

1. rebuilds corpus evidence;
2. rebuilds taxonomy/bootstrap knowledge;
3. leaves `curation.sqlite` untouched;
4. overlays curation;
5. rebuilds knowledge search;
6. writes a local build report.

Then validate again.

## 12. Status discipline

Use curation statuses deliberately:

- `candidate` / `draft` — not product-ready;
- `reviewed` — examined, may be usable in authoring/internal surfaces;
- `approved` — product-ready;
- `deprecated` — retained for migration/history but not normally offered.

Never bulk-promote corpus candidates based solely on frequency.
