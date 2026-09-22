# Handover — Explain UX + authored Product Knowledge

**Last updated:** 2026-09-22  
**Handoff target:** owner-local Runtime/Explain/project-library acceptance plus ordinary-facet state-rail smoke, then remaining Studio ergonomics  
**Milestone:** Database V1 remains closed; Explain is selection-time/portal-based; Product Knowledge v1 is fully authored; multi-project local library/naming/duplicate/import/export is implemented on ProjectStorage

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
10. `docs/COMPILER_V1.md`
11. `docs/RUNTIME_SEARCH_V1.md`
12. `docs/DESIGN_SYSTEM_V1.md`
13. `docs/STUDIO_RUNTIME_GENRE_V1.md`
14. `docs/LOCAL_OUTPUT_LAYOUT.md` when operating local reports/logs
15. `docs/LOCAL_DATA_BUILD.md` only when operating the local databases

Owner workspace: `D:\prompt-engine`.

Real Factory files, generated SQLite databases, reports, checkpoints and backups are local-only and must never be committed.

## Current merged repository state

- PR #37 merged CI-green as `dd503031ed546f0ed508763ebab2efe2269ec83c`.
- Explain no longer renders chip rows beneath Live Prompt sections.
- Explicitly linked terms are explainable before selection via dashed inline affordances.
- One viewport-level explanation surface is active at a time; desktop supports hover/focus + pin, mobile uses tap + bottom sheet.
- Compact favorite/preset hold feedback is no longer clipped inside the 38 px control.
- Product Knowledge content remediation is complete for v1: all 400 Product Foundation entries now use the accepted authored EN/DE musical explanations; the old generated preset/control/rendering prose is no longer the tracked baseline.

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

Owner-local real Runtime Pack validation completed successfully:

- the historical accepted snapshot above predates Product Editor Foundation v1 and Product Knowledge Foundation v1;
- keep its Genre/Instrument/Search performance evidence, but do not treat its Knowledge/editor counts or runtime build ID as the current post-#35 local pack;
- after PR #35, owner-local Runtime Pack must be re-exported because both `editor.json` and `knowledge.json` are now supplemented by tracked Product foundations;
- current manifest identity includes `knowledge_db_sha256`, `editor_foundation_sha256`, and `product_knowledge_foundation_sha256`.

The TypeScript foundation now adds:

- root pnpm workspace, Node 24 LTS baseline and strict TypeScript;
- `packages/music-spec` — typed MusicSpec v1 + runtime validation;
- `packages/compiler` — pure deterministic renderer/budget kernel;
- compiler regression tests using Node's built-in test runner;
- `docs/COMPILER_V1.md` — exact protection/compaction behavior.

`packages/runtime-data` now validates/loads the Runtime Pack bootstrap contract and adapts it into compiler-domain data. `packages/search` now implements deterministic exact/prefix/token/substring ranking with stable IDs and a worker-ready request/response envelope. A real-payload benchmark harness is available as `pnpm bench:search`.

`packages/ui` now provides the semantic token contract, Paradise/Ash themes and the first React primitives. `packages/motion` centralizes causal motion recipes and reduced-motion behavior.

`apps/studio` now stages/loads the owner-local Runtime Pack, validates the bootstrap payload, builds one shared local search index, browses/searches the real 24 Major Genres + 1,564 taxonomy genres, exposes all 6,035 source-backed Instrument expressions, and provides complete Product Editor controls across Era/BPM/Key-Mode/Groove/Melody/Harmony/Drums/Bass/Exciters/Texture/Vocal/Dynamics/Space-Mix/Production/Structure. It supports valid genre-free MusicSpec, optional Foundation/Fusion/Accent state, local ProjectStorage autosave, global/per-facet Easy/Advanced depth, personal Advanced presets and the pure compiler live prompt/budget output. Its presentation remains aligned to the supplied V'GINE Studio concept and still does not add Router, Radix, Motion-for-React, Zustand or TanStack.

