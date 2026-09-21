# Handover

**Last updated:** 2026-09-21
**Current phase/milestone:** scalable instrument ontology v2 + semantic residual mining

## Objective

Continue on the owner's Windows 11 / VS Code machine at D:\prompt-engine. Apply the prepared instrument ontology v2 bundle once, then use the automatically refreshed residual-only reports instead of repeatedly hand-curating raw Instruments strings.

## Owner-local baseline

- Factory inputs: ignored .local-data\source\.
- Promoted DBs: .local-data\current\.
- 10,043 tracks / 115,736 structured sections / 852,459 tokens.
- 24 Major Genres / 1,564 taxonomy genres.
- Genre crosswalk complete: 138 decisions applied, remaining queue 0.
- Core knowledge batch already applied before the current refreshed report: 70 canonical instrument/group entities + 71 concepts.

## Current refreshed Instruments evidence

Current owner-local report:

- review id: knowledge-mining-86ede80c49248ecbdbd7965d;
- curation fingerprint: 9e056bdd959666c2df5a24c09966c67bc1c14fc16cff24a77f415deb39b93853;
- instrument report SHA-256: 945acff3b4fbbe1fb78dfc175c14844afe2c9486e26c1cce38b24ad774b8f04f;
- 6,035 unique Instruments segments;
- 5,930 not exact-matched as curated surfaces.

The report makes clear that most remaining strings are compositional phrases such as clean/rhythm/distorted guitars, programmed/hybrid drums, synth pads/basses, restrained strings, accents, support layers, effects, and stylistic modifiers. These must not become thousands of standalone instrument identities.

## Instrument ontology v2

The prepared local decision bundle adds one large coherent semantic layer:

- 58 new canonical instrument/group entities;
- 171 reusable modifier/production/performance/style concepts;
- 27 aliases attached to already-curated instruments;
- 10 Advanced Instruments parameters;
- 100 parameter options linked to knowledge entries;
- 118 intrinsic instrument-trait relations.

Representative new canonical entities include Synth Bass, Sub Bass, 808 Bass, Electronic Percussion, Synth Brass, Synth Strings, Analog/Digital/Polyphonic/Monophonic Synthesizer, Digital/Upright Piano, Harmonium, Melodica, Resonator/Baritone/Hollow-Body Guitar, Fretless Bass, orchestral/chamber ensembles, additional percussion, additional winds/brass, Electric Violin, and Turntables.

The modifier layer covers source type, role, processing, articulation, timbre, density/prominence, register, voice architecture, arrangement behavior, and style color.

## Scale result

A deterministic local estimator was run against all 1,000 prioritized candidates in the refreshed Instruments report using the same longest-match semantics implemented in the repository.

Before ontology v2:

- fully semantic: 419 / 1,000;
- fully semantic weighted occurrences: 63.5%;
- explicit instrument identity + modifiers: 376 / 1,000;
- identity-resolved weighted occurrences: 60.0%.

With the prepared ontology v2 bundle:

- fully semantic: 1,000 / 1,000;
- fully semantic weighted occurrences: 100%;
- explicit instrument identity + modifiers: 848 / 1,000;
- identity-resolved weighted occurrences: 92.1%.

The 152 semantic-only cases are intentionally not fabricated as instruments: pads, effects, sweeps, noise, stabs, and similar production layers can be fully understood as concepts.

These are coverage results for the current prioritized 1,000 report candidates, not a claim that all 6,035 source segments are now resolved. The next real local prepare run measures the full corpus and emits the remaining residuals.

## Repository implementation

| Path | Purpose |
|---|---|
| schema/curation-v1.sql | additive durable instrument_trait_patch migration |
| schema/knowledge-curation-decisions-v2.schema.json | scoped instrument ontology decision-bundle contract |
| scripts/data/knowledge_curation_session.py | v1/v2 scoped validation, backup-first migration, aliases, traits, parameters/options, compile/validate/rollback |
| scripts/data/local_data_v1_core.py | compiles durable instrument traits into knowledge.instrument_trait |
| scripts/data/knowledge_mining_session.py | semantic decomposition, semantic-vs-identity coverage, residual-only Instruments review queue |
| tests/test_knowledge_curation_session.py | v2 scoped apply + trait/parameter regression coverage |
| tests/test_knowledge_mining_session.py | semantic decomposition report coverage |

## Semantic decomposition contract

For each source Instruments segment:

1. longest curated instrument/concept phrase matches are resolved;
2. coordination/count syntax is ignored;
3. remaining semantic tokens are reported as residuals;
4. fully_semantic means no semantic residue remains;
5. fully_identity_decomposed additionally requires an explicit canonical instrument identity.

The primary Instruments review queue now excludes fully_semantic segments. Future review therefore works on semantic gaps, not raw corpus-string count.

## Apply safety

Knowledge decision bundles are bound to review/source/report hashes and current curation fingerprint.

Apply order:

1. integrity check;
2. validate reviewed snapshot;
3. create verified curation backup;
4. apply additive curation schema migration;
5. transactionally apply bundle;
6. recompile knowledge;
7. validate;
8. on failure restore curation backup and attempt recovery compile;
9. refresh mining/decomposition reports.

## Next concrete work

1. Merge the feature branch after required CI is green.
2. Owner pulls main.
3. Owner saves instrument-ontology-decisions-v2.json under .local-data\current\reports\knowledge\.
4. Run the single apply command from docs/LOCAL_DATA_BUILD.md.
5. Review the newly generated instrument-decomposition-v1.json and residual-only instrument-candidates-v1.json for the next semantic gap batch.

## Traps

- Never commit Factory data, local databases, reports, decision bundles, or backups.
- Never delete curation.sqlite.
- Never promote source phrase frequency directly to selectable options.
- Do not force semantic-only layers into fake instrument entities merely to improve an identity coverage metric.
- Do not manually process candidates already covered by the decomposition layer.
- Vocal remains a separate enrichment problem because the current source has no structured Vocal coverage.
