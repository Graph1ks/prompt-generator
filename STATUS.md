# Project Status

**Last updated:** 2026-09-21  
**Current milestone:** **Database V1 complete** — move to runtime/compiler/product implementation

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

## Current blocker

**None in Database V1.**

Future enrichment does not reopen the V1 database milestone unless it changes schema/invariants. Vocal knowledge, Easy statements, Advanced parameters/options, definitions/relations, runtime bundles, compiler code, and UI integration are Post-V1 additive work.

## Next concrete phase

Proceed to runtime/compiler implementation:

1. compile/export the stable knowledge model into the runtime shape needed by web/native/server;
2. implement deterministic MusicSpec -> `suno-structured-v1` rendering with the 1,000-character semantic budget;
3. wire search/dictionary/genre/instrument-expression data into the application;
4. build Easy/Advanced editing surfaces on the shared MusicSpec state.

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