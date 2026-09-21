# Project Status

**Last updated:** 2026-09-21  
**Current milestone:** **Runtime-backed Genre Studio slice implemented** — next: reusable picker pattern + Instruments/knowledge controls

## Completion verdict

Database V1 is complete as Prompt V'gine's reproducible data foundation.

The Instruments semantic-completion phase is closed for the current Factory snapshot: every source-backed Instruments expression is preserved as a first-class selectable/renderable entity and every one is fully semantically explained. Remaining identity-only gaps are not errors; semantic-only sound layers are valid by design.

## Last owner-local completion snapshot

- Factory tracks: **10,043**
- Parsed structured-prompt sections: **115,736**
- Structured-prompt tokens: **852,459**
- Major Genres: **24**
- Taxonomy genres/subgenres: **1,564**
- Genre crosswalk: **138 reviewed decisions, 0 unresolved candidates**
- Source-backed Instruments expressions: **6,035**
- Fully semantic Instruments expressions: **6,035 / 6,035 (100%)**
- Semantic residual expressions: **0**
- Fully identity-decomposed expressions: **4,472 / 6,035 (~74.1%)**
- Canonical instrument families: **9**
- Canonical instrument entities: **164**
- Active instrument aliases: **161**

`fully_identity_decomposed` is intentionally stricter than semantic completion. Do not invent fake identities merely to raise that metric.

## Database layout

Prompt V'gine uses three local SQLite products:

1. `corpus.sqlite` — disposable Factory evidence/mining database;
2. `curation.sqlite` — **durable** reviewed authoring/curation state; never replace during normal rebuilds;
3. `knowledge.sqlite` — disposable compiled product knowledge/runtime source.

The canonical table-by-table overview and invariants live in **`docs/DATABASE_V1.md`**.

## Completed V1 guarantees

- All 6,035 source Instruments expressions are materialized and remain selectable.
- Original source-facing expression/output wording is preserved.
- Canonical identities + semantic concepts are additive metadata only.
- Genre crosswalk is complete for the current snapshot.
- Instruments semantic residual queue is empty.
- Shared-head coordination, guarded hyphen decomposition, Unicode/apostrophe/acronym tokenization, and explicit grammar scaffolding are covered by synthetic regression tests.
- Durable curation is backup-first, fingerprint/hash-bound, transactional, recompiled/validated automatically, and rollback-safe.
- Long-running builds are resumable and preserve last-known-good promoted artifacts.
- `suno-structured-v1` has a hard **1,000-character** style-prompt ceiling; current Factory maximum is exactly 1,000 and no source prompt exceeds it.
- Exclude remains a separate output channel and does not consume the style-prompt budget.

## Current build/compiler revision

`promptvgine-local-data-build-v2-resumable-3-prompt-budget`

Current repository-side database tooling is complete for V1. If the owner-local generated DBs have not yet been recompiled after the latest renderer-budget/schema merge, run the bundled finalizer once. That is synchronization/final validation, **not another curation phase**.

## Owner-local final synchronization

```powershell
Set-Location D:\prompt-engine
git pull

py scripts\data\database_foundation_session.py finalize `
  --out-dir ".local-data\current" `
  --vault ".local-data\source\GRAPH1KS_PUBLIC_VAULT_FACTORY.json.gz" `
  --genre-map ".local-data\source\GRAPH1KS_GENRE_MAP_FACTORY.json"
