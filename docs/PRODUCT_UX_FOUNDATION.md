# Prompt V'gine — Product and UX Foundation

**Status:** accepted product foundation  
**Product name:** Graph1ks Prompt V'gine  
**Meaning:** Virtual Prompt Engine  
**Primary target:** Suno structured style-prompt authoring  
**Design goal:** expert-capable without requiring expert vocabulary

## 1. Product definition

Prompt V'gine is not a tag concatenator. It is a visual music-specification editor that compiles a structured musical intent into a Suno-ready prompt while teaching the user what the musical language means.

The internal product model must remain richer than the exported prompt. Suno is the current renderer target; the editor, knowledge layer, genre taxonomy, options, and user state must not be coupled to one prompt string format.

## 2. UX principles

1. **Do not hide creative content behind constraints.** Constraints/quality checks advise, explain relationships, and surface conflicts. They do not decide what the user is allowed to select.
2. **Genre influence is powerful but optional.** A project may use zero to three genre influences. If genre is omitted, the rest of the musical facets remain fully usable.
3. **Progressive disclosure, not feature removal.** Easy and Advanced modes operate on the same underlying MusicSpec. Easy uses curated statements/combinations; Advanced reveals atomic controls and custom text.
4. **Words in, words out.** Do not expose pseudo-precision such as percentage sliders when the compiled prompt can only express language. A control must map to a meaningful verbal state.
5. **No option-wall UI.** Large vocabularies use search-first animated pickers, categories, recent/favorite items, and browsing. Avoid huge native dropdowns.
6. **Mobile is a first-class interaction model.** Anything necessary must work by tap. Hover is enhancement, never a requirement. Long editing surfaces keep primary chapter navigation reachable; desktop may add discoverable keyboard accelerators without making them the only path.
7. **Teach in place.** Music terminology is explained where it appears, including inside generated prompt text.
8. **The output is inspectable.** The user must see exactly which structured prompt section a change affects. Long chapters also expose direct facet navigation so expert users can move between visible authoring regions without hiding those regions behind menus. Final-step actions must lead somewhere meaningful: completing Finish transitions attention to review/copyable output rather than performing a no-op.
9. **Readable before dense.** Avoid micro-fonts and gratuitous dashboard chrome. Dense expert functionality is allowed, but hierarchy and touch/readability win. Wide desktop layouts should spend horizontal space to reduce unnecessary vertical travel; density must be responsive rather than achieved by hiding controls.
10. **Motion communicates state.** Animation is used for reorder, replacement, navigation, picker transitions, and causality—not decorative perpetual motion.

## 3. Easy and Advanced modes

### Easy

Easy mode presents curated, musically coherent words and combination-statements. Examples:

- `laid-back swung pocket`
- `dry punchy drums with restrained fills`
- `warm centered bass with short notes`
- `dark spacious harmony with suspended color`

Easy mode should let a non-producer build a strong prompt without learning every parameter first. Every statement remains explainable through the knowledge layer.

### Advanced

Advanced mode exposes the same state at finer resolution:

- parameter/value controls;
- explicit role ownership;
- instrument role, register, articulation, envelope/behavior, and processing;
- groove subdivision, swing, syncopation, pocket, perceived tempo;
- bass/kick relationship;
- custom text per section;
- locks and deliberate overrides.

Advanced must not use native dropdowns for large or explanation-heavy option sets. Selecting a value opens an accessible picker/card sheet in which every option can carry its own plain-language explanation.

Switching modes must never destroy state. A value authored in Advanced can be summarized in Easy; an Easy statement can expand to its underlying concepts/options in Advanced when mappings exist.

## 4. Genre Influence model

A project has **zero, one, two, or three** genre influences:

1. **Foundation** — primary musical grammar when the user chooses genre guidance.
2. **Fusion** — secondary language integrated into the foundation.
3. **Accent** — optional color, texture, or production influence.

There are no user-facing percentage weights by default. The useful information is *what a genre influences*, not an invented `63%` value.

