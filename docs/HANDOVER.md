# Handover

**Last updated:** 2026-09-21
**Current phase/milestone:** owner-local corpus exists and validates; resumable v2 build/tooling + noncommercial licensing foundation complete

## Current objective

Resume on the owner's Windows 11 / VS Code machine at D:\prompt-engine, adopt the existing valid local v1 corpus safely, and proceed into evidence-backed curation.

## Owner-local state already established

The owner has the two real Factory files under .local-data\source\ and a successful local build under .local-data\current\.

The local build completed with 10,043 tracks, 115,736 sections, 852,459 tokens, 24 Major Genres, 1,564 taxonomy genres, and 138 unresolved Vault genre labels. validate_local_data.py passed.

## What is implemented

### Licensing

Graph1ks Material is source-available/noncommercial for third parties.

Authoritative repository files:

- LICENSE
- COMMERCIAL_LICENSE.md
- COPYRIGHT
- LICENSES.md
- THIRD_PARTY_NOTICES.md
- DATA_SOURCES.md

Project-connected donations/tips, advertising, sponsorship, affiliate revenue, paid hosting/SaaS/support, subscriptions, paid access, bundling, and other monetized uses are prohibited for third parties. Commercial rights in Graph1ks Material are reserved to Graph1ks.

Third-party material retains its own rights and terms.

### Long-running local build contract

Prompt V'gine adopts the RhymeLab-style durable build standard in AGENTS.md and PROJECT.md.

The v2 local builder provides:

- --plan read-only preflight;
- --status inspection;
- deterministic named stages;
- bounded transactional track ingestion;
- persisted SQLite checkpoint at .build-v2\state.sqlite;
- ordinary-rerun resume;
- safe Ctrl+C/SIGTERM pause behavior;
- stage/current/total/percentage/throughput/batch/ETA console output;
- SHA-256 source + build-revision checkpoint binding;
- stale-checkpoint rejection;
- incomplete building SQLite artifacts;
- validation before promotion;
- promotion rollback logic;
- retained previous promoted artifacts;
- --reset-work that removes only incomplete work;
- optional explicit --rebuild-corpus.

The old --force path is intentionally retired.

### v1 local-data compatibility

The owner does not need to discard the already-built v1 corpus.

If its source fingerprints match the current Factory files, v2 adopts it unchanged and recompiles only knowledge metadata as needed. Synthetic regression coverage verifies that the corpus bytes remain unchanged in this adoption path.

## Important files

| Path | Purpose |
|---|---|
| docs/LOCAL_DATA_BUILD.md | exact Windows commands and safety behavior |
| scripts/data/build_local_data.py | resumable v2 owner-local build/resume tool |
| scripts/data/local_data_v1_core.py | preserved v1 semantic/import helpers and compatibility harness |
| schema/build-state-v1.sql | checkpoint/status DB |
| schema/corpus-v2.sql | resumable corpus-build schema |
| schema/curation-v1.sql | durable local authoring state |
| tests/test_local_data_build.py | build/resume/data-safety regression suite |
| scripts/data/curation_session.py | bundled report export + transactional decision apply |
| schema/genre-crosswalk-decisions-v1.schema.json | AI/human decision-bundle contract |
| tests/test_curation_session.py | report/apply/staleness regression coverage |
| LICENSE | operative noncommercial public terms |
| COMMERCIAL_LICENSE.md | owner commercial-rights policy |
| docs/DECISIONS.md | durable architecture/licensing decisions |

## Next concrete work

The build/adoption phase is complete locally. The preferred next slice is a bundled genre-curation session:

1. pull current main;
2. run `py scripts\data\curation_session.py prepare --out-dir ".local-data\current"`;
3. review/upload the generated `reports/curation/genre-crosswalk-review-v1.json`;
4. apply the reviewed decision bundle with one `curation_session.py apply` command.

The prepare command backs up curation and writes complete reports. The apply command is transactional, recompiles/validates automatically, rolls back durable curation on failure, and refreshes the next review report.

## Verification

Required CI check: validate.

The synthetic suite covers:

- normal build;
- durable curation recompilation;
- safe pause + ordinary-rerun resume;
- stale source/checkpoint rejection;
- narrow safe reset;
- read-only plan;
- v1 promoted-corpus adoption;
- previous promoted artifact retention.

## Traps

- Never commit real Factory files or local/generated SQLite data.
- Never use --reset-work as a substitute for ordinary resume.
- Never delete durable curation.sqlite during source/build updates.
- A new Factory snapshot should be built separately and diff-reviewed.
- Do not claim all genre definitions are curated merely because identities exist.
- The current Vault has no structured Vocal coverage and sparse Exciters/Structure evidence.
- Custom source-available license terms are project policy; qualified legal review is prudent before high-stakes commercial release.
