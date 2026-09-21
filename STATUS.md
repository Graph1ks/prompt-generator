# Project Status

**Last updated:** 2026-09-21
**Current phase/milestone:** local corpus foundation built; resumable v2 tooling and licensing ready for owner-local continuation

## Current objective

Continue from the owner's existing validated local Factory build without risking local data, then begin evidence-backed genre/knowledge curation.

## Current state

- Owner-local Windows workspace: D:\prompt-engine.
- Real Factory files are under ignored .local-data\source\.
- Owner already built and validated local data: 10,043 tracks, 115,736 sections, 852,459 tokens, 24 Major Genres, 1,564 taxonomy genres, 138 unresolved Vault genre labels.
- Real Factory files and generated databases remain local-only.
- Public project licensing is source-available/noncommercial for third parties. Project-connected donations/tips and other monetization are prohibited; commercial rights in Graph1ks Material are reserved to Graph1ks.
- Complete project license/policy texts are stored in the repository.
- Local build tooling v2 follows the RhymeLab long-running-job standard: read-only plan, visible progress, resumable checkpoints, ordinary-rerun resume, safe interruption, stale-checkpoint rejection, integrity gates, staged artifacts, and last-known-good promotion safety.
- Existing matching v1 corpus.sqlite is adopted rather than destructively rebuilt. Durable curation.sqlite is never replaced by a normal build.
- Synthetic CI covers build, curation survival, pause/resume, stale checkpoints, safe reset, read-only plan, v1 adoption, and previous-artifact retention.

## Last verified checks

- Required GitHub Actions validate — passing on the current implementation.
- Owner-local v1 validate_local_data.py — passed.
- Synthetic v1-to-v2 adoption test — passed without changing existing corpus bytes.
- Synthetic pause/resume and stale-checkpoint tests — passed.
- Synthetic previous-promoted-artifact retention test — passed.

## Current blocker

None.

## Next concrete action

Owner pulls current main and runs the read-only v2 build plan against the existing local data. Do not delete or rebuild anything manually.

## Do not redo

- Do not upload Factory/generated DB data to GitHub.
- Do not delete the existing local curation.sqlite.
- Do not use the retired --force workflow.
- Do not rebuild the already-valid v1 corpus merely to adopt v2 tooling.
- Do not turn mined frequency directly into approved knowledge.

## Important context

The local build command is now also the resume command. Incomplete work is isolated under .local-data\current\.build-v2\; promoted data remains untouched until validation and promotion succeed.

For exact commands read docs/LOCAL_DATA_BUILD.md.