```

Expected result: acceptance remains `status: ok`; the compiled knowledge DB is stamped with the latest build/renderer contract. No further `knowledge_completion_session.py` review batches are expected for the current snapshot.

## Runtime/application foundation now implemented

- Application architecture is frozen in `docs/APPLICATION_ARCHITECTURE.md` and ADR-021 through ADR-029.
- Runtime Pack v1 is frozen in `docs/RUNTIME_DATA_CONTRACT_V1.md` + `schema/runtime-pack-v1.schema.json`.
- Owner-local Runtime Pack v1 validation succeeded against the completed real `knowledge.sqlite`: runtime build ID `3b774ba611011ef9771c6700e2c5b156f73639a948ad0f83316c28bca8c99bfe`; 1,564 genres; 6,035 instrument expressions; 164 canonical instruments across 9 families; 2,749 knowledge entries; 10,348 search documents; ~10.53 MiB uncompressed payload total.
- The validated runtime `editor.json` currently contains 0 parameters/options/statements/Exclude entries. That is a Post-V1 enrichment/product-content gap, not a Runtime Pack failure.
- `scripts/data/export_runtime_v1.py` compiles deterministic runtime payloads from `knowledge.sqlite` with plan/status, resumable staged work, stale-source rejection, validation, atomic promotion and previous-pack retention.
- Strict TypeScript/pnpm workspace is present with `@vgine/music-spec` and pure `@vgine/compiler`.
- Compiler v1 performs MusicSpec runtime validation, canonical structured rendering, separate Exclude output, exact semantic deduplication, deterministic lower-priority omission, Unicode code-point budgeting and explicit `budget_conflict` diagnostics without blind truncation.
- `@vgine/runtime-data` validates Runtime Pack v1 bootstrap payloads, manifest counts and optional hashes, then adapts renderer/genre data into the pure compiler view.
- `@vgine/search` provides dependency-free deterministic local ranking, stable-ID results and a worker-ready request/response protocol.
- `@vgine/ui` now owns semantic design tokens and the Paradise/Ash theme contract with no external font/component framework.
- `@vgine/motion` now owns durations/easings/springs and named causal recipes with reduced-motion behavior; no animation library dependency is required at this layer.
- Real 10,348-document search benchmark accepted: 92.014 ms one-time index build; median 4.900 ms, P95 10.117 ms, P99/max 14.472 ms. The dependency-free kernel remains the production baseline; no fuzzy/index dependency or Worker is justified by current measurements.
- React 19.3.0 + React DOM 19.3.0 + Vite 8.3.0 + @vitejs/plugin-react 6.1.1 are now pinned and reviewed; no Router/Radix/Motion-for-React/Zustand/TanStack package is installed yet.
- `apps/studio` now stages and validates the real Runtime Pack, builds one shared search index, renders a production Genre picker over 24 Major Genres / 1,564 taxonomy genres, writes stable IDs into shared MusicSpec state, and drives the pure compiler/live 1,000-character budget preview.
- `@vgine/ui` now includes the first reusable React primitives (`Surface`, `Button`, `IconButton`, `Text`, `Stack`, `Cluster`) styled only through V'gine semantic tokens.
- Local operator outputs are standardized: flat `reports/`, separate `logs/`, durable `.local-data/backups/`; legacy nested report folders have a safe plan/apply migrator.

## Current blocker

**No implementation blocker.** Search performance, Runtime Pack loading, Genre selection, MusicSpec creation and live compiler preview are all validated in the current application slice. Owner-local visual/touch review remains useful but is not an architecture blocker.

Future enrichment does not reopen the V1 database milestone unless it changes schema/invariants.

## Next concrete phase

Proceed in this order:

1. extract the Genre browse/search/result mechanics into the reusable V'gine Picker/SearchResults pattern;
2. add lazy Runtime Pack repositories for instrument expressions and knowledge detail payloads;
3. implement the production Instruments picker over all 6,035 source expressions without mounting giant lists;
4. add ProjectStorage/IndexedDB persistence for versioned MusicSpec projects;
5. expand the remaining facets and additive editor-content enrichment without reopening Database V1.

## Do not redo

- Do not redo the completed genre crosswalk.
- Do not reopen the 6,035-expression semantic review merely because identity coverage is below 100%.
- Do not collapse source expressions into the canonical-instrument list.
- Do not remove semantic-only sound layers.
- Do not delete/replace durable `curation.sqlite`.
- Do not commit Factory/generated DB/report/backup artifacts.
- Do not promote corpus frequency to semantic truth.
- Do not implement the 1,000-character limit as blind `prompt[:1000]` truncation.

## Canonical continuation docs

- `docs/DATABASE_V1.md` — completed DB structure/table map/invariants
- `docs/HANDOVER.md` — next-thread handoff
- `docs/DATA_ARCHITECTURE.md` — lifecycle/architecture
- `docs/LOCAL_DATA_BUILD.md` — owner-local build/finalization commands
- `docs/MUSICSPEC_V1.md` — application semantic state
- `docs/PROMPT_FORMAT.md` — renderer contract
- `docs/RUNTIME_DATA_CONTRACT_V1.md` — compiled application data boundary
- `docs/APPLICATION_ARCHITECTURE.md` — production stack, module/design/motion architecture
- `docs/COMPILER_V1.md` — implemented compiler/budget behavior
- `docs/RUNTIME_SEARCH_V1.md` — runtime loader/search contract and benchmark gate
- `docs/DESIGN_SYSTEM_V1.md` — semantic themes/tokens/motion foundation
- `docs/STUDIO_RUNTIME_GENRE_V1.md` — real Runtime Pack staging, Genre picker and live compiler integration
- `docs/LOCAL_OUTPUT_LAYOUT.md` — canonical local reports/logs/backups layout