### Interaction

- Add/remove influences up to a maximum of three.
- Drag one influence onto another slot to swap positions live.
- Reordering immediately recompiles affected prompt sections.
- Foundation/Fusion/Accent are assignments, not fixed identities.
- Default routing may derive from slot position; explicitly locked Advanced routing travels with the influence and is visibly marked as an override.

### Genre picker

The genre picker must be a modal/sheet rather than a permanent sidebar.

Top level:

- search field;
- **all 24 Major Genres always visible** as browse/filter controls;
- recent/favorite choices;
- explicit compact / **Show all** result modes.

Browsing a Major Genre reveals its options with the **pure Major Genre itself as the first selectable result**, followed by its subgenres. A subgenre that belongs to multiple Major Genres is represented **once** in a result set and displays all applicable Major Genre tags. The taxonomy is many-to-many and the UI must not duplicate an entity just because it has multiple parents.

## 5. Large-option interaction pattern

Prompt V'gine will eventually contain thousands of genres, instruments, descriptors, techniques, rhythmic concepts, production concepts, vocal concepts, and reusable statements.

The default pattern is therefore:

- tap/click a field or `Change`;
- animated picker/sheet opens;
- search is immediately available;
- browse by semantic category;
- each result has a short explanation;
- recent and favorite items are quick-access views;
- selected values remain visible in the editor and can be removed directly from that visible state; specialized high-cardinality pools also expose a scoped clear-all action;
- no giant `<select>` menus.

On narrow/mobile screens this becomes a bottom sheet or full-height selection sheet. On desktop it may be an anchored dialog or centered modal depending on content volume.

## 6. Site-wide inline knowledge dictionary

The knowledge layer is a product feature, not a tooltip afterthought.

Any recognized musical term can be marked inline throughout the application:

- `grit`;
- `transient`;
- `attack`;
- `swing`;
- `Jazz`;
- `Dark Jazz`;
- `Rhodes electric piano`;
- `palm-muted`;
- `four-on-the-floor`;
- etc.

### Visual affordance

Use a subtle **knowledge underline/highlight**, not an `ⓘ` icon after every word. The marker must communicate “this term can be explained” without turning the interface into a field of icons.

### Interaction

Desktop:

- hover after a short delay for a compact explanation;
- keyboard focus provides the same preview;
- on a selectable control, click/Enter/Space must perform the control's primary action rather than stealing the gesture for Explain;
- non-selectable knowledge terms may still use click to pin/expand.

Touch/mobile:

- the primary label tap performs the selection/action;
- selectable explainable labels expose a compact adjacent explanation affordance because hover does not exist;
- tapping that explanation affordance pins the concept in the mobile bottom sheet;
- non-selectable knowledge terms may use direct tap for explanation.
- never require hover.

### Three explanation layers

1. **Global definition — What is this?**  
   Plain-language meaning suitable for a first-time Suno user.
2. **Context definition — What does it mean here?**  
   Meaning in Drums, Bass, Mix, Melody, a genre, an instrument, etc.
3. **Current-project interpretation — What is it doing in my prompt?**  
   Derived at runtime from the current MusicSpec and surrounding selections.

Example for `transient`:

- Plain: “The very short beginning of a sound—the first click/punch before the rest of the sound develops.”
- Drums context: “Sharper transients make the kick/snare feel more immediate and punchy; softer transients make them rounder.”
- Current project: “Here the sharper drum transients help the Boom Bap foundation stay defined against the sustained bass.”

A definition must not explain one unknown term using three more unexplained terms. If specialist terminology is unavoidable, those terms are dictionary-linked too.

### Guidance level

Settings expose:

- **Beginner** — mark/explain most meaningful musical terminology;
- **Standard** — focus on specialist terminology;
- **Expert** — mark only unusual/specialized terms;
- **Off** — no inline dictionary markers.

The same term should normally be marked once per compact text block to avoid visual noise.