Real search benchmark acceptance: 10,348 documents; 92.014 ms index build; median 4.900 ms; P95 10.117 ms; P99/max 14.472 ms. Keep the dependency-free kernel unless later profiling proves a concrete need.

Development-runtime rule: `pnpm dev` must build the internal workspace packages before staging Runtime Pack assets and starting Vite. Vite development also resolves exact internal `@vgine/*` JavaScript imports from workspace source, so ignored/stale `packages/*/dist` output cannot hide newly added exports. Production builds continue to validate compiled package output.

## Next-thread mission

Treat Database V1, Runtime Pack v1, Product Editor Foundation v1 and Product Knowledge Foundation v1 as accepted dependencies.

Recommended order:

1. **Re-export owner-local Runtime Pack** after pulling `main`; the authored Product Knowledge file changes its independent Runtime fingerprint.
2. **Rebuild the user's reference prompt** and inspect selection-time Explain section by section. Product definitions should now teach the actual concept before selection without changing copied prompt text.
3. **Investigate only explicit-link gaps.** Product controls resolve through Product Knowledge; Genre resolves through existing Genre Knowledge; Instruments resolve through canonical instrument/concept Knowledge. Never add rendered-string guessing.
4. **Smoke the project library** on desktop and mobile: migrate the legacy active project, create/rename/switch/duplicate, export/import, delete active/non-active projects and reload the page to verify pointer restore.
5. **Continue Studio ergonomics and visual refinement** while keeping broad motion polish late.

## Post-V1 enrichment is allowed but is not a blocker

The following can be added incrementally without declaring Database V1 unfinished:

- Vocal vocabulary/enrichment (current Factory has no structured Vocal corpus coverage);
- more Easy statements;
- more Advanced parameters/options;
- richer definitions/context definitions/relations;
- recommendation/quality-check logic;
- new Factory snapshot data after diff review.

## Definition of success for the next thread

Do not spend the next thread re-mining the database. The first success criterion is a fresh local Runtime Pack in which the user's representative multi-section prompt has Explain-mode coverage for Product Foundation selections and no explanation UI leaks into copied prompt text.

Then continue runtime/application UX while preserving the V1 DB contract. If a proposed implementation requires changing a Database V1 invariant, call that out explicitly as a schema/architecture change rather than silently mutating the foundation.

## Interaction additions carried forward

- MusicSpec v1 now accepts zero to three genre influences. Existing v1 documents remain valid.
- Sound DNA can be skipped after one per-prompt warning confirmation.
- Large pools have reusable user favorites with 0.8 s add / 1.0 s remove hold gestures, synchronized progress feedback and usage-based ranking.
- Explicit Show All replaces repeated 12-item paging; expanded Genre lists include a floating return-to-top action and collapse after selection.
- Page reset clears only the current chapter's state; new prompt reset clears the complete prompt session but not user favorites.
- The final Style output may be manually overridden. The override never mutates MusicSpec; restoring the original returns to the current deterministic compiler result.
- `docs/VGINE_LEXICON_ENTRY.md` documents the verified product-name history. The knowledge compiler seeds the V'gine entry reproducibly; rebuild owner-local knowledge/runtime data to surface it.

## Studio i18n / Genre picker v2 carry-forward

- UI locale and renderer language are separate. German/English UI is implemented via typed catalogs; Suno output remains English.
- All 24 Major Genres stay visible in the Genre picker.
- Major Genre Runtime IDs are valid MusicSpec Genre influence IDs; compiler knowledge resolves them alongside subgenres.
- Browsing a Major starts with the pure Major itself, then subgenres.
- Expanded-list return controls are viewport/segment scoped and must not remain visible outside their active expanded segment.
- Explanation mode uses icon-only global chrome, but linked controls and live-prompt origins now expose real Knowledge definitions when enabled.
- Do not spend the next implementation slice on motion polish; prioritize production facet/pool functionality first.

## Specialized selected-state rail carry-forward

