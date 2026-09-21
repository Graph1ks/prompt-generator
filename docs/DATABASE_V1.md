# Prompt V'gine — Database V1

**Status:** complete / accepted foundation  
**Milestone date:** 2026-09-21  
**Canonical schemas:** `schema/corpus-v2.sql`, `schema/curation-v1.sql`, `schema/knowledge-v1.sql`

> `Database V1` is the product/data milestone. `corpus-v2` is the current technical schema revision of the disposable evidence database; it does not mean there is a separate unfinished Database V2 product milestone.

## 1. Completion statement

Database V1 is complete as the reproducible data foundation for Prompt V'gine.

The last owner-local semantic-completion snapshot established:

- 10,043 Factory tracks;
- 115,736 parsed structured-prompt sections;
- 852,459 structured-prompt tokens;
- 24 Major Genres;
- 1,564 taxonomy genres/subgenres;
- completed genre crosswalk: 138 reviewed decisions and 0 unresolved genre-crosswalk candidates;
- 6,035 unique source-backed Instruments expressions;
- 6,035 / 6,035 Instruments expressions fully semantic;
- 0 semantic residual expressions;
- 4,472 / 6,035 fully identity-decomposed expressions (~74.1%);
- 9 instrument families, 164 canonical instrument entities, and 161 active aliases in the last completion snapshot;
- every source-backed Instruments expression remains first-class, selectable, and renderable with preserved source wording;
- `suno-structured-v1` has a hard 1,000-character style-prompt budget, backed by the current Factory where all 10,043 structured prompts are <= 1,000 characters.

`fully identity-decomposed` is intentionally stricter than `fully semantic`. Semantic-only sound layers are valid and are not forced into fake instrument identities merely to increase an identity metric.

After repository changes that advance the compiler/build revision, the owner should run the bundled database finalizer once. That recompiles/validates the local generated knowledge database; it is release finalization, not another semantic-curation phase.

## 2. The three-database model

| Database | Role | Durable? | Normal runtime dependency? | Rebuild policy |
|---|---|---:|---:|---|
| `corpus.sqlite` | Lossless Factory evidence, parsed prompt corpus, mining/statistics/search evidence | No | No | Disposable/rebuildable from Factory sources |
| `curation.sqlite` | Human/AI-reviewed authoring decisions and stable patches | **Yes** | No | **Never replace during ordinary rebuilds**; back up before bulk mutation |
| `knowledge.sqlite` | Compiled product knowledge: taxonomy, expressions, semantics, renderer config, search | No | Yes for native/server; source for web runtime bundles | Disposable/recompiled from corpus + durable curation |

Generated databases, Factory source files, reports, checkpoints, and backups remain local-only and are not committed to GitHub.

## 3. `corpus.sqlite` — evidence/mining database

Schema: `schema/corpus-v2.sql`.

This database preserves source evidence and supports mining. It is not the product's canonical user-facing knowledge store.

| Table | Purpose |
|---|---|
| `schema_migrations`, `build_meta` | Schema/build/source fingerprint metadata |
| `source_file` | Factory source identity, version and hash metadata |
| `track` | One source track plus original structured prompt / negative prompt / arrangement fields |
| `section_label_map` | Raw-to-canonical section-label mapping |
| `prompt_section` | Parsed `[Header: content]` sections per track |
| `prompt_clause` | Clause-level splits inside prompt sections |
| `prompt_section_fts` | FTS search over prompt-section evidence |
| `token_occurrence` | Positional normalized token occurrences |
| `token_section_stat` | Token frequency by section |
| `phrase_candidate` | Repeated n-gram/phrase mining candidates |
| `section_value_stat` | Repeated complete section-value evidence |
| `genre_section_token_stat` | Genre-by-section lexical evidence |
| `negative_item` | Canonicalized Exclude/negative-prompt item evidence |
| `track_negative_item` | Track-to-negative-item occurrences/order |
| `negative_item_stat` | Aggregate negative-item statistics |
| `major_genre_raw` | Raw Major Genre taxonomy imported from source |
| `genre_raw` | Raw genre/subgenre taxonomy imported from source |
| `genre_major_raw` | Raw many-to-many genre -> Major Genre relationships |
| `genre_crosswalk_candidate` | Evidence/candidates for Vault genre-label mapping |
| `section_sequence_stat` | Observed structured-prompt section-order patterns |
| `corpus_profile` | Aggregate corpus metrics/profile values |

