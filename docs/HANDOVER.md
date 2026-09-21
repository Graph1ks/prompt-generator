# Handover — Runtime Pack V1 Foundation

**Last updated:** 2026-09-21  
**Handoff target:** owner-local runtime validation, then TypeScript compiler/application foundation  
**Milestone:** Database V1 remains closed; Runtime Pack v1 contract/export implementation is now present

## Read this first

Read in this order:

1. `AGENTS.md`
2. `PROJECT.md`
3. `STATUS.md`
4. **`docs/DATABASE_V1.md`**
5. `docs/DATA_ARCHITECTURE.md`
6. `docs/MUSICSPEC_V1.md`
7. `docs/PROMPT_FORMAT.md`
8. `docs/RUNTIME_DATA_CONTRACT_V1.md`
9. `docs/APPLICATION_ARCHITECTURE.md`
10. `docs/LOCAL_DATA_BUILD.md` only when operating the local databases

Owner workspace: `D:\prompt-engine`.

Real Factory files, generated SQLite databases, reports, checkpoints and backups are local-only and must never be committed.

## What has been completed

### Source/corpus baseline

- 10,043 tracks
- 115,736 structured-prompt sections
- 852,459 structured-prompt tokens
- 24 Major Genres
- 1,564 taxonomy genres/subgenres

### Genre

- Genre crosswalk completed locally.
- 138 reviewed crosswalk decisions applied.
- 0 unresolved genre-crosswalk candidates remain for the current Factory snapshot.

### Instruments

- Current Factory contains 6,035 unique comma/semicolon-delimited Instruments expressions.
- Every source expression is a first-class `instrument_expression` row.
- Every source expression remains selectable/renderable with source wording preserved.
- Canonical identity and semantic concepts are linked underneath expressions; they never replace the expression.
- Semantic completion reached **6,035 / 6,035**.
- Semantic residuals reached **0**.
- Fully identity-decomposed: **4,472 / 6,035 (~74.1%)**.
- Last completion snapshot catalog: **9 families / 164 canonical instrument entities / 161 active aliases**.

Do not treat ~74.1% identity coverage as unfinished work. Semantic-only layers such as effects/pads/noise/arrangement sources may be completely understood without a canonical physical-instrument identity.

### Renderer budget

The Factory proves a hard `structured_prompt` maximum of **1,000 characters**:

- median 716
- P90 898
- P95 936
- P99 982
- maximum 1,000
- 0 source prompts above 1,000

`suno-structured-v1` stores `max_characters=1000` plus source-derived P90 soft section targets. Overflow must be solved semantically before serialization; never blindly slice the final string.

## Database architecture — do not simplify it

Database V1 uses three SQLite files:

### `corpus.sqlite`

Disposable evidence/mining DB generated from Factory sources. Contains tracks, raw/parsed sections, clauses, tokens, phrase/stat evidence, negative-prompt evidence, raw genre taxonomy/crosswalk evidence and aggregate profile data.

### `curation.sqlite`

**Durable authoring state.** Contains reviewed patches/decisions for knowledge entries, variants, definitions, relations, genre crosswalk, instruments/aliases/traits, parameters/options, statements and review state.

Never replace/delete this during an ordinary source rebuild.

### `knowledge.sqlite`

Disposable compiled product knowledge generated from corpus + durable curation. Contains canonical genre/instrument knowledge, the complete Instruments expression catalog, semantic links, definitions/relations, parameters/statements, renderer configuration, Exclude entries and FTS search.

For the exact table inventory, read `docs/DATABASE_V1.md`.

## Critical invariants

1. Every source Instruments expression remains first-class/selectable/renderable.
2. Canonical identity/concepts are additive metadata only.
3. Source expression output text stays lossless.
4. Semantic-only expressions are valid.
5. Frequency is review evidence, never semantic truth.
6. `curation.sqlite` is durable; `corpus.sqlite`/`knowledge.sqlite` are rebuildable.
7. Generated/local source artifacts stay out of Git.
8. Exclude is separate from structured style prompt.
9. Style prompt is <=1,000 characters with semantic compaction, never blind truncation.

## Current repository/data revision

`promptvgine-local-data-build-v2-resumable-3-prompt-budget`

The current schema files are:

- `schema/corpus-v2.sql`
- `schema/curation-v1.sql`
- `schema/knowledge-v1.sql`

`Database V1` is the product milestone; `corpus-v2` is only the evidence-schema implementation revision.

## One owner-local sync may still be required

If the owner has not run the finalizer since the latest main changes, do this once:

```powershell
Set-Location D:\prompt-engine
git pull

py scripts\data\database_foundation_session.py finalize `
  --out-dir ".local-data\current" `
  --vault ".local-data\source\GRAPH1KS_PUBLIC_VAULT_FACTORY.json.gz" `
  --genre-map ".local-data\source\GRAPH1KS_GENRE_MAP_FACTORY.json"
```

This should only recompile/validate generated knowledge as required. It must preserve `curation.sqlite`. This is not a reason to restart semantic curation.

## Do not restart these phases

- genre crosswalk
- Instruments semantic residual review
- Identity Core / Semantic Core style batch cycles for the current snapshot
- source-expression reduction/canonical collapse

Future Factory versions are handled by separate snapshot build + diff review, not by reopening old evidence blindly.

## Runtime Pack v1 implementation now present

Tracked implementation:

- `docs/RUNTIME_DATA_CONTRACT_V1.md`
- `schema/runtime-pack-v1.schema.json`
- `scripts/data/export_runtime_v1.py`
- `tests/test_runtime_export_v1.py`

The exporter writes `core.json`, `genres.json`, `instruments.json`, `instrument-expressions.json`, `editor.json`, `knowledge.json`, `search.json` and `manifest.json`. It is deterministic, resumable at payload-stage boundaries, rejects stale partial work, validates Database V1 expression/budget invariants and retains the last promoted pack during replacement.

No React/Radix/Motion/Tauri packages have been installed yet.

## Next-thread mission

Treat Database V1 and Runtime Pack v1 as accepted dependencies and move upward in the stack.

Recommended order:

1. **Owner-local Runtime Pack validation** — run plan/export/status against the real `knowledge.sqlite`; record actual file sizes/counts and confirm 6,035 Factory expressions.
2. **TypeScript workspace + MusicSpec package** — strict TS/pnpm foundation and schema-compatible types/migrations.
3. **MusicSpec compiler** — deterministic renderer with structured compilation result.
4. **1,000-character budget engine** — preserve explicit/locked intent, compact lower-priority derived/redundant material, keep complete bracketed sections.
5. **Search + design-system/application foundation** — runtime repository/search worker, then V'gine UI/motion modules and Easy/Advanced surfaces.

## Post-V1 enrichment is allowed but is not a blocker

The following can be added incrementally without declaring Database V1 unfinished:

- Vocal vocabulary/enrichment (current Factory has no structured Vocal corpus coverage);
- more Easy statements;
- more Advanced parameters/options;
- richer definitions/context definitions/relations;
- recommendation/quality-check logic;
- new Factory snapshot data after diff review.

## Definition of success for the next thread

Do not spend the next thread re-mining the database. Produce runtime/compiler/application progress while preserving the V1 DB contract.

If a proposed implementation requires changing a Database V1 invariant, call that out explicitly as a schema/architecture change rather than silently mutating the foundation.