## 7. Prompt output contract

The visible/copyable style prompt follows the source-style structured format:

```text
[Genre: ...]
[Era: ...]
[BPM: ...]
[Key/Mode: ...]
[Groove: ...]
[Melody: ...]
[Harmony: ...]
[Drums: ...]
[Bass: ...]
[Instruments: ...]
[Exciters: ...]
[Texture: ...]
[Vocal: ...]
[Dynamics: ...]
[Space/Mix: ...]
[Production: ...]
[Structure: ...]
```

Only non-empty sections are emitted. The renderer order is versioned and configurable, but this source-compatible layout is the v1 default.

### Editing causality

When the user edits a facet:

- the corresponding output section is visually highlighted;
- replacement briefly highlights the outgoing value/section state;
- insertion highlights the new content;
- multi-section changes may highlight more than one section (for example, a tempo/groove change);
- copy always returns clean plain text without UI markup.

Causality also works in reverse for deterministic output:

- each rendered Style section is an editable source link, not a dead preview line;
- activating a section navigates to the Studio chapter/facet that owns it and brings that authoring surface into view;
- on mobile, source navigation closes the Live Prompt surface and returns to the editor automatically;
- Exclude output links back to the separate Exclude authoring surface;
- manual Style override text is deliberately not reverse-parsed into MusicSpec and therefore does not expose guessed source links.

### Exclude is separate

Exclude is **not** a bracketed prompt section. It has its own copy block and compiles to a comma-separated list:

```text
bright glossy pop synths, competing lead instruments, cavernous drum reverb
```

No `[Exclude: ...]` wrapper is emitted.

## 8. Constraints / quality checks

The internal engine can detect relationships and conflicts, but the UI should frame them as **Quality Checks**, **Relations**, or context-specific guidance rather than gates.

Examples:

- multiple primary melodic owners;
- 808 + sustained sub + Reese competing for the same low-end role;
- dry close drums combined with a huge washed-out drum reverb instruction;
- bass and kick lacking a clear rhythmic/space relationship;
- explicit user choices that intentionally contradict a genre default.

A warning never silently deletes content. Users can keep deliberate contradictions. The system explains the consequence and may offer a one-click resolution.

## 9. Instrument and descriptor separation

An instrument is not a bundle of adjectives. Store and edit separately:

- instrument identity/family;
- role (melody, harmony, groove, bass, texture, exciter, transition);
- register;
- articulation;
- attack;
- sustain/envelope behavior;
- movement/rhythm;
- processing;
- spatial placement.

Example: `Rhodes electric piano` is an instrument. `warm`, `muted`, `mid-register`, `short attack`, and `saturated` are independent concepts/options that can describe it.

## 10. Visual foundation

Two accepted palette directions for the prototype design system:

### Paradise

- `#000004`
- `#1D402D`
- `#FFF9EC`
- `#A85527`
- `#E4A030`

### Ash

- `#6D6C73`
- `#1D1E26`
- `#3E4034`
- `#262623`
- `#A69286`

Typography direction:

- highly readable sans-serif for UI/content;
- a bold editorial/magazine display face for identity and major headings;
- avoid micro typography wherever possible;
- typography dependencies must pass the project license/cost review before final adoption.

## 11. Motion and accessibility

Motion should make cause/effect legible:

- genre drag/swap springs;
- picker/sheet entrance/exit;
- section replacement/diff flash;
- layout morph between Easy and Advanced;
- state transitions for locks/suggestions;
- no continuous decorative motion required to understand the UI.

Requirements:

- respect `prefers-reduced-motion`;
- full keyboard access;
- visible focus states;
- minimum practical touch targets;
- no essential hover-only content;
- avoid nested-scroll traps.

## 12. Clipboard behavior

Copy is a primary workflow. Use progressive fallback:

1. Clipboard API when allowed;
2. compatible legacy copy fallback where available;
3. final fallback opens/selects clean plaintext so the user can copy manually.

