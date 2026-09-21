# Prompt V'gine — Runtime Data + Search v1

**Status:** implementation foundation accepted  
**Date:** 2026-09-21  
**Packages:** `@vgine/runtime-data`, `@vgine/search`

## 1. Runtime-data boundary

`@vgine/runtime-data` is the application-facing boundary above Runtime Pack v1.

It owns:

- Runtime Pack manifest/version validation;
- bootstrap payload parsing for `core.json`, `genres.json` and `search.json`;
- manifest-count consistency checks;
- optional SHA-256 payload verification through an injected hash function;
- stable-ID preservation;
- adaptation of Runtime Pack renderer/genre data into the pure compiler view.

It does **not** depend on React, browser storage, Tauri, SQLite or a search library.

The initial bootstrap intentionally does not load all product payloads. Instrument detail, knowledge detail and editor payloads are added through dedicated repositories when features actually require them.

## 2. Loader contract

Runtime Pack loading starts from `manifest.json`.

```text
manifest.json
  -> validate contract/schema
  -> core.json
  -> genres.json
  -> search.json
  -> validate payload schemas/counts
  -> optional hash verification
  -> RuntimeBootstrap
```

Unsupported Runtime Pack versions fail closed.

The package exposes a tiny transport abstraction:

```ts
interface RuntimePackReader {
  readText(fileName): Promise<string>
}
```

Web `fetch`, Tauri filesystem access and tests can therefore use the same parser without leaking transport concerns into domain logic.

## 3. Compiler adapter

`buildCompilerKnowledge()` derives the compiler-facing view from validated Runtime Pack bootstrap data:

- runtime build ID;
- renderer profile maximum/overflow policy;
- renderer section order/labels/soft targets;
- stable genre ID -> label mapping.

Renderer sections that are not valid MusicSpec v1 facets fail closed.

The compiler therefore remains independent of the physical Runtime Pack JSON shape.

## 4. Search document contract

Search consumes the stable Runtime Pack `search.json` documents:

```text
id
kind: genre | instrument_expression | knowledge
label
terms[]
definition?
```

Search result identity always uses stable IDs. Labels/terms are display/search surfaces only.

## 5. Search v1 ranking

The initial search engine is deliberately dependency-free.

Normalization:

- Unicode NFKD;
- combining-mark removal;
- lowercase;
- punctuation/separator collapse;
- whitespace normalization.

Ranking tiers:

1. exact label;
2. exact alias/term;
3. label prefix;
4. alias/term prefix;
5. all query tokens prefix-match surface tokens;
6. label substring;
7. alias/term substring;
8. multi-token containment.

Results then use deterministic normalized-label / kind / ID tie-breakers.

The engine does **not** currently implement edit-distance/fuzzy typo correction. That capability is deferred until benchmark/use evidence shows it materially improves the picker.

## 6. Worker-ready boundary

`@vgine/search` exposes a serializable request/response envelope:

```text
SearchRequest
  type: search
  requestId
  query

SearchResponse
  type: search_result
  requestId
  results[]
```

The same pure handler can run synchronously in tests or behind a Web Worker later.

## 7. Performance gate

The real Runtime Pack currently contains **10,348 search documents**.

Before adopting a search/index dependency, benchmark the in-house v1 kernel against the real payload:

```powershell
pnpm bench:search
```

Default input:

```text
.local-data/current/runtime-v1/search.json
```

The benchmark reports:

- document count;
- index-build time;
- 100 query samples;
- median/P90/P95/P99/max query latency;
- result counts for representative queries.

Only measured shortcomings justify an external search dependency or a more complex precompiled index.

## 8. Current dependency state

No new external runtime dependency is introduced by this slice.

```text
music-spec <- runtime-data <- search
      ^
   compiler
```

All four packages compile under the existing pinned Node/pnpm/TypeScript toolchain.

## 9. Next layer

After real-payload search benchmarking:

1. decide whether the simple search kernel is sufficient;
2. add detailed runtime repositories lazily where UI features need them;
3. establish V'gine semantic design tokens and motion recipes;
4. scaffold the React/Vite Studio shell;
5. place search behind a Worker when application profiling justifies the boundary.
