# Project Status

**Last updated:** 2026-09-21  
**Current milestone:** **Runtime Pack v1 implemented** — owner-local real-data validation, then TypeScript compiler foundation

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
- `scripts/data/export_runtime_v1.py` compiles deterministic runtime payloads from `knowledge.sqlite` with plan/status, resumable staged work, stale-source rejection, validation, atomic promotion and previous-pack retention.
- Synthetic tests cover lossless source-expression export, no-op reruns, stale-work recovery and last-known-good retention.
- No UI/runtime third-party packages have been installed yet; dependency versions/licenses remain gated until the TypeScript application scaffold.

## Current blocker

**No architecture blocker.** The new Runtime Pack exporter still needs one owner-local run against the real completed `knowledge.sqlite` so actual payload counts/sizes can be recorded before deciding whether any further sharding is justified.

Future enrichment does not reopen the V1 database milestone unless it changes schema/invariants.

## Next concrete phase

Proceed in this order:

1. run Runtime Pack v1 `--plan`, export and `--status` against the real owner-local `knowledge.sqlite`; record pack sizes/counts and verify all 6,035 Factory expressions survive;
2. scaffold the strict TypeScript/pnpm workspace and `music-spec` package;
3. implement the pure MusicSpec -> `suno-structured-v1` compiler and 1,000-character semantic budget engine;
4. add runtime-data/search repositories, then the modular V'gine design-system/motion foundation and Studio UI.

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