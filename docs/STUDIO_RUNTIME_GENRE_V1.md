# Prompt V'gine — Studio Runtime + Genre v1

**Status:** implemented application slice  
**Date:** 2026-09-21

## 1. Scope

This slice is the first Studio feature backed by the real Runtime Pack.

```text
.local-data/current/runtime-v1
  -> stage into ignored Studio public assets
  -> browser fetch
  -> @vgine/runtime-data validation
  -> shared local search index
  -> Genre picker
  -> MusicSpec
  -> @vgine/compiler
  -> live structured prompt + budget
```

No mock genre vocabulary is used.

## 2. Owner-local Runtime Pack staging

Generated Runtime Pack data remains untracked.

Stage the current local pack into the Studio public asset root:

```powershell
pnpm runtime:stage
```

Default source:

```text
.local-data/current/runtime-v1
```

Generated destination:

```text
apps/studio/public/runtime-v1
```

The destination is ignored by Git.

`pnpm dev` first rebuilds the internal TypeScript workspace packages, then stages the Runtime Pack, then starts Vite. In development Vite resolves exact internal `@vgine/*` JavaScript imports from workspace source so stale ignored `packages/*/dist` artifacts cannot hide newly added exports.

A local static build containing the staged runtime assets is:

```powershell
pnpm build:with-runtime
```

Normal CI `pnpm run build` remains independent of owner-local generated data.

## 3. Runtime validation in the browser

Studio starts from `manifest.json` and loads the bootstrap payload through `@vgine/runtime-data`.

The browser path validates:

- Runtime Pack schema/version;
- manifest counts;
- core/genres/search payload schemas;
- renderer/MusicSpec section compatibility;
- payload SHA-256 where WebCrypto is available.

If the pack is missing or invalid, Studio shows a clear runtime-error state. It does not fall back to fabricated product data.

## 4. Search benchmark acceptance

Owner-local benchmark on the real current Runtime Pack:

```text
documents: 10,348
index build: 92.014 ms

query latency:
  min:    2.155 ms
  median: 4.900 ms
  P90:    9.462 ms
  P95:   10.117 ms
  P99:   14.472 ms
  max:   14.472 ms
```

Representative result counts included:

- `boom bap`: 7
- `guitar`: 50
- `electric guit`: 50
- `transient`: 1
- `warm`: 48
- `vocal`: 10
- `clean`: 50

### Decision

The in-house dependency-free search kernel is accepted for the current Runtime Pack.

Do **not** add Fuse.js, MiniSearch, FlexSearch, Algolia, hosted search, or another search/index dependency merely for baseline performance.

The ~92 ms index build happens once during asynchronous Runtime Pack loading. The resulting index is shared by the Studio. Interactive queries use React deferred updates.

A Web Worker remains an available architecture boundary but is **not required by current measurements**. Revisit only if real UI profiling shows frame/input regressions after richer result rendering.

## 5. Genre picker

The Genre facet now uses the real:

- 24 Major Genres;
- 1,564 reviewed taxonomy genres/subgenres;
- Runtime Pack aliases/search terms;
- stable genre IDs.

Interaction model:

1. choose active role: Foundation / Fusion / Accent;
2. browse one of 24 Major Genres or search directly;
3. result lists are bounded to 12 items initially;
4. `Show more` expands in bounded 12-item batches rather than mounting all 1,564 entries;
5. stable IDs are written to MusicSpec; labels remain display data.

Foundation is required. Fusion and Accent remain optional and removable.

## 6. MusicSpec creation rule

Before a Foundation genre is chosen, Studio has **no MusicSpec project yet**.

The first Foundation selection creates a valid `music-spec-v1` object. Subsequent genre edits use shared domain helpers in `@vgine/music-spec`.

There is no separate hidden genre/prompt state.

## 7. Live compiler path

Once a MusicSpec exists:

```text
MusicSpec
  + validated Runtime Pack compiler knowledge
  -> compileMusicSpec()
  -> structured Style prompt
  -> budget state
  -> diagnostics
  -> separate Exclude text
```

The live preview therefore uses the production compiler path, not a React-specific renderer.

Copy/Export is enabled only when a compiled prompt exists and the semantic budget is valid.

## 8. Studio presentation contract

The production Studio follows the supplied V'GINE concept's core interaction composition rather than a generic dashboard:

- editorial top bar and product intro;
- horizontal four-stage Sound DNA / Pulse / Palette / Finish navigation;
- large color-coded Foundation / Fusion / Accent cards;
- inline search/browse picker rather than a giant dropdown;
- sticky dark record-sleeve Live Prompt with Style/Exclude tabs and budget meter;
- mobile Studio/Preview switching through a fixed bottom dock.

This is a presentation/interaction contract only. Demo-derived local recommendation values and demo-only prompt rules are not production data sources.

## 9. Current deliberate limitations

This slice implements the Genre facet end-to-end.

Other facets remain visible as real MusicSpec structure but do not invent option data while the corresponding product controls are unfinished.

Not implemented yet:

- Instrument-expression production picker;
- dictionary/knowledge detail panels;
- Easy statements/Advanced parameter controls;
- persisted projects/IndexedDB;
- search Worker transport;
- Motion-for-React;
- Radix behavior primitives;
- Tauri packaging.

## 10. Next application slice

Preferred order:

1. extract the Genre picker mechanics into the reusable V'gine Picker/SearchResults pattern;
2. add lazy Runtime Pack repositories for instrument expressions and knowledge details;
3. implement the Instruments production picker against all 6,035 source expressions;
4. add project persistence behind the documented `ProjectStorage` boundary;
5. expand shared MusicSpec controls into the remaining facets;
6. introduce Radix/Motion-for-React only where concrete interaction behavior justifies the dependency.
