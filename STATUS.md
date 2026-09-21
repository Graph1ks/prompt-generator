# Project Status

**Last updated:** 2026-09-21
**Current phase/milestone:** database-first Instruments foundation complete in repository; owner-local promotion/acceptance is one bundled run

## Current objective

Make the database complete before UI/runtime work: preserve every source-backed Instruments phrase as a first-class selectable expression while also linking canonical instrument identity and reusable playing/processing/arrangement semantics underneath it.

## Current state

- Owner-local Windows workspace: `D:\prompt-engine`.
- Real Factory files and generated databases/reports remain local-only.
- Validated evidence baseline: 10,043 tracks, 115,736 sections, 852,459 tokens, 24 Major Genres, 1,564 taxonomy genres.
- Genre crosswalk is complete locally: 138 decisions applied and 0 unresolved genre candidates remain.
- Current Factory evidence contains 6,035 unique comma/semicolon-delimited Instruments expressions.
- The database contract now requires **all source Instruments expressions** to be materialized into `knowledge.instrument_expression`, remain `selectable=1`, and preserve their original render/output wording.
- Compound expressions such as `clean electric guitar`, `muted trumpet`, `restrained strings`, `programmed drums`, `warm pad`, etc. are **not discarded**. They are product-level options describing how an instrument/layer is played, voiced, processed, or arranged.
- Canonical instrument identity remains a second layer for grouping/search/explanation. Expression decomposition is additive metadata only.
- `instrument_expression_instrument` links source expressions to resolved canonical instrument identities.
- `instrument_expression_concept` links the same expression to reusable playing/processing/role/timbre/etc. concepts.
- Expressions can be `identity`, `semantic`, `partial`, or `unresolved`; none of those states removes a source-backed expression from the selectable database.
- Residual-only mining applies only to **future semantic curation review**, not to product availability. Fully understood expressions leave the review queue but stay in `knowledge.sqlite`.
- Instrument ontology v2 also supports durable `instrument_trait_patch`, scoped decision bundles, aliases, Advanced instrument parameters/options, and compiled instrument traits.
- Build revision is now `promptvgine-local-data-build-v2-resumable-2-instrument-expressions`.
- Completed old checkpoints can advance to the new compiler revision without rebuilding the corpus or deleting durable curation.
- `database_foundation_session.py finalize` runs build/recompile + validation + mining refresh + acceptance reporting as one solo-dev phase and keeps verbose subprocess output in report files.
- Knowledge apply remains backup-first, hash/fingerprint-bound, transactional, automatically recompiled/validated, rollback-safe, and report-refreshing.

## Last verified checks

- GitHub Actions `validate` passes on the complete source-expression materialization implementation.
- Synthetic build tests require every source Instruments expression to exist in `knowledge.sqlite`, be selectable, and preserve exact output text.
- Synthetic knowledge-c​​uration tests verify that a compound expression such as `clean rhythm electric guitar` remains selectable while linking Electric Guitar + Clean + Rhythm semantics.
- Synthetic v2 scoped apply covers instrument aliases, traits, parameters/options, compile, and validation.
- Synthetic mining covers semantic-vs-identity decomposition reports.
- Synthetic revision-upgrade coverage verifies a completed older checkpoint can recompile knowledge without rebuilding the promoted corpus.
- Bundled database-finalization coverage verifies one concise terminal summary plus detailed report/log files.

## Current blocker

Repository-side database foundation has no blocker. The real owner-local databases still need one bundled finalization run after merge because GitHub intentionally does not contain the real Factory/database files.

## Next concrete action

Merge this branch, then owner runs exactly one database-finalization command from `docs/LOCAL_DATA_BUILD.md`. That run upgrades/recompiles the local `knowledge.sqlite`, validates that all 6,035 current source expressions are present/selectable, refreshes semantic reports, and writes `reports/database/database-foundation-acceptance-v1.json`.

## Do not redo

- Do not upload Factory/generated DB/report data to GitHub.
- Do not delete durable `curation.sqlite`.
- Do not use the retired `--force` workflow.
- Do not redo the completed genre crosswalk.
- Do not collapse 6,035 source expressions into only a small canonical-instrument list.
- Do not call compound playing/processing expressions disposable “pseudo instruments”.
- Do not remove fully-semantic expressions from the product database; only remove them from further semantic-review queues.
- Do not treat corpus frequency as automatic musical truth.

## Important context

The database is deliberately two-layered:

1. **instrument expression** = the actual selectable/renderable source phrase;
2. **canonical instrument + semantic concepts** = structured meaning underneath that phrase.

This preserves the full source vocabulary while still enabling clean search, dictionary explanations, Advanced controls, relations, and future recombination.

For the single owner-local finalization command read `docs/LOCAL_DATA_BUILD.md`.