- Instruments and Exclude expose explicit current-state rails with per-item removal and pool-scoped clear-all actions.
- Instrument clear-all resets only the Instruments facet; Exclude clear-all resets only the separate Exclude output state.
- Imported/legacy Exclude entries without IDs can still be removed by their local list position, so malformed/older local state cannot trap the user in an undeletable chip.
- These rails mirror the ordinary-facet current-state pattern and remain fully visible rather than moving selected state into menus.

## Production Instruments carry-forward

- `@vgine/runtime-data` now parses/validates a lazy Instrument Library from `instruments.json` and `instrument-expressions.json`.
- Studio runtime caches that lazy load; Palette triggers it only when the Instruments control mounts.
- The existing Search v1 index supplies `instrument_expression` IDs; no additional search kernel exists.
- MusicSpec generic facet-selection helpers add/remove stable expression selections.
- Instrument selections use `kind: option`, `id: <instrument_expression id>`, `value: <preserved output_text>`, `origin: user`.
- Palette has production search, family filters, selected chips, favorites/usage ordering, explicit Show All, automatic scroll chunking and segment-scoped return-to-start behavior.
- Database V1 semantics/identity curation remain closed. Do not collapse or rewrite source expressions in application code.

## Production generic facet editor carry-forward

- Studio Runtime now lazy-loads/caches `editor.json` with manifest hash/count validation.
- Pulse/Palette/Finish ordinary facets use one generic FacetEditor instead of placeholder/demo state.
- Easy statements honor `mode_scope`; Advanced parameter options honor schema `value_type` cardinality and can add facet custom text.
- Runtime statement `source_frequency` is nullable and must stay nullable.
- Finish has a separate Runtime-backed Exclude picker writing only to `MusicSpec.exclude[]`.
- Favorite add/remove timings are 0.8 s / 1.0 s. Add progress uses theme semantic success green and an animated checkmark.
- Expanded-pool return controls are left-edge, viewport/segment scoped.

## Explain loader defect carry-forward

- The permanent `Loading explanation …` state was a React effect lifecycle bug, not missing Knowledge data.
- Do not reintroduce `state.status` into the KnowledgeTerm load-effect dependency list while the effect itself transitions that status to `loading`; doing so cancels the same request on its own rerender.
- Runtime lazy payload caches reset after rejection so a later open/load can retry instead of permanently reusing one rejected promise.

## Runtime Knowledge surfaces carry-forward

- `knowledge.json` is a lazy manifest-validated/cached Studio payload, not part of first-paint bootstrap.
- Explanation mode gates subtle Knowledge term affordances.
- Knowledge terms require explicit Runtime Knowledge IDs; never string-match labels into semantic identity in product code.
- Current first consumers: selected Genres, facet section labels, Advanced parameter headings and Instruments section heading.
- Locale resolution is UI-locale -> English fallback; renderer language remains independent.
- Favorite hold durations remain 0.8 s add / 1.0 s remove internally, but duration instructions are intentionally hidden from normal UI/hover copy.

## Finish review / Genre picker focus carry-forward

- The Finish footer action now reviews output instead of re-requesting the current Finish chapter.
- Desktop review moves focus to the Live Prompt and gives it a short causal focus ring; mobile review opens the existing Live Prompt surface.
- Review defaults to Style and uses Exclude only when Style is empty but Exclude exists.
- Opening a Genre role locates the picker and, on desktop/fine pointer, focuses/selects its search field. Touch/mobile deliberately avoids forced software-keyboard invocation.

## Facet rail scrollspy carry-forward

- The direct facet rail highlights the currently reached authoring region using `aria-current="location"` plus a restrained visual state.
- The scrollspy is derived entirely from explicit `data-facet` targets and chapter order; it does not persist navigation state or parse labels.
- Tracking is requestAnimationFrame-throttled and suspended while mobile Live Prompt hides the editor.

## Facet jump rail carry-forward

- Each chapter exposes direct buttons for its actual facets, with live active-item counts; Finish adds Exclude as the separate output-authoring target.
- Desktop facet navigation sticks below the chapter bar; mobile uses a wrapped touch-target rail in normal flow to avoid nested scrolling.
- Jumps reuse explicit `data-facet` IDs and the same causal locate highlight as Live Prompt source navigation.
- Counts are derived from MusicSpec/Exclude state and are not separately persisted.

