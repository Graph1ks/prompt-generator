# Curation Workflow

**Status:** v1 local authoring contract

Prompt V'gine separates *evidence* from *accepted knowledge*. The corpus may suggest useful language; the curation DB records the deliberate decisions that the product may later expose.

## 1. Preferred solo-dev workflow

For routine curation, use the bundled report/apply workflow instead of manual query-by-query terminal inspection.

Prepare the full review package:

```powershell
py scripts\data\curation_session.py prepare --out-dir ".local-data\current"
```

Upload/review `reports/curation/genre-crosswalk-review-v1.json`. A reviewed `genre-crosswalk-decisions-v1.json` can then be applied transactionally with `curation_session.py apply`, which backs up curation, recompiles knowledge, validates, rolls back on failure, and refreshes reports.

The lower-level commands below remain expert/debug tools.

## 2. Before manual curation

Build and validate:

```bash
python scripts/data/build_local_data.py \
  --vault /path/to/GRAPH1KS_PUBLIC_VAULT_FACTORY.json.gz \
  --genre-map /path/to/GRAPH1KS_GENRE_MAP_FACTORY.json \
  --out-dir .local-data/current

python scripts/data/validate_local_data.py --dir .local-data/current
python scripts/data/backup_curation.py --source .local-data/current/curation.sqlite
```

## 3. Evidence first

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

## 4. Knowledge entry

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

## 5. Inline dictionary variants

`term_variant_patch` connects visible words/phrases to an entry.

For `audio:transient` this may eventually include:

- transient
- transients
- transient-forward

Longest phrase matching wins in the future UI, so a specific phrase such as `Dark Jazz` can resolve before the shorter `Jazz`.

Term variants are locale-aware.

## 6. Definitions

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

## 7. Current-project explanation

Do **not** store every possible “what this means in your song” sentence in the DB.

That third explanation layer is generated later from:

- MusicSpec;
- the selected concept/option;
- current facet;
- genre influence/routing;
- related active selections.

Static curation supplies the trustworthy building blocks.

## 8. Genre crosswalk decisions

The initial 138-item local genre crosswalk has been reviewed/applied successfully. Future Factory snapshots may add unresolved labels; those continue to use the same report/decision-bundle workflow.

## 9. Instruments

Start this phase with `py scripts\\data\\knowledge_mining_session.py prepare --out-dir ".local-data\\current"`. Review the generated instrument and lexicon JSON files; the full CSV files remain local evidence.

Reviewed instrument/lexicon knowledge is applied through a decision bundle rather than manual SQL:

```powershell
py scripts\data\knowledge_curation_session.py apply --out-dir ".local-data\current" --bundle ".local-data\current\reports\knowledge\knowledge-curation-decisions-v1.json" --vault ".local-data\source\GRAPH1KS_PUBLIC_VAULT_FACTORY.json.gz" --genre-map ".local-data\source\GRAPH1KS_GENRE_MAP_FACTORY.json"
```

The apply bundle is backed up, transactional, fingerprint/hash-bound to the reviewed evidence, automatically recompiled/validated, and rollback-safe. After database-foundation acceptance, `knowledge_completion_session.py prepare` writes SHA-addressed residual review batches plus `knowledge-curation-decisions-v2.template.json`; that template binds `report_sha256.completion_plan` to the exact completion plan, and the apply path verifies this artifact before any durable mutation.

Important decomposition rule: every source Instruments-list segment is a **first-class selectable instrument expression**. The complete wording is preserved because words such as clean, distorted, muted, warm, layered, lead, rhythm, programmed, electronic, staccato, restrained, etc. describe how the instrument/layer is played, voiced, processed, or arranged.

That full expression is not the same thing as canonical instrument identity. Prompt V'gine therefore stores both:

- the original/source-backed `instrument_expression` as the actual selectable/renderable phrase;
- canonical instrument entities for stable identity/search/grouping;
- reusable concepts/options for the expression's playing/processing/role semantics.

Example: `clean rhythm electric guitar` remains selectable and renders exactly as that phrase, while its semantic links can resolve Electric Guitar + Clean + Rhythm. Decomposition is additive metadata, never a reason to discard the compound expression.

All source expressions are generated into `knowledge.sqlite` automatically. Curation improves their semantic links; it does not decide whether the source expression is allowed to exist.

Curate canonical identity separately through:

- `instrument_family_patch`;
- `instrument_patch`;
- `instrument_alias_patch`;
- `instrument_trait_patch`.

Model attack, sustain, register, articulation, saturation, width, role, playing method, and similar semantics as concepts/options so they can explain and recombine expressions without destroying the original source phrase.

## 10. Advanced parameters/options

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

## 11. Easy statements

`statement_patch` contains reviewed phrases/combinations for Easy mode.

Examples:

- `laid-back swung pocket`;
- `dry punchy drums with restrained fills`;
- `warm centered bass with short notes`.

A statement can link to concepts/options through:

- `statement_concept_patch`;
- `statement_option_patch`.

This is what keeps Easy and Advanced reversible views of the same semantic state instead of two unrelated prompt systems.

## 12. Rebuild after curation

After changing `curation.sqlite`, rerun the normal builder command. The v2 builder detects the curation fingerprint change, keeps the corpus, and recompiles the affected knowledge stages.

The builder:

1. rebuilds corpus evidence;
2. rebuilds taxonomy/bootstrap knowledge;
3. leaves `curation.sqlite` untouched;
4. overlays curation;
5. rebuilds knowledge search;
6. writes a local build report.

Then validate again.

## 13. Status discipline

Use curation statuses deliberately:

- `candidate` / `draft` — not product-ready;
- `reviewed` — examined, may be usable in authoring/internal surfaces;
- `approved` — product-ready;
- `deprecated` — retained for migration/history but not normally offered.

Never bulk-promote corpus candidates based solely on frequency.
