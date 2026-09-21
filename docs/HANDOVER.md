# Handover

**Last updated:** 2026-09-21  
**Current phase/milestone:** database-first Instruments foundation implemented; one owner-local finalization run remains before higher-layer work

## Read this first

This project is solo-dev/operator-driven. Follow `AGENTS.md` HARD RULES:

- bundle coherent work into meaningful phases;
- avoid chains of tiny manual commands;
- keep detailed output in report files rather than terminal spam;
- back up durable curation automatically before bulk mutation;
- preserve last-known-good promoted databases;
- compile/validate automatically after durable changes;
- real Factory/database/report artifacts stay local and ignored.

Owner workspace: `D:\prompt-engine`.

## Product/data intent — critical correction

The Instruments data model must preserve **all source-backed instrument expressions**, including compound phrases that describe how an instrument or sound layer is played, voiced, processed, or arranged.

Examples:

- `clean electric guitar`
- `distorted rhythm guitar`
- `muted trumpet`
- `restrained strings`
- `programmed drums`
- `warm pad`
- `noise sweeps`

These are not disposable source noise. They are first-class selectable/renderable options.

At the same time, the system also maintains canonical instrument identity and reusable semantics underneath each expression. Example:

`clean rhythm electric guitar`

remains a selectable expression and can additionally resolve to:

- canonical instrument: Electric Guitar;
- concept: Clean;
- concept/role: Rhythm.

Semantic decomposition is therefore **additive metadata**, never a lossy replacement of the source expression.

## Owner-local baseline

Current known real Factory baseline:

- 10,043 tracks;
- 115,736 structured prompt sections;
- 852,459 tokens;
- 24 Major Genres;
- 1,564 taxonomy genres/subgenres;
- 6,035 unique comma/semicolon-delimited Instruments expressions in the current source snapshot.

Genre crosswalk is already complete locally:

- 138 reviewed decisions applied;
- knowledge recompiled and validated;
- remaining genre-crosswalk queue: 0.

Core knowledge curation already present before this branch:

- 70 canonical instrument/group entities;
- 71 reusable concepts.

Real files remain local:

```text
.local-data\source\GRAPH1KS_PUBLIC_VAULT_FACTORY.json.gz
.local-data\source\GRAPH1KS_GENRE_MAP_FACTORY.json
.local-data\current\corpus.sqlite
.local-data\current\curation.sqlite
.local-data\current\knowledge.sqlite
```

Never commit them.

## What this branch changes

### 1. Complete instrument-expression database layer

`schema/knowledge-v1.sql` now includes:

- `instrument_expression`
- `instrument_expression_instrument`
- `instrument_expression_concept`
- `instrument_expression_search`

Every source Instruments segment is compiled into `instrument_expression` with:

- stable expression ID;
- preserved label/output text;
- normalized lookup text;
- occurrence + track counts;
- `selectable=1`;
- semantic coverage;
- decomposition state;
- residual semantic tokens;
- optional base instrument identity;
- provenance.

Database validation hard-fails if any source expression is missing or non-selectable.

### 2. Shared deterministic instrument semantics

New:

`scripts/data/instrument_semantics.py`

It owns:

- safe comma/semicolon segment splitting;
- expression IDs;
- canonical instrument/concept phrase lexicons;
- longest-match semantic decomposition;
- source-expression aggregation;
- complete `knowledge.sqlite` expression materialization.

Important: do **not** split blindly on `and`; phrases like `kick and snare` or compound performance expressions must remain intact unless a later explicit parser proves otherwise.

### 3. Build revision upgrade without corpus destruction

Current build revision:

`promptvgine-local-data-build-v2-resumable-2-instrument-expressions`

A completed old v2 checkpoint can advance to this compiler revision by resetting only knowledge stages. The promoted corpus remains unchanged. Durable `curation.sqlite` remains unchanged.

Incomplete checkpoints with mismatched source/build fingerprints still fail closed.

### 4. Semantic review queue, not lossy product filtering

`knowledge_mining_session.py` decomposes instrument expressions and writes:

- `instrument-decomposition-v1.json`
- `instrument-decomposition-full-v1.csv`

Mining distinguishes:

- `identity` / fully identity-resolved;
- `semantic` / fully semantically understood without requiring an instrument identity;
- `partial`;
- `unresolved`.

Fully understood expressions may leave the **semantic curation review queue**, but they remain in the product database and remain selectable.

### 5. Instrument ontology v2 authoring

Current branch also supports:

- durable `instrument_trait_patch`;
- scoped `knowledge-curation-decisions-v2`;
- aliases attached to existing/new instruments;
- semantic concepts;
- instrument-trait relations;
- Advanced Instruments parameters;
- parameter options;
- backup-first migration;
- transaction/recompile/validation/rollback.

This is enrichment below/around the complete expression layer, not a replacement for it.

### 6. One bundled database finalization phase

New:

`scripts/data/database_foundation_session.py`

