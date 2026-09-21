# Prompt V'gine — Runtime Data Contract v1

**Status:** accepted / implementation started  
**Date:** 2026-09-21  
**Source:** compiled `knowledge.sqlite` from completed Database V1

## 1. Purpose

Runtime Pack v1 is the deployment boundary between owner-local Database V1 and the normal application.

The application must not require the heavy evidence corpus and must not need SQLite-WASM merely to reuse the authoring/build database shape.

Canonical flow:

```text
corpus.sqlite + curation.sqlite
          -> knowledge.sqlite
          -> export_runtime_v1.py
          -> runtime-v1/
          -> web / Tauri / self-hosted runtime loaders
```

Generated runtime packs remain local/generated artifacts and are not committed to Git.

## 2. Hard invariants

Runtime compilation must preserve the accepted Database V1 guarantees:

1. every non-deprecated Factory `instrument_expression` remains first-class and selectable;
2. source expression `output_text` is preserved verbatim;
3. canonical instrument/concept links are additive metadata only;
4. semantic-only instrument expressions remain valid;
5. candidate knowledge is not silently promoted to product-approved knowledge;
6. renderer profile metadata preserves the `suno-structured-v1` hard 1,000-character budget and semantic-budget policy;
7. Exclude remains a separate output vocabulary;
8. runtime export is deterministic for the same source database and contract implementation;
9. a changed source DB cannot resume stale partial runtime work;
10. promotion never destroys the last known-good runtime pack implicitly.

## 3. Runtime Pack directory

Runtime Pack v1 contains:

```text
runtime-v1/
  manifest.json
  core.json
  genres.json
  instruments.json
  instrument-expressions.json
  editor.json
  knowledge.json
  search.json
```

This is intentionally a small number of coarse deterministic payloads. Further sharding is a measured optimization, not a default architecture requirement.

## 4. `manifest.json`

Schema: `schema/runtime-pack-v1.schema.json`.

Contains:

- contract/schema version;
- deterministic `runtime_build_id`;
- SHA-256 of the source `knowledge.sqlite`;
- source knowledge build metadata;
- per-file SHA-256, byte size and key record counts.

No wall-clock generation timestamp is included in the deterministic identity.

A runtime loader must reject unsupported contract versions rather than silently reinterpreting data.

## 5. Payload contracts

### `core.json`

Contains:

- 24 Major Genre entities/order;
- prompt section definitions/order/visibility;
- renderer profiles;
- renderer-section labels/order/soft targets.

This is the minimum bootstrap payload for the compiler/editor shell.

### `genres.json`

One canonical row per non-deprecated genre identity:

- stable genre ID;
- label + normalized search surface;
- many-to-many Major Genre IDs;
- reviewed/approved aliases;
- reviewed/approved genre traits;
- knowledge-entry link where available.

A genre that belongs to multiple Major Genres remains one entity.

### `instruments.json`

Canonical identity layer only:

- families;
- canonical instruments/groups;
- reviewed/approved aliases;
- reviewed/approved intrinsic traits.

This file does **not** replace the expression catalog.

### `instrument-expressions.json`

Contains every selectable non-deprecated expression, including every Factory source expression required by Database V1.

Each expression includes:

- stable expression ID;
- exact label/output text;
- normalized lookup form;
- source/status;
- base instrument when resolved;
- occurrence/track evidence counts;
- decomposition state/coverage/residuals;
- expression -> instrument links;
- expression -> semantic concept links.

The exporter fails closed if any non-deprecated Factory expression is not selectable.

### `editor.json`

Contains product-authoring/editor data:

- parameters;
- reviewed/approved parameter options;
- reviewed/approved Easy statements;
- statement -> concept/option links;
- reviewed/approved Exclude entries.

Candidate options/statements are not shipped as normal product choices merely because they exist in the DB.

### `knowledge.json`

Contains reviewed/approved dictionary entries and their product-safe explanation surfaces:

- entry identity/type/label/difficulty;
- term variants;
- reviewed/approved definitions;
- reviewed/approved context definitions;
- reviewed/approved relations between included entries.

Current-project interpretation is still derived at runtime from MusicSpec; it is not baked into this static payload.

### `search.json`

Contains normalized search documents, not a browser-specific index implementation.

Initial document kinds:

- `genre`;
- `instrument_expression`;
- `knowledge`.

The future TypeScript search package may build in-memory/worker indexes from this stable document contract without coupling Runtime Pack v1 to a specific search library.

## 6. Determinism

Payload files use deterministic row ordering and deterministic JSON serialization.

`runtime_build_id` is SHA-256 over the contract ID plus ordered payload-file hashes. For identical runtime payloads it remains stable.

The manifest separately records the exact source `knowledge.sqlite` hash. Therefore a rebuilt DB with the same runtime semantics may have the same runtime build ID while still recording a different source artifact hash.

## 7. Build safety / resume

Canonical command:

```powershell
py scripts\data\export_runtime_v1.py `
  --knowledge ".local-data\current\knowledge.sqlite" `
  --out-dir ".local-data\current\runtime-v1"
```

Read-only preflight:

```powershell
py scripts\data\export_runtime_v1.py `
  --knowledge ".local-data\current\knowledge.sqlite" `
  --out-dir ".local-data\current\runtime-v1" `
  --plan
```

Inspect final/incomplete state:

```powershell
py scripts\data\export_runtime_v1.py `
  --knowledge ".local-data\current\knowledge.sqlite" `
  --out-dir ".local-data\current\runtime-v1" `
  --status
```

If an incomplete work directory belongs to a different source DB/contract, export fails closed. Reset only that incomplete work explicitly:

```powershell
py scripts\data\export_runtime_v1.py `
  --knowledge ".local-data\current\knowledge.sqlite" `
  --out-dir ".local-data\current\runtime-v1" `
  --reset-incomplete
```

The exporter writes to `runtime-v1.work`, checkpoints completed payload stages in `state.json`, validates the finished work, then promotes atomically. An existing promoted pack is retained as `runtime-v1.previous` during replacement.

The real DB/source files and generated packs remain ignored local artifacts. A normal export also writes its machine-readable operation result to `.local-data/current/reports/runtime-export-v1.json`; `--report` is only an override.

## 8. Validation gates

Before promotion the exporter checks:

- `PRAGMA integrity_check == ok`;
- all non-deprecated Factory instrument expressions are selectable;
- Runtime Pack source-expression count matches the source DB;
- source output wording is present and not normalized away;
- expression IDs are unique;
- `suno-structured-v1` keeps the Database V1 budget contract when present;
- every payload is valid JSON and receives a recorded hash/count.

Synthetic CI additionally tests plan/no-write behavior, lossless expression export, no-op reruns, stale-work rejection/recovery and previous-pack retention.

## 9. Runtime loader contract

The TypeScript runtime loader must start from `manifest.json` and verify:

1. supported `schema` + `schema_version`;
2. required payload files exist;
3. file hashes match before trusting a changed/downloaded pack where integrity verification is practical;
4. stable IDs are retained directly; display labels are never treated as identity.

Runtime code must not depend on the physical SQLite schema once the pack has been compiled.

## 10. Future evolution

A compatible additive payload extension may remain Runtime Pack v1 when old consumers can safely ignore it.

A breaking semantic/shape change creates Runtime Pack v2 with explicit loader/compiler compatibility handling. Do not silently reinterpret an old pack under new semantics.
