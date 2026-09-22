# Project Status

**Last updated:** 2026-09-22  
**Current milestone:** **Explain UX + authored Product Knowledge + multi-project library implemented** — current: ordinary-facet state visibility/mobile ergonomics

## Completion verdict

Database V1 is complete as Prompt V'gine's reproducible data foundation.

The Instruments semantic-completion phase is closed for the current Factory snapshot: every source-backed Instruments expression is preserved as a first-class selectable/renderable entity and every one is fully semantically explained. Remaining identity-only gaps are not errors; semantic-only sound layers are valid by design.

## Last owner-local completion snapshot

- Factory tracks: **10,043**
- Parsed structured-prompt sections: **115,736**
- Structured-prompt tokens: **852,459**
- Major Genres: **24**
- Taxonomy genres/subgenres: **1,564**
- Genre crosswalk: **138 reviewed decisions, 0 unresolved candidates**
- Source-backed Instruments expressions: **6,035**
- Fully semantic Instruments expressions: **6,035 / 6,035 (100%)**
- Semantic residual expressions: **0**
- Fully identity-decomposed expressions: **4,472 / 6,035 (~74.1%)**
- Canonical instrument families: **9**
- Canonical instrument entities: **164**
- Active instrument aliases: **161**

`fully_identity_decomposed` is intentionally stricter than semantic completion. Do not invent fake identities merely to raise that metric.

## Database layout

Prompt V'gine uses three local SQLite products:

1. `corpus.sqlite` — disposable Factory evidence/mining database;
2. `curation.sqlite` — **durable** reviewed authoring/curation state; never replace during normal rebuilds;
3. `knowledge.sqlite` — disposable compiled product knowledge/runtime source.

The canonical table-by-table overview and invariants live in **`docs/DATABASE_V1.md`**.

## Completed V1 guarantees

- All 6,035 source Instruments expressions are materialized and remain selectable.
- Original source-facing expression/output wording is preserved.
- Canonical identities + semantic concepts are additive metadata only.
- Genre crosswalk is complete for the current snapshot.
- Instruments semantic residual queue is empty.
- Shared-head coordination, guarded hyphen decomposition, Unicode/apostrophe/acronym tokenization, and explicit grammar scaffolding are covered by synthetic regression tests.
- Durable curation is backup-first, fingerprint/hash-bound, transactional, recompiled/validated automatically, and rollback-safe.
- Long-running builds are resumable and preserve last-known-good promoted artifacts.
- `suno-structured-v1` has a hard **1,000-character** style-prompt ceiling; current Factory maximum is exactly 1,000 and no source prompt exceeds it.
- Exclude remains a separate output channel and does not consume the style-prompt budget.

## Current build/compiler revision

`promptvgine-local-data-build-v2-resumable-3-prompt-budget`

Current repository-side database tooling is complete for V1. If the owner-local generated DBs have not yet been recompiled after the latest renderer-budget/schema merge, run the bundled finalizer once. That is synchronization/final validation, **not another curation phase**.

## Owner-local final synchronization

```powershell
Set-Location D:\prompt-engine
git pull

py scripts\data\database_foundation_session.py finalize `
  --out-dir ".local-data\current" `
  --vault ".local-data\source\GRAPH1KS_PUBLIC_VAULT_FACTORY.json.gz" `
  --genre-map ".local-data\source\GRAPH1KS_GENRE_MAP_FACTORY.json"