Canonical owner-local command after merge:

```powershell
Set-Location D:\prompt-engine
git pull
py scripts\data\database_foundation_session.py finalize --out-dir ".local-data\current" --vault ".local-data\source\GRAPH1KS_PUBLIC_VAULT_FACTORY.json.gz" --genre-map ".local-data\source\GRAPH1KS_GENRE_MAP_FACTORY.json"
```

This single phase:

1. recompiles/promotes current knowledge as needed;
2. validates corpus/knowledge/curation;
3. refreshes mining/decomposition reports;
4. verifies every source Instruments expression is materialized;
5. verifies every source expression remains selectable;
6. verifies output wording is preserved;
7. writes detailed logs to files;
8. writes the acceptance report;
9. prints one concise terminal summary.

Primary acceptance file:

```text
.local-data\current\reports\database\database-foundation-acceptance-v1.json
```

Detailed logs:

```text
.local-data\current\reports\database\01-build.stdout.txt
.local-data\current\reports\database\01-build.stderr.txt
.local-data\current\reports\database\02-validate.stdout.txt
.local-data\current\reports\database\02-validate.stderr.txt
.local-data\current\reports\database\03-knowledge-mining.stdout.txt
.local-data\current\reports\database\03-knowledge-mining.stderr.txt
```

Do not ask the owner to paste those logs unless acceptance fails.

## Query/debug tools

Compiled knowledge inspection:

```powershell
py scripts\data\query_knowledge.py --db ".local-data\current\knowledge.sqlite" stats
py scripts\data\query_knowledge.py --db ".local-data\current\knowledge.sqlite" expression "clean electric guitar"
py scripts\data\query_knowledge.py --db ".local-data\current\knowledge.sqlite" search "muted trumpet"
py scripts\data\query_knowledge.py --db ".local-data\current\knowledge.sqlite" unresolved --limit 100
```

These are expert/debug commands, not the preferred normal operator flow.

## Verification already covered in CI

Synthetic coverage verifies:

- source Instruments phrases survive as selectable `instrument_expression` rows;
- exact source output text is preserved;
- compound playing/processing expression semantics can link to instrument + concepts;
- all source expressions are counted/validated;
- v1 corpus adoption remains non-destructive;
- completed older build revision advances without rebuilding corpus;
- durable curation survives;
- v2 aliases/traits/parameters/options compile;
- stale reviewed bundles fail closed;
- compile failures restore durable curation;
- semantic decomposition reports work;
- database finalizer emits one concise stdout line and detailed reports.

Required workflow: `Data tooling / validate`.

## Durable architecture rule

The database has two simultaneous Instruments layers:

### A. Instrument expression

The actual selectable/renderable wording from the source.

This is what preserves the full musical/performance vocabulary.

### B. Canonical instrument + semantic concepts

Structured meaning underneath the expression.

This enables:

- grouping;
- search;
- inline knowledge;
- explanations;
- Advanced controls;
- relation/compatibility logic;
- recombination;
- future runtime compilation.

Never collapse A into B.

## About the previous 1,000-candidate ontology estimate

A prior deterministic estimate on the 1,000 prioritized candidates showed that a prepared ontology expansion could semantically explain all 1,000 and resolve explicit canonical instrument identity for most of them.

That work remains useful as semantic enrichment, but it must **not** be interpreted as reducing the selectable Instruments catalog. All 6,035 current source expressions belong in the compiled database regardless of decomposition state.

## Next work after database acceptance

Only after `database-foundation-acceptance-v1.json` reports `status: ok`:

1. inspect full real expression/decomposition counts;
2. enrich unresolved/partial semantics in large batches;
3. expand canonical instrument ontology and definitions as evidence requires;
4. curate remaining lexicon/parameter/statement knowledge;
5. then proceed toward runtime bundle/compiler/UI work.

Database completeness comes first.

## Handoff to a new thread

A new AI worker should begin by reading, in this order:

1. `AGENTS.md`
2. `PROJECT.md`
3. `STATUS.md`
4. `docs/HANDOVER.md`
5. `docs/DATA_ARCHITECTURE.md`
6. `docs/CURATION_WORKFLOW.md`
7. `docs/DECISIONS.md`
8. `docs/LOCAL_DATA_BUILD.md`

Then inspect current `main` and the owner-local acceptance report if the owner provides it.

Do not restart architecture discussion. Continue from the database-first contract above.

## Traps

- Never call compound performance/processing expressions disposable “pseudo instruments”.
- Never remove a source expression merely because it can be decomposed.
- Never equate residual-only **review queues** with the actual selectable database.
- Never delete/replace durable `curation.sqlite`.
- Never upload real Factory/SQLite/report artifacts to GitHub.
- Never use the retired `--force` workflow.
- Never redo the completed genre crosswalk.
- Never promote frequency alone into semantic truth.
- Vocal remains a separate enrichment problem because the current source has no structured Vocal coverage.