## Persistent chapter navigation carry-forward

- The four chapter tabs stick below the global top bar so long editor/picker surfaces never strand navigation off-screen.
- Desktop supports `Alt+1` … `Alt+4` for DNA/Pulse/Palette/Finish. The keyboard route uses the normal chapter request path, including the one-time no-genre acknowledgement.
- Shortcuts are suppressed for text-entry targets and while project/manual-copy overlays are active.
- Prompt-source jumps use larger responsive scroll margins so sticky navigation does not obscure the located facet.

## Chapter navigation state carry-forward

- Chapter navigation reflects actual active MusicSpec/Exclude content rather than treating previously visited chapters as "done".
- Counts are derived, not persisted: Genre influences, ordinary selections/custom wording and Finish Exclude entries contribute.
- Chapters remain fully optional; a zero count is neutral and never treated as invalid/incomplete.

## Live Prompt source-navigation carry-forward

- In deterministic Style mode, each rendered section can navigate directly back to its owning authoring facet.
- Navigation is keyed by compiler section/facet IDs, never by parsing the rendered prompt label/value.
- Mobile source navigation closes the Live Prompt view before locating the facet.
- Exclude output maps directly to the separate Exclude surface in Finish.
- Manual Style overrides stay intentionally non-navigable because arbitrary output text is not reverse-classified.

## Clipboard/copy carry-forward

- Copy uses one active-output validity rule across the header, Live Prompt footer, mobile dock and `Ctrl / ⌘ + Enter`.
- Clipboard writes now degrade from the modern API to legacy copy and finally to a manual-copy dialog/sheet with the clean plaintext preselected.
- The final fallback is deliberate product UI, not an error state; it never injects explanation chrome into the copied text.
- Keyboard copy is disabled while project/manual-copy overlays are active.

## Desktop ordinary-facet density carry-forward

- Wide desktop Easy statement grids use three columns and Advanced parameters use a two-column scan layout; responsive breakpoints fall back before controls become cramped.
- Advanced parameter headers surface current value labels/counts and parameter-scoped clear actions.
- The facet-wide current-state rail remains the canonical overview; parameter summaries are a local scan aid derived from the same MusicSpec/Runtime IDs.
- Custom Advanced wording remains full-width and nothing is hidden behind dropdown menus.

## Genre picker focus behavior carry-forward

- Opening a Genre role on fine-pointer desktop locates the picker and focuses/selects search.
- The role trigger owns the picker relationship through `aria-expanded` / `aria-controls`; closing with the visible close control or Escape returns focus to that same role trigger.
- Selecting or clearing a role also restores focus after the card rerenders, preventing focus loss when picker content disappears.
- Touch/mobile still avoids forced search focus so the software keyboard is not summoned unexpectedly.

## Explain activation + search-shortcut carry-forward

- A selectable Knowledge label is still explained on desktop hover/focus, but click/Enter/Space now activates the underlying option. Explain may not consume the primary selection gesture.
- On touch/mobile, selectable labels keep normal selection semantics and a separate compact info affordance opens the pinned explanation sheet.
- Non-selectable Knowledge terms can still pin directly.
- The visible `/` affordance in Genre/Instruments/Exclude search is functional: it focuses the active search field unless the user is already typing/editing or holding a modifier.

## Ordinary-facet ergonomics carry-forward

- Ordinary FacetEditor cards now expose a compact current-state rail above the active Easy/Advanced controls.
- The rail shows selected statements/options/numeric values plus custom wording using Runtime-backed labels, and supports direct per-item removal or facet-wide clear.
- Easy/Advanced switching is still view-only; the rail is a view onto current MusicSpec state and does not mutate anything until the user removes/clears an item.
- Mobile uses wrapped 44 px current-state chips rather than a nested horizontal scroller.
- Explain remains available on mobile from the bottom dock even when the constrained top bar hides its desktop toggle.