The UI must never end at an unexplained `clipboard unavailable` dead-end.


## 15. Large-pool favorites and explicit expansion

Large selectable pools such as Genres and Instruments use the same preference contract:

- long-press with mouse or touch for approximately 0.8 seconds to favorite;
- long-press an existing favorite for approximately 1.0 second to remove it;
- hold progress is visible and does not accidentally activate the underlying option; adding uses theme-semantic success green and draws a completion checkmark, removing uses explicit red square/X feedback;
- favorites are shown first and ordered by actual use count, then recency;
- favorites are user preference state, not MusicSpec/project semantics;
- compact result views use an explicit **Show all** action rather than repeated fixed-size paging;
- expanded long lists provide an obvious return-to-top control and collapse back to compact after selection;
- the return-to-top control appears only after the user has scrolled down inside that expanded segment, disappears again at the segment start, above the segment, and after the viewport has passed the segment;
- floating return-to-start controls prefer the free **left** viewport edge so they do not collide with the persistent Live Prompt/preview side.

## 16. Genre-free continuation

Leaving Sound DNA without a genre is valid. The first forward action with no genre changes into a concise one-time confirmation. The second action continues. That acknowledgement belongs to the current prompt session and resets with a new prompt.

## 17. Manual prompt override and reset

The compiled Style prompt can be unlocked for manual editing. Manual edits are an explicit output override layered above the deterministic compiler result:

- MusicSpec remains unchanged and remains the semantic source truth;
- the original current compiler output is always recoverable with one reset action;
- manual output still obeys the renderer character budget;
- every Studio chapter exposes a page reset that clears only the semantic state owned by that chapter;
- starting a new prompt resets MusicSpec, chapter warning acknowledgements and manual output overrides.

## 18. Localization contract

The application UI is multilingual; renderer/prompt language is a separate contract.

- v1 UI locales: German (`de`) and English (`en`);
- locale defaults from the browser when no explicit preference exists;
- the user's locale preference is persisted locally;
- UI strings live in typed message catalogs rather than inline component literals;
- adding another UI language extends the locale registry/catalog without changing MusicSpec or renderer logic;
- **Suno prompt output remains English** unless a future renderer profile explicitly defines another output language;
- genre/instrument canonical labels are domain data and are not silently translated unless a future knowledge layer supplies explicit localized display labels.

Localization includes accessibility labels, warnings, picker guidance and user-facing diagnostics, not just headings.

## 19. Runtime-backed facet editing

Pulse, Palette and Finish use one shared Runtime-backed facet editor rather than bespoke local demo state.

- `editor.json` is lazy-loaded and validated against the Runtime Pack manifest;
- Easy mode renders reviewed/approved statements whose `mode_scope` permits Easy;
- Advanced mode renders reviewed/approved parameter options grouped by their parameter;
- parameter `value_type` comes from the canonical schema: `enum`, `multi`, `number`, `text`, `boolean`, `relation`;
- `multi` permits multiple active options; option-bearing non-`multi` parameters are exclusive within that parameter;
- Advanced custom wording is stored in the facet's MusicSpec `custom_text` and remains English renderer material;
- empty Runtime sections stay honestly empty rather than receiving invented demo values.

Instruments remain a specialized high-cardinality facet because source expressions carry identity/family/semantic links and require the dedicated 6,035-expression picker.

## 20. Finish / Exclude editing

Finish exposes the Runtime `exclude` catalog as a separate selectable pool. Selected entries write only to `MusicSpec.exclude[]` and compile to the separate comma-delimited Exclude output. They must never produce a bracketed Style section.

## 21. Runtime knowledge surfaces

Explanation mode exposes knowledge only where Runtime data provides an explicit Knowledge entry link.

- knowledge data loads lazily on first explanation request;
- linked terms receive a subtle knowledge underline rather than repeated info icons;
- desktop explanations open adjacent to the term; mobile uses a bottom-safe compact surface;
- the surface may show a localized global definition, matching context definition, difficulty, and related terms;
- UI locale resolution may fall back to English when a localized reviewed definition does not exist;
- unlinked labels remain ordinary text; the UI does not invent definitions from label wording.