## 4. `curation.sqlite` — durable reviewed authoring state

Schema: `schema/curation-v1.sql`.

This is the **only non-disposable database** in the pipeline. It stores reviewed intent, not generated source evidence.

| Table | Purpose |
|---|---|
| `schema_migrations`, `curation_meta` | Curation schema/version/operator metadata |
| `entry_patch` | Stable knowledge-entry additions/updates/deprecations |
| `term_variant_patch` | Reviewed aliases/term variants |
| `definition_patch` | Reviewed dictionary definitions |
| `context_definition_patch` | Section/parameter/genre/etc. contextual explanations |
| `relation_patch` | Reviewed semantic relations between knowledge entries |
| `genre_crosswalk_decision` | Explicit reviewed source-genre mapping/composite/taxonomy-gap decisions |
| `instrument_family_patch` | Canonical instrument-family authoring |
| `instrument_patch` | Canonical instrument/group identities |
| `instrument_alias_patch` | Aliases/spellings/variants bound to canonical instruments |
| `instrument_trait_patch` | Reviewed intrinsic instrument-trait relations |
| `parameter_patch` | Advanced-mode parameter definitions |
| `parameter_option_patch` | Parameter-option/output-fragment authoring |
| `statement_patch` | Easy-mode reviewed statements/combinations |
| `statement_concept_patch` | Statement -> semantic concept links |
| `statement_option_patch` | Statement -> parameter-option links |
| `candidate_review` | Durable unresolved/review queue state where needed |

Ordinary Factory rebuilds must never delete or replace `curation.sqlite`. Bulk apply workflows are backup-first, fingerprint/hash-bound, transactional, followed by automatic recompile + validation, and rollback-safe.

## 5. `knowledge.sqlite` — compiled product knowledge

Schema: `schema/knowledge-v1.sql`.

This is the compiled semantic/product database produced from current Factory evidence plus durable curation.

### Core dictionary / provenance

| Table | Purpose |
|---|---|
| `schema_migrations`, `build_meta` | Compiled schema/build/source/curation fingerprints |
| `knowledge_entry` | Stable semantic dictionary/concept records |
| `term_variant` | Search/matching surfaces and aliases |
| `definition` | Layered global definitions |
| `context_definition` | Context-specific definitions |
| `knowledge_relation` | Semantic relationships between entries |
| `provenance` | Source/provenance metadata for generated/curated knowledge |

### Genre model

| Table | Purpose |
|---|---|
| `major_genre` | Canonical Major Genres |
| `genre` | Canonical genre/subgenre entities |
| `genre_major` | Many-to-many genre -> Major Genre memberships |
| `genre_alias` | Canonical genre aliases/normalized forms |
| `genre_source_mapping` | Explicit source-label mapping, including composites |
| `genre_trait` | Evidence-backed genre -> section -> concept traits |

### Instruments — critical two-layer model

| Table | Purpose |
|---|---|
| `instrument_family` | Canonical families such as guitars/keyboards/woodwinds/etc. |
| `instrument` | Canonical instrument/group identities |
| `instrument_alias` | Aliases bound to canonical identities |
| `instrument_trait` | Intrinsic instrument -> concept traits |
| `instrument_expression` | **Every source Instruments phrase as a first-class selectable/renderable entity** |
| `instrument_expression_instrument` | Expression -> canonical instrument identity links |
| `instrument_expression_concept` | Expression -> reusable semantic concept links |
| `instrument_expression_search` | FTS search across expression wording + semantics |