## Project library v1 carry-forward

- The old fixed `active` project ID is migration-only. Studio keeps a separate active-project pointer in local user data and migrates an existing legacy project to a fresh ID.
- Creating a new project first persists the current project and then opens a new blank project. Existing work is no longer destructively reused as the sole active record.
- The top-bar project switcher opens a responsive library with inline rename, switch/open, duplicate, export, import and two-click delete.
- Duplicate preserves MusicSpec/manual Style/workspace state but receives a fresh ID and timestamps.
- Import validates `vgine-project-v1` and deliberately assigns a fresh local ID so importing a file cannot silently overwrite another project.
- Export writes one validated project document as a local `.vgine.json` file. No cloud path exists.
- Deleting the active project selects the newest remaining project or creates a blank project if the library becomes empty.
- Project summaries remain sorted by `updated_at`; autosave continuously refreshes the active summary.

## Project persistence v1 carry-forward

- `@vgine/project-storage` owns the versioned ProjectDocument contract and `ProjectStorage` interface.
- The web adapter is IndexedDB; do not move project state into `localStorage`.
- Current active project ID is `active`; the adapter already supports load/save/delete/list so a multi-project library can be layered on later.
- Persisted semantic state is MusicSpec. Manual Style override is explicit secondary output state.
- Current prompt-scoped workspace persistence includes active chapter and genre-skip acknowledgement.
- User preferences (Theme, locale, Favorites) stay outside ProjectDocument.
- Restore validates MusicSpec before accepting persisted state.
- Next persistence expansion should be project naming/library/import-export rather than replacing this adapter contract.

## Product Editor Foundation v1 carry-forward

- Do not interpret an empty DB `parameter`/`statement` population as intentional empty product UX. The tracked Editor Foundation is the minimum application catalog.
- Foundation v1 lives at `data/product/editor-foundation-v1.json`; do not duplicate its options in React components.
- Runtime exporter fingerprints/merges it into `editor.json` and validates complete facet coverage.
- Merge precedence: Foundation -> reviewed/approved DB records by stable ID.
- Current coverage: 49 parameters / 262 options / 79 Easy statements / 10 Exclude entries across all ordinary facets.
- Genre and Instruments remain specialized Runtime pickers and are not re-curated by this phase.
- DNA must render Genre, Era and Key/Mode together.
- Local developers must re-run Runtime export after pulling a Foundation change because `knowledge.sqlite` may be unchanged while the Runtime editor payload has changed.

## Easy/Advanced + local user data carry-forward

- Global editor depth sets all ordinary facets to Easy or Advanced; facet-level switches remain overrides.
- Do not clear MusicSpec merely because a user changes the visible mode. Clear the opposite authoring layer only when the new mode is actually mutated.
- First Advanced mutation removes Easy statement selections. Choosing an Easy statement replaces Advanced state for that facet.
- Advanced custom-text presets are user data, not Runtime/Knowledge data; they live in local IndexedDB and are scoped per facet.
- Pool Favorites, Theme, locale and editor-depth preferences now use the IndexedDB user-data adapter. `localStorage` is legacy-migration input only.
- No user preference/preset/project data is sent to a server.

## Product Knowledge / Explain mode carry-forward