Favorite gesture timings are implementation behavior and are not displayed as instructional copy in pool result metadata or hover titles.

## 22. Local project persistence

Studio automatically restores and locally saves the active project.

- web/PWA persistence uses IndexedDB behind `ProjectStorage`;
- autosave is local/offline and does not require an account or backend;
- MusicSpec remains the persisted semantic source truth;
- a manual final-Style override is persisted explicitly as secondary output state;
- the last active Studio chapter and per-prompt genre-skip acknowledgement may be restored;
- Theme, language and Favorites are user preferences and do not travel inside the project document;
- corrupted/unsupported persisted documents must not be silently reinterpreted or overwrite domain state;
- the top bar communicates restoring/saving/saved/error/unavailable state without blocking editing.

## 23. Complete selectable facet baseline

Every ordinary MusicSpec facet exposed in the four Studio chapters must have meaningful selectable product controls even when no Genre is selected and even when the user never opens Explanation mode.

- Sound DNA renders Genre plus Era and Key/Mode; the Genre special case must not hide the other DNA facets.
- Pulse renders BPM, Groove, Drums, Bass and Dynamics.
- Palette renders Melody, Harmony, Instruments, Exciters, Texture and Vocal.
- Finish renders Space/Mix, Production and Structure plus the separate Exclude pool.
- Easy offers curated complete musical statements.
- Advanced offers finer parameter/value dimensions.
- controls start semantically unset unless the user explicitly selects a value;
- recommended values are suggestions/affordances, never implicit MusicSpec state;
- BPM supports direct numeric entry and a continuous 40–220 control in addition to recommended values.

Explanation mode enriches controls; it is never a substitute for the controls themselves.

## 24. Easy/Advanced depth and personal Advanced presets

The Studio exposes one global Easy/Advanced depth control plus the existing per-facet Easy/Advanced switches.

- global Easy or Advanced updates every ordinary facet view at once;
- per-facet switches remain available as local overrides;
- switching view mode alone never mutates MusicSpec;
- the first Advanced mutation in a facet removes Easy statement state from that facet;
- selecting an Easy statement replaces Advanced selections/custom text in that facet;
- Easy statements are exclusive within a facet, preventing contradictory mixed states such as two tonal centers;
- user-authored Advanced custom wording can be saved by the same hold-favorite interaction used by large pools;
- saved Advanced presets are scoped per facet, usage-ranked, locally reusable and removable by hold;
- Delete all uses a second explicit confirmation click.

All user-generated/personal data remains local to the device. Projects and user preferences use IndexedDB-backed adapters; no server persistence is required.

## 25. Explain mode follows explicit semantic origins at selection time

Explain mode must teach the meaning of a musical choice where the user actually encounters and selects it. It does not decorate the Live Prompt with secondary explanation rows.

- Product Editor parameters, Advanced values, Easy statements and Exclude choices link to explicit Product Knowledge IDs.
- linked selectable terms expose the knowledge affordance before selection;
- desktop uses delayed hover/focus for a compact explanation; clicking a selectable term performs its actual selection/action;
- non-selectable knowledge terms may still click-to-pin;
- touch/mobile keeps the selectable label tap for the primary action and exposes a separate compact explanation affordance that pins the same concept in a bottom-safe surface;
- only one explanation surface is active at a time and it renders outside picker/card overflow;
- numeric selections such as BPM explain through their governing parameter concept;
- Genre uses existing Genre Knowledge links;
- Instruments use canonical instrument/concept links from the existing Database V1 expression model;
- arbitrary user custom text is not guessed, classified or explained without an explicit semantic link;
- explanation UI never alters or enters copied Style/Exclude text.

Explanation localization follows the active UI locale with English fallback and never changes the English prompt renderer.