```

Expected result: acceptance remains `status: ok`; the compiled knowledge DB is stamped with the latest build/renderer contract. No further `knowledge_completion_session.py` review batches are expected for the current snapshot.

## Runtime/application foundation now implemented

- Application architecture is frozen in `docs/APPLICATION_ARCHITECTURE.md` and ADR-021 through ADR-029.
- Runtime Pack v1 is frozen in `docs/RUNTIME_DATA_CONTRACT_V1.md` + `schema/runtime-pack-v1.schema.json`.
- The previously recorded owner-local Runtime Pack snapshot predates Product Editor Foundation v1, Product Knowledge Foundation v1 and the PR #37 Explain UX/content-authoring changes. Do not use its Knowledge/Search/editor counts as the current product snapshot.
- Current Runtime Pack identity separately fingerprints `knowledge.sqlite`, `data/product/editor-foundation-v1.json`, and `data/product/knowledge-foundation-v1.json`. Pulling Foundation changes requires an owner-local Runtime re-export even when `knowledge.sqlite` itself is unchanged.
- Product Editor Foundation v1 now supplies 49 parameters, 262 Advanced options, 79 Easy statements and 10 Exclude entries across every ordinary facet. Product Knowledge Foundation v1 adds 400 explicit English/German Knowledge entries linked to those controls.
- `scripts/data/export_runtime_v1.py` compiles deterministic runtime payloads from `knowledge.sqlite` with plan/status, resumable staged work, stale-source rejection, validation, atomic promotion and previous-pack retention.
- Strict TypeScript/pnpm workspace is present with `@vgine/music-spec` and pure `@vgine/compiler`.
- Compiler v1 performs MusicSpec runtime validation, canonical structured rendering, separate Exclude output, exact semantic deduplication, deterministic lower-priority omission, Unicode code-point budgeting and explicit `budget_conflict` diagnostics without blind truncation.
- `@vgine/runtime-data` validates Runtime Pack v1 bootstrap payloads, manifest counts and optional hashes, then adapts renderer/genre data into the pure compiler view.
- `@vgine/search` provides dependency-free deterministic local ranking, stable-ID results and a worker-ready request/response protocol.
- `@vgine/ui` now owns semantic design tokens and the Paradise/Ash theme contract with no external font/component framework.
- `@vgine/motion` now owns durations/easings/springs and named causal recipes with reduced-motion behavior; no animation library dependency is required at this layer.
- Real 10,348-document search benchmark accepted: 92.014 ms one-time index build; median 4.900 ms, P95 10.117 ms, P99/max 14.472 ms. The dependency-free kernel remains the production baseline; no fuzzy/index dependency or Worker is justified by current measurements.
- React 19.3.0 + React DOM 19.3.0 + Vite 8.3.0 + @vitejs/plugin-react 6.1.1 are now pinned and reviewed; no Router/Radix/Motion-for-React/Zustand/TanStack package is installed yet.
- `apps/studio` now stages and validates the real Runtime Pack, builds one shared search index, renders the production Genre picker over 24 Major Genres / 1,564 taxonomy genres, writes stable IDs into shared MusicSpec state, and drives the pure compiler/live 1,000-character budget preview. Genre guidance is optional (0–3 influences), large-pool favorites persist independently of projects and rank by usage, long result sets have explicit Show All/top-return behavior, chapter/new-prompt resets are scoped, and the final Style output can be manually overridden/restored without mutating MusicSpec.
- `@vgine/ui` now includes the first reusable React primitives (`Surface`, `Button`, `IconButton`, `Text`, `Stack`, `Cluster`) styled only through V'gine semantic tokens.
- Local operator outputs are standardized: flat `reports/`, separate `logs/`, durable `.local-data/backups/`; legacy nested report folders have a safe plan/apply migrator.

## Current blocker

**No implementation blocker.** The accepted 400-entry Product Knowledge authoring batch has been imported into the tracked Product Knowledge Foundation: all 49 parameter concepts, 262 Advanced values, 79 Easy statements and 10 Exclude entries now carry substantive English/German musical explanations instead of generated editor-meta copy.

The authored text is preserved as supplied; UI labels and prompt-facing English terminology are not localized or renamed by the Knowledge layer. CI now guards the tracked foundation against reintroducing the rejected preset/control/rendering meta templates.

Owner-local Runtime rebuild and visual/touch smoke remain required because generated Runtime Pack artifacts and the owner's desktop/browser session are local-only.

Future enrichment does not reopen the V1 database milestone unless it changes schema/invariants.

## Next concrete phase

Proceed in this order:

1. owner-locally re-export Runtime Pack v1 and reproduce the reference prompt with Explain enabled;
2. verify selection-time Explain on Product controls, Genre, Instruments and Exclude; fix only genuine explicit-link/UX defects — never infer Knowledge identity from rendered strings;
3. owner-locally exercise the project library: legacy restore, create, rename, switch, duplicate, export/import and active-project deletion;
4. continue Studio ergonomics/visual refinement; reserve broad motion polish until interaction/functionality is accepted.

## Do not redo

- Do not redo the completed genre crosswalk.
- Do not reopen the 6,035-expression semantic review merely because identity coverage is below 100%.
- Do not collapse source expressions into the canonical-instrument list.
- Do not remove semantic-only sound layers.
- Do not delete/replace durable `curation.sqlite`.
- Do not commit Factory/generated DB/report/backup artifacts.
- Do not promote corpus frequency to semantic truth.
- Do not implement the 1,000-character limit as blind `prompt[:1000]` truncation.

## Canonical continuation docs

- `docs/DATABASE_V1.md` — completed DB structure/table map/invariants
- `docs/HANDOVER.md` — next-thread handoff
- `docs/DATA_ARCHITECTURE.md` — lifecycle/architecture
- `docs/LOCAL_DATA_BUILD.md` — owner-local build/finalization commands
- `docs/MUSICSPEC_V1.md` — application semantic state
- `docs/PROMPT_FORMAT.md` — renderer contract
- `docs/RUNTIME_DATA_CONTRACT_V1.md` — compiled application data boundary
- `docs/APPLICATION_ARCHITECTURE.md` — production stack, module/design/motion architecture
- `docs/COMPILER_V1.md` — implemented compiler/budget behavior
- `docs/RUNTIME_SEARCH_V1.md` — runtime loader/search contract and benchmark gate
- `docs/DESIGN_SYSTEM_V1.md` — semantic themes/tokens/motion foundation
- `docs/STUDIO_RUNTIME_GENRE_V1.md` — real Runtime Pack staging, Genre picker and live compiler integration
- `docs/LOCAL_OUTPUT_LAYOUT.md` — canonical local reports/logs/backups layout

## Current interaction contract additions

- Valid MusicSpec genre count is **0–3**; no Genre section is emitted when none is selected.
- The first forward navigation from Sound DNA without a genre asks once; the acknowledgement resets with a new prompt.
- High-cardinality pools use persistent favorites with mouse/touch hold gestures and usage-based ordering.
- Genre result expansion is explicit `Alle anzeigen`; selection returns the picker to compact state.
- Every Studio page can reset its owned facets; new prompt reset is global.
- Final Style output can be unlocked, manually edited/deleted and restored to the deterministic compiler result.
- Product-owned knowledge now includes a tracked V'gine lexicon seed; owner-local knowledge/runtime rebuild is required before that new entry appears in generated Runtime Pack data.

## Current Studio UX/i18n additions

- All 24 Major Genres are permanently visible in the picker.
- A selected Major Genre is itself the first selectable result before its subgenres and compiles through the same Genre influence path.
- Studio UI has typed German/English catalogs with persisted locale preference; renderer/prompt output remains English.
- Explanation mode is icon-only with accessible label/title.
- Expanded Genre lists use viewport/segment-scoped return-to-start visibility rather than an always-present sticky control.
- Hover contrast is explicitly defined across the current Studio button families.
- Motion remains intentionally restrained until interaction/functionality coverage is further along.

## Recently used quick choices

- Genre, Instruments and Exclude now surface up to six locally remembered recently used choices when the pool is in its unfiltered browse state.
- Recency comes from the existing `lastUsedAt` values already stored in IndexedDB-backed pool preferences; no new persistence channel or project semantics were introduced.
- Instrument/Exclude recent chips reflect current selection state and toggle directly; Genre recent chips apply to the role the user explicitly opened.
- Recent rows disappear while search/filter intent is active so they do not compete with the user's current query.
- Mobile recent chips use practical 44 px targets and wrap instead of introducing horizontal-scroll traps.

## Specialized selected-state rails

- Instruments and Exclude now use the same visible-current-state pattern as ordinary facets instead of exposing only a count plus a loose chip row.
- Both specialized surfaces show a labeled current-state rail with direct per-item removal and a pool-scoped clear-all action.
- Instrument clear-all resets only the Instruments facet through the shared MusicSpec helper.
- Exclude clear-all affects only the separate Exclude channel.
- Legacy/imported Exclude items without stable IDs are now individually removable from the current-state rail instead of becoming effectively stuck UI entries.
- Mobile selected chips remain practical 44 px touch targets; no nested horizontal scroller was introduced.

## Production Instruments slice

- Palette now lazy-loads validated `instruments.json` + `instrument-expressions.json` only when needed.
- All 6,035 source-backed Instrument expressions remain first-class selectable options.
- Search reuses the accepted shared Search v1 index; no second search dependency/index is introduced.
- Canonical instrument families filter the expression pool where identity links exist.
- Selected expressions persist stable expression IDs plus original `output_text` in the MusicSpec `instruments` facet.
- Selection immediately renders through the pure compiler into the English `[Instruments: ...]` section.
- Instrument favorites reuse the same persistent hold/usage contract as Genres.
- Show All auto-loads DOM chunks on scroll instead of requiring repeated paging or mounting 6,035 result cards at once.

## Production facet-editor slice

- Favorite hold timing is now 0.8 s add / 1.0 s remove with synchronized SVG/state timing; add feedback uses theme-semantic success green plus a drawn checkmark.
- Expanded-segment return-to-start control now lives on the left viewport edge.
- `editor.json` is now a lazy, manifest-validated and cached Studio Runtime payload.
- Pulse, Palette and Finish no longer use placeholder cards for ordinary facets; they render the shared production Easy/Advanced FacetEditor.
- Easy consumes Runtime statements; Advanced consumes Runtime parameter options plus per-facet custom text.
- Parameter cardinality follows schema value types: `multi` is multi-select, other option-bearing types are exclusive within their parameter.
- Finish now exposes the real Runtime Exclude catalog and writes only to `MusicSpec.exclude[]` / separate Exclude compiler output.

## Explain loading defect fix

- Fixed a React effect dependency bug that could leave every opened Knowledge popover permanently stuck on `Loading explanation …`.
- The loader effect previously set local state to `loading` while also depending on that same status; the rerender immediately ran effect cleanup, marked the in-flight request stale, and then discarded its eventual result.
- Knowledge loading now depends only on the actual load triggers (open state, entry ID and loader identity), so successful payloads can transition to ready/error normally.
- Lazy Runtime payload promises now clear their cache after rejection, allowing a later user retry instead of permanently reusing one rejected promise.

## Runtime Knowledge surface slice

- Favorite hold duration instructions have been removed from visible pool hints and hover titles; gesture timing remains internal behavior.
- `knowledge.json` now has typed Runtime parsing/validation and cached lazy Studio loading.
- Explanation mode now activates real Knowledge terms instead of being chrome-only.
- Selected Genre labels, ordinary facet section labels, Advanced parameter labels and the Instruments section can expose reviewed definitions when their Runtime records carry Knowledge IDs.
- Definitions resolve active UI locale first with English fallback; prompt output remains English.
- Unlinked labels stay plain text; no explanation is generated from label guesses.

## Genre picker focus return

- Genre role triggers now expose their expanded relationship to the inline picker and receive focus back after explicit close, Escape, successful selection, or clearing the active role.
- Escape closes the open Genre picker without leaving keyboard focus stranded in content that is immediately removed from the DOM.
- The existing desktop behavior still focuses/selects the search field on open; touch/mobile still avoids forced software-keyboard activation.

## Finish review + Genre picker focus

- Finish no longer ends in a no-op `Done` button that requests the already-active Finish chapter.
- The final stage action is now an explicit `Review prompt` path: it focuses the Live Prompt on desktop and opens the mobile Live Prompt surface on narrow screens.
- Review selects Style by default, but falls back to Exclude when no Style output exists and Exclude does.
- Genre role pickers now locate their picker surface on open; desktop/fine-pointer sessions also focus/select the search input immediately for keyboard typing.
- Genre picker focus is intentionally not forced on touch/mobile so opening a role does not unexpectedly summon the software keyboard.

## Facet jump scroll position

- The chapter-local facet rail now acts as a lightweight scrollspy: the facet currently passing the editing viewport's sticky-navigation threshold is highlighted and exposed with `aria-current="location"`.
- Scroll tracking is requestAnimationFrame-throttled and inspects only the 3–7 explicit facet targets in the active chapter; it does not introduce a new observer/index/state persistence layer.
- Scrollspy pauses while the mobile Live Prompt replaces the editor and recomputes when Studio becomes visible again.

## Chapter-local facet jump rail

- Every loaded chapter now exposes its facets as direct navigation targets between the chapter header and editor stack.
- The rail shows live per-facet active-item counts from the same MusicSpec state used by chapter counts; Finish also includes the separate Exclude surface.
- Desktop keeps this facet rail sticky beneath the chapter tabs so long Advanced/Instrument pages can jump directly between editing regions without returning to the top.
- Mobile keeps the rail in normal document flow and wraps touch-sized targets instead of adding another nested horizontal scroller.
- Facet jumps reuse the existing explicit `data-facet` source targets and source-locate behavior; no labels/prompt strings are parsed.

## Persistent chapter navigation + desktop shortcuts

- Chapter navigation now remains sticky below the global top bar during long Genre/Instrument/Advanced editing sessions instead of disappearing after the first viewport.
- Source-jump scroll margins account for the sticky chapter bar so reverse Live Prompt navigation does not place the target facet underneath navigation chrome.
- Desktop keyboard users can jump directly with `Alt+1` through `Alt+4`; the shortcuts route through the same chapter guard logic as mouse navigation and do not fire while typing/editing or while project/manual-copy overlays are active.
- Shortcut hints stay visually quiet until chapter hover/focus and are hidden on touch/mobile layouts.

## Chapter navigation state clarity

- The four Studio chapter tabs no longer imply completion merely because the user navigated past them.
- Each chapter now derives a live active-item count from MusicSpec plus Finish Exclude state and surfaces that count directly in navigation.
- Genre influences, ordinary selections, facet custom wording and Exclude entries contribute to the visible count; empty/optional chapters remain visually neutral.
- Accessible chapter labels include the same active-choice count while mobile uses compact count badges.

## Live Prompt -> authoring source navigation

- Deterministic Live Prompt Style lines are now interactive source links rather than read-only dead-end text.
- Clicking/focusing a rendered section navigates to the chapter that owns its explicit section key, returns from mobile preview to Studio, scrolls the source editor into view and gives it a short causal locate highlight.
- Genre and Instruments expose explicit `data-facet` source targets alongside ordinary FacetEditor cards; no prompt-label/string guessing is used.
- The Exclude output links back to the separate Finish/Exclude surface.
- Manual Style overrides remain plain output only and intentionally do not get reverse navigation because the product does not back-parse arbitrary user text into MusicSpec.
- Desktop source cues stay visually quiet until hover/focus; mobile cues remain visible with practical 44 px activation targets.

## Clipboard reliability + active-output copy

- Copy now follows the documented progressive fallback contract: Clipboard API -> legacy `execCommand` -> explicit manual-copy surface.
- Clipboard API permission failure no longer skips directly to an unexplained error; the legacy path is attempted even when the modern API exists but rejects.
- The final fallback opens a focused, fully selected clean-output dialog/sheet with keyboard focus containment, Select All and explicit close controls.
- Copy availability is derived from the active Style/Exclude tab, so Exclude can be copied even when Style is empty and all header/preview/mobile copy controls share one validity rule.
- `Ctrl / ⌘ + Enter` follows that same active-output rule and is suppressed while project/manual-copy overlays are open.

## Desktop facet density + parameter scan state

- Wide desktop ordinary facets now use available horizontal space instead of stretching every Advanced parameter into a full-width vertical row.
- At wide desktop widths, Advanced parameter groups form a two-column scan grid and Easy statement cards expand to three columns; narrower desktop/tablet/mobile layouts retain the simpler single/two-column compositions.
- Every Advanced parameter header now shows its active value(s) directly beside the parameter identity, with compact summarization for multi-select values.
- Active parameter cards get a restrained state accent and a parameter-scoped clear action, so expert users can inspect and reset one parameter without hunting through the full facet state rail.
- Custom Advanced wording remains full-width below the parameter grid. No controls were moved into dropdowns, drawers or popups.

## Explain click-through + real slash-search shortcuts

- Knowledge-linked selectable labels no longer steal the primary click/tap. Hover/focus previews Explain; clicking the label selects/toggles the actual Easy/Advanced/Genre/Instrument/Exclude control.
- Touch gets a separate compact explanation affordance beside selectable Knowledge terms so the label itself remains a normal selection target.
- Genre, Instruments and Exclude now implement the `/` shortcut already advertised in their search fields. The shortcut focuses/selects the active search input and ignores text-entry/editable targets and modifier chords.

## Ordinary facet state rail + mobile Explain access

- Every ordinary FacetEditor now keeps its active MusicSpec state visible above the Easy/Advanced authoring surface.
- Selected Easy statements, Advanced options, numeric values and custom wording are represented as compact removable chips; users no longer need to hunt through an expanded option set merely to see or remove current state.
- The rail exposes a facet-scoped clear action without changing the Easy/Advanced view contract.
- State labels come from the same Runtime statement/option/parameter records that created the selection; no prompt-string parsing or semantic guessing was added.
- Mobile chips and clear controls use practical touch targets and wrap rather than introducing a nested horizontal scroller.
- Explain mode remains directly toggleable on narrow/mobile screens through the persistent bottom dock instead of disappearing when the top bar becomes constrained.
- The visible `Ctrl / ⌘ + Enter` copy affordance is now a real global Studio shortcut for the currently active Style/Exclude output; it is suppressed while the project library is open and respects output/budget validity.

## Project library v1

- Studio now supports multiple local projects on the existing IndexedDB `ProjectStorage` contract instead of treating the fixed `active` record as the permanent project identity.
- The active project pointer is separate local user data; legacy `active` projects migrate losslessly to a fresh project ID.
- New Project preserves the previous project, then opens a fresh blank MusicSpec instead of destructively resetting the only project.
- The project library supports inline naming, open/switch, duplicate, two-click delete, per-project export and validated import.
- Import never overwrites by exported ID; it validates `vgine-project-v1` and creates a fresh local identity.
- Export is explicit local file download only; there is still no cloud/server persistence path.
- Desktop uses a project switcher in the top bar and a full library surface; mobile collapses the switcher to a touch-sized icon and presents the library as a bottom sheet.
- Project document helpers now cover title normalization, JSON parse/serialize and duplication; regression tests cover these semantics.

## Project persistence v1

- Added `@vgine/project-storage` with versioned `vgine-project-v1` documents and a portable `ProjectStorage` interface.
- Web Studio uses a dependency-free IndexedDB adapter; an in-memory adapter covers the contract in Node tests.
- The active project restores MusicSpec, explicit manual Style override, active chapter and genre-skip acknowledgement after reload.
- Studio debounces local autosave and exposes restoring/saving/saved/error/unavailable status in the top bar.
- MusicSpec validation is reused when loading persisted projects; unsupported/corrupt project data is not silently accepted.
- Theme, locale and Favorites remain separate device-local IndexedDB user data rather than project data.

## Product Editor Foundation v1

- Added tracked product baseline `data/product/editor-foundation-v1.json`: 49 parameters, 262 Advanced options, 79 Easy statements and 10 baseline Exclude entries.
- All 15 ordinary non-Genre/non-Instrument facets now have both Easy and Advanced selectable content.
- Runtime export merges Foundation first and reviewed/approved DB editor rows second by stable ID.
- Runtime manifest fingerprints the Foundation separately from `knowledge.sqlite`; changing the baseline forces a Runtime rebuild.
- Runtime validation fails if any required facet loses parameter or Easy-statement coverage.
- Sound DNA now renders Era + Key/Mode alongside the specialized Genre picker.
- BPM now supports explicit 40–220 numeric selection plus recommended values while remaining unset until user action.

## Editor depth + personal presets

- Added global `All Easy / All Advanced` control while retaining per-facet mode switches.
- Easy/Advanced mutations are now mutually exclusive within each ordinary facet; view switching alone does not delete state.
- Easy statements are single active presets per facet, preventing internally contradictory Easy selections.
- Advanced custom wording can be hold-saved as a facet-scoped personal preset, usage-ranked, reapplied, hold-removed or cleared with two-click confirmation.
- Added generic IndexedDB user-data storage and migrated pool Favorites, Theme and locale away from active `localStorage` persistence.
- Editor-depth preferences and Advanced presets persist locally in IndexedDB.
- No server/cloud persistence path exists for these user data.

## Product Knowledge Foundation + Explain UX

- Product Knowledge Foundation v1 still contains 400 explicit stable entries covering all Product Editor parameters/options/Easy statements/Exclude baseline entries.
- Product Editor Foundation records keep their explicit Knowledge links; Genre/Instrument explanation still uses Database V1 semantic links. No rendered-string inference was introduced.
- Explain is now available at authoring time: Easy statement labels, Advanced option/recommended-value labels, Genre results, Instrument-expression results and Exclude results can expose their linked Knowledge before the user selects them.
- Desktop Explain uses a subtle dashed term affordance with delayed hover/focus. On selectable labels, click/keyboard activation now performs the actual option action instead of pinning Explain; non-selectable terms may still pin. Touch keeps label taps for selection and uses a separate compact explanation affordance for the mobile sheet.
- Explanation UI is a singleton viewport portal, so parent overflow cannot clip it and multiple cards cannot overlap.
- The old Knowledge-origin chip rows beneath the Live Prompt were removed. Explain UI no longer consumes prompt-preview layout space and still never enters copied Style/Exclude text.
- Favorite hold feedback now renders outside the small preset control's clipping boundary; hit areas are separated from explainable labels so favorite/select gestures and Explain can coexist.
- Product Knowledge v1 now contains the accepted authored EN/DE musical explanations for all 400 Product Foundation entries; the generated preset/control/rendering meta copy is no longer the tracked baseline.
- `scripts/data/import_product_knowledge_authoring.py` remains the guarded authoring/import path for future editorial revisions and rejects the known UI-meta template wording.
- Owner-local Runtime re-export remains required after Product Knowledge copy changes because `product_knowledge_foundation_sha256` participates in Runtime identity.