The source expression layer and the canonical identity layer are intentionally separate. Example: `clean rhythm electric guitar` remains its own selectable output phrase while also linking to Electric Guitar + Clean + Rhythm semantics.

### Prompt editor / renderer model

| Table | Purpose |
|---|---|
| `prompt_section_definition` | Canonical prompt facets/headers/order/visibility |
| `parameter` | Advanced-mode parameter dimensions |
| `parameter_option` | Parameter options + output fragments |
| `statement` | Easy-mode reviewed phrase/combo/template choices |
| `statement_concept` | Statement -> concept links |
| `statement_option` | Statement -> parameter-option links |
| `renderer_profile` | Versioned renderer configuration; `suno-structured-v1` carries `max_characters=1000` |
| `renderer_section` | Renderer section order/labels/soft character targets/source evidence counts |
| `exclude_entry` | Separate Exclude output vocabulary |
| `knowledge_search` | FTS search for compiled knowledge/dictionary |

## 6. Database V1 invariants

The following are hard rules, not suggestions:

1. All source-backed Instruments expressions remain first-class selectable/renderable entities.
2. Canonical instrument identity and semantic concepts are additive metadata; they never replace source expressions.
3. Source expression output wording is preserved.
4. Semantic-only expressions are valid; do not fabricate identities to reach 100% identity coverage.
5. Corpus frequency is review-priority evidence only, never automatic semantic truth.
6. `curation.sqlite` is durable and must survive all ordinary Factory/corpus/knowledge rebuilds.
7. `corpus.sqlite` and `knowledge.sqlite` are generated artifacts and may be rebuilt after validation.
8. Raw Factory files/generated databases/reports/backups stay local and untracked.
9. Exclude is a separate output channel, not a structured prompt section.
10. `suno-structured-v1` must remain <= 1,000 characters; never solve overflow with blind final-string truncation.

## 7. Build and promotion lifecycle

Canonical owner flow after database/compiler changes:

```powershell
Set-Location D:\prompt-engine
git pull

py scripts\data\database_foundation_session.py finalize `
  --out-dir ".local-data\current" `
  --vault ".local-data\source\GRAPH1KS_PUBLIC_VAULT_FACTORY.json.gz" `
  --genre-map ".local-data\source\GRAPH1KS_GENRE_MAP_FACTORY.json"
```

The finalizer recompiles as needed, validates all three databases, refreshes reports, checks source-expression invariants and writes the owner-local acceptance report.

Current semantic completion is terminal: a completion plan with zero residuals should report `status: complete`, `batch_count: 0`, and no further semantic-review action.

## 8. What is Post-V1 rather than unfinished Database V1

The following work may continue additively without reopening the Database V1 milestone:

- richer Vocal knowledge (the current Factory has no structured Vocal corpus coverage);
- further Easy-mode statement authoring;
- further Advanced parameter/option authoring;
- richer dictionary definitions/context definitions/relations;
- genre/instrument recommendations and quality checks;
- runtime bundle/shard compilation for web/native/server;
- TypeScript MusicSpec -> renderer/compiler implementation;
- UI search/browse/editor integration;
- new Factory snapshot ingestion/diff review.

Schema/invariant changes can create a future database milestone, but ordinary knowledge enrichment is additive V1-compatible evolution.

## 9. Next-thread starting point

A new worker should read, in order:

1. `AGENTS.md`
2. `PROJECT.md`
3. `STATUS.md`
4. `docs/HANDOVER.md`
5. **`docs/DATABASE_V1.md`**
6. `docs/DATA_ARCHITECTURE.md`
7. `docs/MUSICSPEC_V1.md`
8. `docs/PROMPT_FORMAT.md`

Do not restart genre crosswalk or Instruments semantic-completion work. The next primary phase is runtime/compiler/product implementation on top of this stable database contract.