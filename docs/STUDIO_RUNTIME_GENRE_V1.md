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
3. result lists are compact at 12 items initially;
4. `Alle anzeigen` explicitly expands the complete current result set; expanded rows use browser rendering containment and provide a floating return-to-top control;
5. stable IDs are written to MusicSpec; labels remain display data.

All genre influences are optional. A project with zero genres is valid. If genre guidance is used, Foundation remains the first role and Fusion/Accent are additive.

## 6. MusicSpec creation rule

Studio creates a valid empty `music-spec-v1` immediately. `genre_influences: []` is valid, so users can build the rest of the prompt without selecting a genre. Genre selections update that same MusicSpec through shared domain helpers; there is no separate hidden genre/prompt state.

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


## 11. Pool preferences

Genre results are the first consumer of the reusable large-pool preference contract:

- mouse/touch long-press 1.5 s -> favorite;
- favorite long-press 2 s -> unfavorite;
- visual hold progress prevents ambiguous gesture state;
- favorite entries rank first, ordered by usage count and then recency;
- selecting an entry records usage;
- selection closes the picker and resets it to compact mode;
- browser preference storage is independent from MusicSpec and therefore survives new-prompt/page resets.

## 12. Genre-free navigation and resets

Sound DNA may remain completely empty. The first attempt to continue forward without any genre changes the forward control into a warning/confirmation. A second activation proceeds, and that acknowledgement is remembered for that prompt only.

Each Studio chapter exposes a scoped reset. A separate new-prompt reset returns the entire MusicSpec and prompt-scoped UI state to a clean start.

## 13. Manual Style output override

The Live Prompt can be unlocked. While unlocked the user can edit or delete the final Style text directly. This is output-layer state only; MusicSpec and the deterministic compiler result remain intact underneath it.

`Original wiederherstellen` discards the manual override and restores the current compiler output. Manual text is counted against the same 1,000-character renderer ceiling.

## 14. Major Genre selectable-first contract

Major Genres are not only filters. Every Major Genre Runtime record is a valid selectable Genre influence.

When a Major Genre is active:

1. result 1 is the pure Major Genre;
2. remaining results are its subgenres;
3. an identically named subgenre record, if present, is suppressed to avoid duplicate visible choices;
4. favorites may reorder subgenres but never move ahead of the pure Major result.

Compiler knowledge resolves both Major and subgenre IDs.

## 15. Localization

Studio UI v1 supports German and English through typed application catalogs. Browser locale is used as the first default and explicit user choice persists locally.

Prompt/compiler output remains English and is not translated with the UI.

## 16. Expanded-list return behavior

The floating return-to-start button is stateful to the active expanded picker segment. It appears only after scrolling down into that segment and disappears at/above its start or after scrolling past its end.