- Product Knowledge Foundation v1 lives at `data/product/knowledge-foundation-v1.json`; coverage remains 400 stable entries.
- Product Editor Foundation carries explicit links into this Knowledge layer. Genre/Instrument explanation continues to use Database V1 semantic links. Never replace these links with rendered-label or prompt-string guessing.
- Explain is now an authoring-time affordance, not a Live Prompt chip list. Easy statements, Advanced options/recommended values, Genre results, Instrument-expression results and Exclude results expose linked Knowledge before selection.
- Desktop terms use a subtle dashed underline with delayed hover/focus; click pins. Touch taps pin the same concept in a mobile bottom sheet.
- The explanation surface is a singleton viewport portal. Parent overflow must not clip it, opening a second term closes the first, and the popover must not consume Studio layout space.
- The old explanation-chip rows beneath Live Prompt sections are removed. Copyable Style/Exclude output remains unchanged.
- Product ordinary facets use Product Knowledge links; Genre/Instrument explanation uses their existing explicit Database V1 links. If an item has no explicit Knowledge link, leave it plain.
- User custom text remains unexplained unless a future explicit semantic-assist contract links it.
- The generated/meta v1 prose for Product Knowledge options/statements/Exclude entries is not accepted as final dictionary copy. The complete 400-entry authoring request is `data/product/knowledge-foundation-v1-authoring-request.txt`.
- Returned authoring text uses strict `ID / EN / DE / ---` blocks and is validated/imported with `scripts/data/import_product_knowledge_authoring.py`. The importer preserves IDs/semantic links, bumps localized plain-definition revisions and rejects the known UI-meta templates.

## Immediate next owner-local sequence

No new dependency install is required.

1. Run the complete authoring request through the dedicated knowledge-writing/research thread and save the returned UTF-8 text locally, for example as `.local-data\current\product-knowledge-v1-authored.txt`.
2. Validate the returned batch without changing tracked data:

```powershell
Set-Location D:\prompt-engine
git pull

py scripts\data\import_product_knowledge_authoring.py `
  --input ".local-data\current\product-knowledge-v1-authored.txt"
```

3. If validation passes, import it:

```powershell
py scripts\data\import_product_knowledge_authoring.py `
  --input ".local-data\current\product-knowledge-v1-authored.txt" `
  --write
```

4. Rebuild Runtime Pack because Product Knowledge content participates in Runtime identity:

```powershell
py scripts\data\export_runtime_v1.py `
  --knowledge ".local-data\current\knowledge.sqlite" `
  --out-dir ".local-data\current\runtime-v1"

pnpm dev
```

If an older interrupted Runtime export blocks the rebuild:

```powershell
py scripts\data\export_runtime_v1.py `
  --knowledge ".local-data\current\knowledge.sqlite" `
  --out-dir ".local-data\current\runtime-v1" `
  --reset-incomplete
```

Reference Explain-mode smoke prompt from the owner:

```text
[Genre: Foundation: Boom Bap]
[Era: 2000s studio production]
[BPM: 110]
[Instruments: electric bass, acoustic drums, electric piano, organ, electronic drums, acoustic guitar, electric guitar, bass, piano, drums, strings, keyboards]
[Exciters: tambourine accents on selected backbeats, light shaker subdivision, occasional dry handclaps, sparse hand percussion, short noise sweeps at transitions]
[Texture: airy ambient layer, dry intimate texture, warm analog texture, clean polished surface, filtered grainy texture]
[Vocal: instrumental / no lead vocal, breathy airy lead vocal, lead vocal with stacked harmonies, gritty forward lead vocal, intimate close lead vocal]
[Dynamics: steady controlled energy]
[Space/Mix: wide upper layers, centered low end, narrow mono-era image, dry center, wide stereo image with controlled spacious depth]
[Production: clean polished studio production, warm tape-like saturation]
[Structure: short hook-led song form, gradual opening with a final peak]
```

Acceptance expectations:

- each linked term can be explained before selection from the picker/editor itself;
- desktop hover/focus and click-pinning work without clipped or overlapping popovers;
- touch opens the mobile explanation sheet without requiring hover;
- Product sections resolve only through explicit Product Knowledge links;
- Genre uses existing Genre Knowledge links;
- Instruments use existing canonical instrument/concept Knowledge links;
- free custom Advanced wording stays unexplained unless a future explicit semantic-assist contract links it;
- explanation UI never alters or enters copied Style/Exclude text;
- missing explanation is a semantic-link gap to investigate, not permission for label-string inference;
- the imported Product Knowledge definitions explain the musical meaning itself and contain no preset/control/rendering meta copy.

After this acceptance pass, resume project naming/library/duplicate/import/export on the existing `ProjectStorage` contract, then continue Studio ergonomics. Broad motion polish remains later.
