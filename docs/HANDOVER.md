# Handover — Runtime-backed Genre Studio

**Last updated:** 2026-09-21  
**Handoff target:** reusable picker pattern + Instruments/knowledge runtime controls  
**Milestone:** Database V1 remains closed; the React/Vite Studio now consumes the real Runtime Pack, edits Genre influences in MusicSpec and renders the production compiler preview

## Read this first

Read in this order:

1. `AGENTS.md`
2. `PROJECT.md`
3. `STATUS.md`
4. **`docs/DATABASE_V1.md`**
5. `docs/DATA_ARCHITECTURE.md`
6. `docs/MUSICSPEC_V1.md`
7. `docs/PROMPT_FORMAT.md`
8. `docs/RUNTIME_DATA_CONTRACT_V1.md`
9. `docs/APPLICATION_ARCHITECTURE.md`
10. `docs/COMPILER_V1.md`
11. `docs/RUNTIME_SEARCH_V1.md`
12. `docs/DESIGN_SYSTEM_V1.md`
13. `docs/STUDIO_RUNTIME_GENRE_V1.md`
14. `docs/LOCAL_OUTPUT_LAYOUT.md` when operating local reports/logs
15. `docs/LOCAL_DATA_BUILD.md` only when operating the local databases

Owner workspace: `D:\prompt-engine`.

Real Factory files, generated SQLite databases, reports, checkpoints and backups are local-only and must never be committed.

## What has been completed

### Source/corpus baseline

- 10,043 tracks
- 115,736 structured-prompt sections
- 852,459 structured-prompt tokens
- 24 Major Genres
- 1,564 taxonomy genres/subgenres

### Genre

- Genre crosswalk completed locally.
- 138 reviewed crosswalk decisions applied.
- 0 unresolved genre-crosswalk candidates remain for the current Factory snapshot.

### Instruments

- Current Factory contains 6,035 unique comma/semicolon-delimited Instruments expressions.
- Every source expression is a first-class `instrument_expression` row.
- Every source expression remains selectable/renderable with source wording preserved.
- Canonical identity and semantic concepts are linked underneath expressions; they never replace the expression.
- Semantic completion reached **6,035 / 6,035**.
- Semantic residuals reached **0**.
- Fully identity-decomposed: **4,472 / 6,035 (~74.1%)**.
- Last completion snapshot catalog: **9 families / 164 canonical instrument entities / 161 active aliases**.

Do not treat ~74.1% identity coverage as unfinished work. Semantic-only layers such as effects/pads/noise/arrangement sources may be completely understood without a canonical physical-instrument identity.

### Renderer budget

The Factory proves a hard `structured_prompt` maximum of **1,000 characters**:

- median 716
- P90 898
- P95 936
- P99 982
- maximum 1,000
- 0 source prompts above 1,000

`suno-structured-v1` stores `max_characters=1000` plus source-derived P90 soft section targets. Overflow must be solved semantically before serialization; never blindly slice the final string.

## Database architecture — do not simplify it

Database V1 uses three SQLite files:

### `corpus.sqlite`

Disposable evidence/mining DB generated from Factory sources. Contains tracks, raw/parsed sections, clauses, tokens, phrase/stat evidence, negative-prompt evidence, raw genre taxonomy/crosswalk evidence and aggregate profile data.

### `curation.sqlite`

**Durable authoring state.** Contains reviewed patches/decisions for knowledge entries, variants, definitions, relations, genre crosswalk, instruments/aliases/traits, parameters/options, statements and review state.

Never replace/delete this during an ordinary source rebuild.

### `knowledge.sqlite`

Disposable compiled product knowledge generated from corpus + durable curation. Contains canonical genre/instrument knowledge, the complete Instruments expression catalog, semantic links, definitions/relations, parameters/statements, renderer configuration, Exclude entries and FTS search.

For the exact table inventory, read `docs/DATABASE_V1.md`.

## Critical invariants

1. Every source Instruments expression remains first-class/selectable/renderable.
2. Canonical identity/concepts are additive metadata only.
3. Source expression output text stays lossless.
4. Semantic-only expressions are valid.
5. Frequency is review evidence, never semantic truth.
6. `curation.sqlite` is durable; `corpus.sqlite`/`knowledge.sqlite` are rebuildable.
7. Generated/local source artifacts stay out of Git.
8. Exclude is separate from structured style prompt.
9. Style prompt is <=1,000 characters with semantic compaction, never blind truncation.

## Current repository/data revision

`promptvgine-local-data-build-v2-resumable-3-prompt-budget`

The current schema files are:

- `schema/corpus-v2.sql`
- `schema/curation-v1.sql`
- `schema/knowledge-v1.sql`

