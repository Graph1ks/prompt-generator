# Handover

**Last updated:** 2026-09-21
**Current phase/milestone:** corpus + genre crosswalk complete; first core instrument/lexicon curation batch ready for owner-local apply

## Current objective

Continue on the owner's Windows 11 / VS Code machine at D:\prompt-engine. Apply the first reviewed high-confidence semantic knowledge batch safely, then review the refreshed report files for lower-frequency/niche knowledge.

## Owner-local state already established

The owner has real Factory inputs under ignored .local-data\source\ and promoted local databases under .local-data\current\.

Validated baseline:

- 10,043 tracks;
- 115,736 structured prompt sections;
- 852,459 tokens;
- 24 Major Genres / 1,564 taxonomy genres;
- 138 previously unresolved genre labels have been reviewed/applied;
- genre-crosswalk remaining queue: 0.

## Completed foundation

### Licensing and repository mode

Graph1ks Material is source-available/noncommercial for third parties. Complete license/policy texts live in the repository. Commercial rights in Graph1ks Material are reserved to Graph1ks.

### Resumable local build

The v2 builder provides plan/status, checkpoints, ordinary-rerun resume, visible progress, stale-checkpoint rejection, staged work DBs, validation-before-promotion, previous-artifact retention, and narrow reset/rebuild semantics.

### Report-driven curation

Large review payloads stay in local report files rather than stdout. Genre decisions and knowledge decisions use reviewed files plus transactional apply commands.

The solo-dev operator HARD RULE in AGENTS.md requires bundled phases, concise terminal summaries, file-based AI handoffs, automatic backup, rollback-safe durable mutation, and automatic compile/validation.

## Current instrument/lexicon evidence

The owner generated and uploaded instrument-candidates-v1.json and lexicon-candidates-v1.json. Both are review snapshot knowledge-mining-c082ec85dd25848b7b1e480d from the same current Factory source fingerprints.

The Instruments evidence has 6,035 unique source segments. Those are deliberately not treated as 6,035 canonical instruments. Many segments combine identity with reusable properties such as clean/distorted/muted, acoustic/electric/electronic, lead/rhythm, programmed/sampled, restrained/soft, pads/stabs, or arrangement roles.

The lexicon evidence contains high-signal reusable concepts across Groove, Melody, Harmony, Drums, Bass, Instruments, Texture, Dynamics, Space/Mix, Production, and related sections.

## First reviewed core batch

A high-confidence core decision bundle is prepared outside Git because it targets owner-local durable curation.

It contains 9 instrument families, 70 canonical instrument/group entities with aliases, and 71 reusable knowledge concepts, with beginner-oriented definitions, useful section-context definitions, and source evidence metadata from the reviewed report files.

Key design rule: canonical instrument identity stays separate from reusable properties/roles/processing. For example, Clean + Electric Guitar is composable knowledge rather than a permanent Clean Electric Guitar identity.

## New tooling in current code

| Path | Purpose |
|---|---|
| scripts/data/knowledge_mining_session.py | prepares instrument/lexicon reports; refreshed version adds semantic curation fingerprints and stronger phrase-noise filtering |
| scripts/data/knowledge_curation_session.py | transactionally applies reviewed knowledge decisions, recompiles, validates, rolls back/recompiles recovery on failure, refreshes reports |
| schema/knowledge-curation-decisions-v1.schema.json | reviewed knowledge-bundle contract |
| tests/test_knowledge_curation_session.py | apply/compile/refresh, stale-curation rejection, rollback regression tests |
| docs/CURATION_WORKFLOW.md | semantic authoring rules |
| docs/LOCAL_DATA_BUILD.md | exact owner-local commands |
| docs/DECISIONS.md | durable architecture decisions including instrument decomposition + reviewed-bundle safety |

## Safety contract for knowledge apply

The decision bundle is bound to the mining review_id, exact instrument/lexicon report SHA-256 values, Vault/Genre Map SHA-256 values, and a semantic curation fingerprint for newly generated reports.

The uploaded first report predates the new curation-fingerprint field, so its first bundle uses exact report hashes + review/source fingerprints. After apply, refreshed reports contain the semantic curation fingerprint.

Before durable mutation, apply creates an integrity-checked local curation backup. All curation writes happen in one transaction. Knowledge is recompiled and validated automatically. On failure, durable curation is restored from backup and recovery compilation is attempted.

## Phrase-mining lesson already applied

Raw frequent n-grams contained substantial grammar/list noise: instrument adjacency, Key/Mode literals, boundary connector fragments, and phrases built around common with/by/to/from/into/via scaffolding.

The miner now suppresses those classes from prioritized phrase review. Frequency remains evidence, never automatic approval.

## Next concrete work

1. Merge the current feature branch after required CI is green.
2. Owner pulls main.
3. Owner saves the reviewed core bundle as .local-data\current\reports\knowledge\knowledge-curation-decisions-v1.json.
4. Owner runs the single bundled apply command documented in docs/LOCAL_DATA_BUILD.md.
5. On success, use the automatically refreshed instrument/lexicon reports for the next niche/descriptor/parameter batch.

## Verification

Required CI check: validate.

Current synthetic coverage includes resumable corpus build/adoption/rebuild safety, durable genre curation apply, report-driven instrument/lexicon mining, reviewed knowledge apply, compiled knowledge verification, stale curation/report rejection, and apply failure rollback + recovery compile.

## Traps

- Never commit real Factory files, generated SQLite data, local reports, decision bundles, or backups.
- Never delete durable curation.sqlite during source/Factory updates.
- Never promote raw source segments or n-gram frequency directly into product knowledge.
- Do not bake role/tone/processing words permanently into every instrument identity.
- The current Vault has no structured Vocal coverage; Vocal knowledge needs a separate curated source/enrichment phase.
- Sparse Exciters/Structure evidence should not be overgeneralized.
