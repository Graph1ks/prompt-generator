# Project Status

**Last updated:** 2026-09-21
**Current phase/milestone:** first reviewed core instrument + lexicon knowledge batch ready for owner-local apply

## Current objective

Apply the first high-confidence semantic knowledge batch derived from the uploaded local mining reports, then continue with the automatically refreshed lower-frequency/niche evidence rather than promoting raw corpus strings directly.

## Current state

- Owner-local Windows workspace: D:\prompt-engine.
- Real Factory files and generated databases remain local-only.
- Validated local evidence baseline: 10,043 tracks, 115,736 sections, 852,459 tokens, 24 Major Genres, 1,564 taxonomy genres.
- Genre crosswalk is complete locally: 138 decisions applied, recompile/validation passed, 0 unresolved review candidates remain.
- First instrument report contains 6,035 unique source segments. These are treated as evidence, not 6,035 product instrument identities.
- First lexicon report contains section-aware terms/phrases used as evidence for reusable music/production concepts.
- A curated core batch has been prepared from those reports: canonical instrument families/entities plus reusable rhythm, melody, harmony, mix, production, timbre, role, and performance concepts.
- Instrument identity is explicitly separated from modifiers such as clean/distorted/muted, lead/rhythm, programmed/sampled, attack, width, and dynamics.
- Knowledge mining now writes a semantic curation fingerprint and suppresses obvious Instruments-list adjacency, Key/Mode literals, connector-bound phrase fragments, and common grammar scaffolding.
- `knowledge_curation_session.py` provides hash/fingerprint-bound, backed-up, transactional apply + knowledge recompile + validation + rollback + refreshed reports.
- Public project licensing remains source-available/noncommercial for third parties with commercial rights in Graph1ks Material reserved to Graph1ks.

## Last verified checks

- GitHub Actions `validate` passes with the knowledge-c​​uration apply regression suite.
- Synthetic apply compiles approved instruments/concepts into `knowledge.sqlite` and refreshes mining reports.
- Synthetic stale-curation protection rejects reviewed bundles after durable curation changes.
- Synthetic compile failure restores durable curation from backup.
- Existing build/resume, genre-c​​uration, and mining regression suites remain green.

## Current blocker

None.

## Next concrete action

Owner pulls current main, saves the reviewed `knowledge-curation-decisions-v1.json` into the local knowledge report directory, and runs one bundled `knowledge_curation_session.py apply` command.

## Do not redo

- Do not upload Factory/generated DB data to GitHub.
- Do not delete durable `curation.sqlite`.
- Do not use the retired `--force` workflow.
- Do not redo the completed 138-item genre crosswalk.
- Do not promote all 6,035 Instruments source segments as independent instruments.
- Do not treat raw term/phrase frequency as product truth.
- Do not manually split modifiers into instrument names when they can remain composable semantic concepts.

## Important context

The current reviewed mining files predate the new semantic curation-fingerprint field. Their first decision bundle is therefore bound by exact report SHA-256 + source fingerprints + review ID. The automatically refreshed reports after apply use the stronger semantic curation fingerprint as well.

For exact Windows commands read `docs/LOCAL_DATA_BUILD.md`.