`Database V1` is the product milestone; `corpus-v2` is only the evidence-schema implementation revision.

## One owner-local sync may still be required

If the owner has not run the finalizer since the latest main changes, do this once:

```powershell
Set-Location D:\prompt-engine
git pull

py scripts\data\database_foundation_session.py finalize `
  --out-dir ".local-data\current" `
  --vault ".local-data\source\GRAPH1KS_PUBLIC_VAULT_FACTORY.json.gz" `
  --genre-map ".local-data\source\GRAPH1KS_GENRE_MAP_FACTORY.json"
```

This should only recompile/validate generated knowledge as required. It must preserve `curation.sqlite`. This is not a reason to restart semantic curation.

## Do not restart these phases

- genre crosswalk
- Instruments semantic residual review
- Identity Core / Semantic Core style batch cycles for the current snapshot
- source-expression reduction/canonical collapse

Future Factory versions are handled by separate snapshot build + diff review, not by reopening old evidence blindly.

## Runtime Pack v1 implementation now present

Tracked implementation:

- `docs/RUNTIME_DATA_CONTRACT_V1.md`
- `schema/runtime-pack-v1.schema.json`
- `scripts/data/export_runtime_v1.py`
- `tests/test_runtime_export_v1.py`

The exporter writes `core.json`, `genres.json`, `instruments.json`, `instrument-expressions.json`, `editor.json`, `knowledge.json`, `search.json` and `manifest.json`. It is deterministic, resumable at payload-stage boundaries, rejects stale partial work, validates Database V1 expression/budget invariants and retains the last promoted pack during replacement.

Owner-local real Runtime Pack validation completed successfully:

- runtime build ID: `3b774ba611011ef9771c6700e2c5b156f73639a948ad0f83316c28bca8c99bfe`;
- 1,564 genres;
- 6,035 source instrument expressions;
- 9 instrument families / 164 canonical instruments;
- 2,749 knowledge entries;
- 10,348 search documents;
- total uncompressed JSON payload ~10.53 MiB;
- editor payload currently has no statements/parameters/options/Exclude content.

The TypeScript foundation now adds:

- root pnpm workspace, Node 24 LTS baseline and strict TypeScript;
- `packages/music-spec` — typed MusicSpec v1 + runtime validation;
- `packages/compiler` — pure deterministic renderer/budget kernel;
- compiler regression tests using Node's built-in test runner;
- `docs/COMPILER_V1.md` — exact protection/compaction behavior.

`packages/runtime-data` now validates/loads the Runtime Pack bootstrap contract and adapts it into compiler-domain data. `packages/search` now implements deterministic exact/prefix/token/substring ranking with stable IDs and a worker-ready request/response envelope. A real-payload benchmark harness is available as `pnpm bench:search`.

`packages/ui` now provides the semantic token contract, Paradise/Ash themes and the first React primitives. `packages/motion` centralizes causal motion recipes and reduced-motion behavior.

`apps/studio` now stages/loads the owner-local Runtime Pack, validates the bootstrap payload, builds one shared local search index, browses/searches the real 24 Major Genres + 1,564 taxonomy genres, supports valid genre-free MusicSpec plus optional Foundation/Fusion/Accent state, and renders the pure compiler live prompt/budget output. Its presentation is deliberately aligned to the supplied V'GINE Studio concept: editorial intro, horizontal four-stage workflow, large role cards, inline picker, sticky record-sleeve preview and mobile Studio/Preview dock. It intentionally does not invent missing editor content and still does not add Router, Radix, Motion-for-React, Zustand or TanStack.

Real search benchmark acceptance: 10,348 documents; 92.014 ms index build; median 4.900 ms; P95 10.117 ms; P99/max 14.472 ms. Keep the dependency-free kernel unless later profiling proves a concrete need.

Development-runtime rule: `pnpm dev` must build the internal workspace packages before staging Runtime Pack assets and starting Vite. Vite development also resolves exact internal `@vgine/*` JavaScript imports from workspace source, so ignored/stale `packages/*/dist` output cannot hide newly added exports. Production builds continue to validate compiled package output.

## Next-thread mission

Treat Database V1 and Runtime Pack v1 as accepted dependencies and move upward in the stack.

Recommended order:

1. **Reusable Picker pattern** — generalize the proven Genre browse/search/bounded-result mechanics without coupling the pattern to genre semantics.
2. **Instrument-expression repository + picker** — load the detailed expression payload lazily and expose all 6,035 source expressions with stable IDs/search.
3. **Knowledge detail surfaces** — lazy-load dictionary entries/context only when the UI requests them.
4. **Project persistence** — add IndexedDB behind the documented ProjectStorage interface; persist MusicSpec as semantic source truth and model any manual rendered-output override explicitly as secondary project/output state.
5. **Remaining facets / editor enrichment** — expand controls incrementally; add Radix/Motion-for-React only where a concrete interaction warrants the dependency.

## Post-V1 enrichment is allowed but is not a blocker

The following can be added incrementally without declaring Database V1 unfinished:

- Vocal vocabulary/enrichment (current Factory has no structured Vocal corpus coverage);
- more Easy statements;
- more Advanced parameters/options;
- richer definitions/context definitions/relations;
- recommendation/quality-check logic;
- new Factory snapshot data after diff review.

## Definition of success for the next thread

Do not spend the next thread re-mining the database. Produce runtime/compiler/application progress while preserving the V1 DB contract.

If a proposed implementation requires changing a Database V1 invariant, call that out explicitly as a schema/architecture change rather than silently mutating the foundation.

## Interaction additions carried forward

- MusicSpec v1 now accepts zero to three genre influences. Existing v1 documents remain valid.
- Sound DNA can be skipped after one per-prompt warning confirmation.
- Large pools have reusable user favorites with 0.8 s add / 1.0 s remove hold gestures, synchronized progress feedback and usage-based ranking.
- Explicit Show All replaces repeated 12-item paging; expanded Genre lists include a floating return-to-top action and collapse after selection.
- Page reset clears only the current chapter's state; new prompt reset clears the complete prompt session but not user favorites.
- The final Style output may be manually overridden. The override never mutates MusicSpec; restoring the original returns to the current deterministic compiler result.
- `docs/VGINE_LEXICON_ENTRY.md` documents the verified product-name history. The knowledge compiler seeds the V'gine entry reproducibly; rebuild owner-local knowledge/runtime data to surface it.

## Studio i18n / Genre picker v2 carry-forward

- UI locale and renderer language are separate. German/English UI is implemented via typed catalogs; Suno output remains English.
- All 24 Major Genres stay visible in the Genre picker.
- Major Genre Runtime IDs are valid MusicSpec Genre influence IDs; compiler knowledge resolves them alongside subgenres.
- Browsing a Major starts with the pure Major itself, then subgenres.
- Expanded-list return controls are viewport/segment scoped and must not remain visible outside their active expanded segment.
- Explanation mode currently uses icon-only chrome.
- Do not spend the next implementation slice on motion polish; prioritize production facet/pool functionality first.

## Production Instruments carry-forward

- `@vgine/runtime-data` now parses/validates a lazy Instrument Library from `instruments.json` and `instrument-expressions.json`.
- Studio runtime caches that lazy load; Palette triggers it only when the Instruments control mounts.
- The existing Search v1 index supplies `instrument_expression` IDs; no additional search kernel exists.
- MusicSpec generic facet-selection helpers add/remove stable expression selections.
- Instrument selections use `kind: option`, `id: <instrument_expression id>`, `value: <preserved output_text>`, `origin: user`.
- Palette has production search, family filters, selected chips, favorites/usage ordering, explicit Show All, automatic scroll chunking and segment-scoped return-to-start behavior.
- Database V1 semantics/identity curation remain closed. Do not collapse or rewrite source expressions in application code.

## Production generic facet editor carry-forward

- Studio Runtime now lazy-loads/caches `editor.json` with manifest hash/count validation.
- Pulse/Palette/Finish ordinary facets use one generic FacetEditor instead of placeholder/demo state.
- Easy statements honor `mode_scope`; Advanced parameter options honor schema `value_type` cardinality and can add facet custom text.
- Runtime statement `source_frequency` is nullable and must stay nullable.
- Finish has a separate Runtime-backed Exclude picker writing only to `MusicSpec.exclude[]`.
- Favorite add/remove timings are 0.8 s / 1.0 s. Add progress uses theme semantic success green and an animated checkmark.
- Expanded-pool return controls are left-edge, viewport/segment scoped.

## Runtime Knowledge surfaces carry-forward

- `knowledge.json` is a lazy manifest-validated/cached Studio payload, not part of first-paint bootstrap.
- Explanation mode gates subtle Knowledge term affordances.
- Knowledge terms require explicit Runtime Knowledge IDs; never string-match labels into semantic identity in product code.
- Current first consumers: selected Genres, facet section labels, Advanced parameter headings and Instruments section heading.
- Locale resolution is UI-locale -> English fallback; renderer language remains independent.
- Favorite hold durations remain 0.8 s add / 1.0 s remove internally, but duration instructions are intentionally hidden from normal UI/hover copy.
