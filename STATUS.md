# Project Status

**Last updated:** 2026-09-21
**Current phase/milestone:** scalable instrument ontology + semantic residual mining ready

## Current objective

Replace item-by-item Instruments cleanup with a compositional ontology: canonical instrument identities + reusable semantic modifiers + Advanced parameters. Future mining reviews only semantic residuals that the ontology cannot already explain.

## Current state

- Owner-local Windows workspace: D:\prompt-engine.
- Real Factory files and generated databases/reports remain local-only.
- Validated evidence baseline: 10,043 tracks, 115,736 sections, 852,459 tokens, 24 Major Genres, 1,564 taxonomy genres.
- Genre crosswalk is complete locally: 138 decisions applied and 0 unresolved genre candidates remain.
- The refreshed Instruments report contains 6,035 unique source segments, 5,930 not exact-matched as curated surfaces, and is bound to curation fingerprint `9e056bdd...`.
- The already-applied core knowledge layer contains 70 canonical instruments/groups plus 71 reusable concepts.
- Instrument ontology v2 adds durable `instrument_trait_patch`, scoped v2 decision bundles, aliases for existing instruments, Advanced instrument parameters/options, and compiled instrument traits.
- Mining now performs longest-match semantic decomposition against compiled knowledge.
- Source strings such as `clean electric guitar`, `restrained strings`, `programmed drums`, `warm pad`, or `noise sweeps` are represented compositionally instead of becoming thousands of fake instrument identities.
- Semantic-only layers such as pads/effects/noise are allowed to be fully explained without forcing them into an instrument entity.
- The Instruments review queue is now residual-driven: fully explained segments are removed automatically; only unresolved semantic residue remains prioritized.
- The current owner-local v2 decision bundle adds 58 canonical instrument/group entities, 171 reusable concepts, 27 aliases on existing instruments, 10 Advanced instrument dimensions with 100 options, and 118 instrument-trait links.
- Against the current 1,000 prioritized source segments, the prepared ontology covers 100% semantically in the deterministic estimator; 84.8% resolve to an explicit instrument identity plus modifiers, covering 92.1% of weighted occurrences. Semantic-only layers account for the remainder rather than being fabricated as instruments.
- Knowledge apply remains backup-first, hash/fingerprint-bound, transactional, automatically recompiled/validated, rollback-safe, and report-refreshing.

## Last verified checks

- GitHub Actions `validate` passes through the current instrument-ontology v2 implementation.
- Synthetic v2 scoped apply covers instrument aliases, traits, parameters/options, knowledge compile, and validation.
- Synthetic mining covers semantic-vs-identity decomposition reports.
- Existing build/resume, genre curation, stale-review rejection, and rollback suites remain covered.

## Current blocker

None after CI passes on the final branch head.

## Next concrete action

Merge instrument ontology v2, then the owner saves the reviewed local `instrument-ontology-decisions-v2.json` bundle and runs one bundled apply command. That apply automatically recompiles/validates and produces the next residual-only mining reports.

## Do not redo

- Do not upload Factory/generated DB/report data to GitHub.
- Do not delete durable `curation.sqlite`.
- Do not use the retired `--force` workflow.
- Do not redo the completed genre crosswalk.
- Do not turn 6,035 source segments into 6,035 selectable instruments.
- Do not manually review phrases that the semantic decomposition already resolves.
- Do not treat corpus frequency as automatic musical truth.

## Important context

The owner-local decision artifact is intentionally not committed. Repository code/schema/tests define the reproducible apply/decomposition machinery; reviewed decisions remain in ignored local curation state.

For exact Windows commands read `docs/LOCAL_DATA_BUILD.md`.
