# Engineering Decisions

Use this file for durable decisions that would be expensive to rediscover or reverse.

---

## ADR-001 — Generated data is local-only

**Status:** accepted  
**Date:** 2026-09-21

### Context

The prompt Vault and genre taxonomy are large build inputs and the product will create derived corpus/knowledge/runtime databases. The owner explicitly does not want the database stored or run from GitHub.

### Decision

GitHub stores only schemas, build/mining code, small synthetic fixtures, validation, and documentation. Raw factories, generated SQLite databases, reports, indexes, and compiled runtime data remain local and are ignored by Git.

### Why

Keeps generated data out of source control, avoids repository bloat, preserves data-policy flexibility, and makes source→database transformation reproducible rather than treating a binary DB as source.

### Consequences

A local build step is required before corpus/knowledge work. CI can use synthetic fixtures without the real database.

---

## ADR-002 — Split evidence corpus from curated knowledge

**Status:** accepted  
**Date:** 2026-09-21

### Context

The 10k source prompts are valuable evidence but most rich section sentences are unique and unsuitable as direct runtime options.

### Decision

Use two local databases:

- `corpus.sqlite` for lossless source evidence, parsing, search, word/phrase usage, negative items, and taxonomy crosswalk research;
- `knowledge.sqlite` for canonical genres, aliases, dictionary entries, definitions, parameters/options, Easy statements, traits, renderer metadata, and provenance.

Runtime bundles are compiled from approved knowledge rather than shipping the evidence corpus.

### Why

Separates “what the source said” from “what the product knows/teaches.” Prevents frequency or one-off wording from becoming accidental product truth.

### Consequences

Curation is explicit. Rebuilds can replace corpus evidence without rewriting stable approved knowledge identities.

---

## ADR-003 — MusicSpec is source of truth; Suno text is rendered output

**Status:** accepted  
**Date:** 2026-09-21

### Decision

Easy mode, Advanced mode, quality checks, genre routing, dictionary context, and prompt rendering operate on a shared semantic MusicSpec. The generated Suno string is a renderer output, not application state.

### Consequences

Future output formats/model versions can use new renderer profiles without discarding the semantic editor or knowledge data.

---

## ADR-004 — Easy and Advanced are views of the same state

**Status:** accepted  
**Date:** 2026-09-21

### Decision

Easy mode uses curated words/combination statements. Advanced exposes the atomic parameters/options plus custom text and explicit routing. Mode switching does not create a second prompt or erase state.

### Consequences

Statements should link to concepts/options where possible so Easy selections can be expanded/explained in Advanced.

---

## ADR-005 — Inline knowledge dictionary is a core product subsystem

**Status:** accepted  
**Date:** 2026-09-21

### Decision

Genres, subgenres, instruments, descriptors, production terms, rhythm/harmony/mix vocabulary, and generated prompt terms can be highlighted inline and explained in plain language. Definitions have global and context-specific layers; current-project interpretation is derived from MusicSpec.

### Interaction consequence

Desktop hover/focus may preview; click can pin/expand. Mobile uses tap/popover/bottom-sheet. Hover is never required. Knowledge markers use a subtle inline affordance rather than an `ⓘ` icon after every term.

---

## ADR-006 — Genre influence is 0–3 ordered roles, not percentages

**Status:** accepted  
**Date:** 2026-09-21

### Decision

A project can have no genre influence at all, or Foundation, Fusion, and Accent genre influences. Genre-free MusicSpec is valid. When genre influences are used, roles remain semantic rather than numeric. The product does not expose default numeric influence percentages because the prompt target expresses language rather than meaningful numeric mixing weights.

The taxonomy is many-to-many: a subgenre is one entity even when tagged with multiple Major Genres.

---

## ADR-007 — Structured source-style prompt + separate Exclude

**Status:** accepted  
**Date:** 2026-09-21

### Decision

The v1 style renderer emits bracketed source-style lines in canonical order, for example:

```text
[Genre: ...]
[Era: ...]
[BPM: ...]
[Key/Mode: ...]
[Groove: ...]
```

Only non-empty sections are emitted. Exclude is a separate copy target consisting of a comma-separated list with no brackets and no `[Exclude: ...]` line.

### Consequences

Editing a facet can map directly to visible output sections and diff-highlight exactly what changed.

---

## ADR-008 — Large/explainable option sets use pickers, not native dropdowns

**Status:** accepted  
**Date:** 2026-09-21

### Decision

Genres, instruments, descriptors, Advanced values, and other explanation-heavy choices use search/browse pickers or sheets. Each option can expose its own definition. Mobile uses tap-first sheets; desktop may use anchored/centered dialogs.

### Why

The product will contain thousands of options and must explain them. Native dropdowns scale poorly for search, rich descriptions, touch, and semantic grouping.

---

## ADR-009 — Constraints advise; they do not censor the option space

**Status:** accepted  
**Date:** 2026-09-21

### Decision

Constraint logic is surfaced primarily as quality checks/relations. It can warn about competing melodic owners, low-end collisions, or contradictory mix instructions, but it does not silently remove creative content or forbid genre combinations.

Deliberate overrides remain possible and visible.


## ADR-010 — Durable curation is separate from compiled knowledge

**Status:** accepted  
**Date:** 2026-09-21

### Context

Factory evidence is replaceable and will change over time. Definitions, aliases, instrument identities, parameter design, Easy statements, and explicit genre crosswalk decisions are authored knowledge and must survive every source rebuild.

### Decision

Use three local database lifecycles:

- `corpus.sqlite` — disposable evidence/mining output rebuilt from Factory files;
- `curation.sqlite` — durable local authoring state, never deleted by normal rebuilds;
- `knowledge.sqlite` — disposable compiled knowledge produced from current taxonomy/bootstrap plus the durable curation overlay.

Ordinary reruns resume safely. Generated corpus/knowledge may be replaced only through validated promotion; durable curation must not be deleted. The retired `--force` workflow is not part of v2.

### Why

A single rebuildable DB would eventually make a Factory refresh destructive to months of reviewed knowledge. A single durable monolith would make evidence refresh and runtime compilation harder to audit.

### Consequences

Curation requires local backups and additive migrations. The repository ships an integrity-checked backup tool. Generated knowledge can always be reconstructed.

---

## ADR-011 — Factory updates are reviewed by snapshot diff before promotion

**Status:** accepted  
**Date:** 2026-09-21

### Decision

A new Factory export is first built into a separate local directory. The new `corpus.sqlite` is compared to the current corpus for track/document, taxonomy, Major Genre mapping, and section-label changes.

Only after validation/diff review is the snapshot promoted and combined with the durable curation layer.

### Why

Source schemas and vocabulary can evolve even when top-level schema identifiers remain stable. A reproducible diff makes changes visible before they silently affect product knowledge/mining.

### Consequences

`scripts/data/diff_local_data.py` is part of the normal update workflow. Generated diff reports stay local.


---

## ADR-012 — Public source is noncommercial; Graph1ks retains commercial rights

**Status:** accepted  
**Date:** 2026-09-21

### Context

The repository is public so users can inspect, learn from, modify, and privately/noncommercially use the code. The owner does not want third parties monetizing Prompt V'gine or derivatives, including through donations/tips.

### Decision

Graph1ks Material is source-available under the repository `LICENSE`, not OSI Open Source.

Third-party commercial/monetized use is prohibited. Monetization includes sales, paid access/features, subscriptions, donations/tips connected to the project or derivative, advertising, sponsorships, affiliates, paid support/hosting/SaaS, and bundling with paid products/services.

Commercial rights in Graph1ks Material are reserved to Graph1ks.

The complete operative project license/policy texts are stored in this repository rather than depending on a linked external license page.

Third-party material remains under its own terms.

### Consequences

- Public GitHub visibility/forkability does not grant commercial rights.
- Dependency/data/asset licensing still requires separate review for Graph1ks' own commercial distribution.
- No CLA is added while outside contributions are not normally accepted.
- The custom source-available terms should receive qualified legal review before a high-stakes commercial release if jurisdiction-specific enforceability matters.

---

## ADR-013 — Long-running local data jobs are resumable build systems

**Status:** accepted  
**Date:** 2026-09-21

### Context

Prompt V'gine will perform owner-local corpus ingestion, mining, enrichment, and materialization. As the knowledge base grows, disposable one-shot scripts create unacceptable restart/data-loss risk and poor operational visibility.

### Decision

Adopt the RhymeLab-style long-running-job standard for all non-trivial local data workflows:

- read-only plan/preflight;
- deterministic named stages;
- bounded transactional batches;
- persisted machine-readable checkpoints;
- ordinary-rerun resume;
- safe Ctrl+C/SIGTERM behavior;
- visible progress/percentage/throughput/batch duration/ETA;
- status inspection;
- source/build fingerprint binding and stale-checkpoint rejection;
- incomplete work artifacts separate from promoted data;
- integrity/invariant checks before promotion;
- atomic/rollback-aware promotion;
- last known-good promoted artifacts retained;
- narrow reset semantics that never delete sources, durable curation, or promoted data implicitly;
- synthetic CI for pause/resume, stale checkpoints, safe reset, v1 adoption, and promotion retention.

### Implementation

The v2 local builder uses ignored `.build-v2/state.sqlite` plus staged SQLite work artifacts. Existing valid v1 promoted corpus data can be adopted by source fingerprint, so the owner is not forced to destroy/rebuild the already-created local corpus merely to upgrade build tooling.


---

## ADR-014 — Instrument identities are canonical entities; descriptors stay composable

**Status:** accepted for canonical identity; product-option consequence superseded by ADR-018  
**Date:** 2026-09-21

### Context

The source Instruments section contains thousands of unique comma-separated segments. Many are not unique instruments: they combine identity with properties or roles, for example clean/distorted/muted guitar, soft/restrained strings, programmed/electronic drums, lead/rhythm parts, and warm/dark synth layers.

Promoting every source segment as an instrument would create a noisy, non-composable option catalog and would make Easy/Advanced state difficult to reconcile.

### Decision

Curate a stable canonical instrument/entity layer and model reusable modifiers separately.

Instrument identity belongs in `instrument_patch` / `instrument_alias_patch`. Reusable concepts such as source type, tone, role, articulation, performance method, envelope/shape, dynamics, processing, and space belong in knowledge/parameter concepts rather than being baked into every instrument identity.

Broad groups such as Strings, Brass Section, Woodwind Section, Keyboards, Drums, and Percussion may exist as explicit selectable identities when the source itself uses them meaningfully.

### Consequences

- Canonical instrument identity remains compact and composable.
- "clean electric guitar" can decompose into Electric Guitar + Clean without creating a second canonical Electric Guitar identity.
- **ADR-018 supersedes the earlier implication that the full source phrase is not a direct product option.** The complete source expression remains a first-class selectable/renderable row.
- The runtime can explain/highlight both the full expression and its instrument/modifier semantics.
- Search aliases and expression links can recognize source wording without multiplying canonical identities.

---

## ADR-015 — Reviewed knowledge bundles are hash/fingerprint-bound and rollback-safe

**Status:** accepted  
**Date:** 2026-09-21

### Context

AI/human curation happens from local report files. Applying a decision file to changed source evidence or changed durable curation could silently write stale decisions.

### Decision

Knowledge curation uses explicit decision bundles bound to:

- the mining `review_id`;
- Vault and Genre Map source SHA-256 fingerprints;
- exact instrument and lexicon report SHA-256 values;
- a semantic curation fingerprint for newly generated reports.

Applying a bundle automatically backs up `curation.sqlite`, validates identities/aliases, writes all durable changes in one SQLite transaction, recompiles `knowledge.sqlite`, validates the result, and restores/recompiles recovery state if the operation fails.

The first legacy mining report generated before semantic curation fingerprints is accepted only through exact report hashes + source fingerprints; refreshed reports use the stronger fingerprint contract.

### Consequences

- File-based AI handoff remains practical without weakening local data safety.
- Ordinary curation does not require manual SQL or copy/paste queues.
- Reviewed decisions fail closed when their evidence snapshot becomes stale.


---

## ADR-016 — Instruments mining is semantic-residual driven, not raw-string driven

**Status:** accepted  
**Date:** 2026-09-21

### Context

The Instruments corpus contains thousands of unique phrases, but most are compositions of a smaller semantic vocabulary: instrument identity, source type, role, articulation, processing, timbre, density, register, arrangement behavior, and style color.

Exact-string review therefore scales badly. A phrase such as `clean rhythm electric guitar` should not require a new entity when `Electric Guitar`, `Clean`, and `Rhythm` already exist.

Some valid Instruments-section layers are not instruments at all: pads, effects, sweeps, noise, stabs, texture layers, and similar production elements.

### Decision

Mining resolves every Instruments source segment against compiled knowledge using longest-match semantic decomposition.

The report distinguishes:

- `fully_semantic`: every semantic token is explained by curated instruments/concepts;
- `fully_identity_decomposed`: the segment is fully semantic and includes at least one canonical instrument identity;
- unresolved residuals: semantic tokens for which curated knowledge is still missing.

The primary **semantic curation review queue** contains only unresolved semantic residuals. Fully semantic segments are removed from that review queue even when the original compound source string was never curated verbatim.

This queue optimization does not control product availability. ADR-018 requires every source-backed Instruments expression to remain materialized and selectable regardless of decomposition state.

Semantic-only layers are valid and do not require a canonical instrument identity merely to satisfy an identity metric.

### Consequences

- Curation scales with semantic vocabulary growth rather than raw phrase count.
- One concept can resolve hundreds of source variants.
- Canonical instrument catalogs stay compact while source wording remains recognizable.
- Advanced Instruments controls can reuse the same concepts through parameter/options.
- Future Factory growth is measured by new residual semantics, not by new string combinations.

---

## ADR-017 — Instrument ontology decisions may be scoped and compositional

**Status:** accepted  
**Date:** 2026-09-21

### Context

Large coherent Instruments curation batches need to add more than new instrument identities. They may also add aliases to existing entities, reusable concepts, intrinsic traits, and Advanced parameter dimensions/options. Requiring an unrelated lexicon report in every decision bundle creates artificial coupling.

### Decision

Knowledge decision bundle v2 supports report-scoped review hashes and can transactionally carry:

- instrument families;
- new canonical instruments;
- aliases for existing or new instruments;
- reusable knowledge concepts;
- instrument-trait relations;
- parameters;
- parameter options.

Durable `instrument_trait_patch` state is additive and compiles into the existing `knowledge.instrument_trait` table.

Before applying a bundle, the operator flow validates the reviewed report/source/curation fingerprints and creates a verified curation backup. Additive curation-schema migration occurs only after that backup. Compile/validation failure restores durable curation and attempts recovery compilation.

### Consequences

A single reviewed Instruments batch can materially expand the ontology and its editor controls without manual SQL or chains of tiny apply steps, while retaining the existing local-data safety contract.


---

## ADR-018 — Every source Instruments expression is a first-class selectable database entity

**Status:** accepted  
**Date:** 2026-09-21

### Context

The source Instruments section does not only name instrument identities. It also contains musically meaningful complete expressions describing how an instrument or sound layer is played, voiced, processed, arranged, or positioned, for example:

- `clean electric guitar`;
- `distorted rhythm guitar`;
- `muted trumpet`;
- `restrained strings`;
- `programmed drums`;
- `warm pad`;
- `noise sweeps`.

Treating those strings only as mining evidence would throw away useful user-facing choices. Treating every string as a new **canonical instrument identity** would also be wrong because the phrases often combine one stable instrument identity with reusable musical semantics.

### Decision

Use two simultaneous Instruments layers in compiled knowledge.

#### 1. `instrument_expression`

Every comma/semicolon-delimited source Instruments segment is materialized as a first-class selectable expression.

Each expression preserves:

- exact source-facing label/output wording;
- normalized lookup form;
- source occurrence and track counts;
- selectable status;
- provenance;
- semantic-decomposition state;
- semantic coverage;
- residual terms.

All source-backed expressions are product options regardless of whether their semantics are fully understood.

#### 2. Canonical identity + concepts

The same expression may additionally link to:

- canonical instrument identities through `instrument_expression_instrument`;
- reusable semantic concepts through `instrument_expression_concept`;
- one base instrument when exactly one identity resolves.

Example:

`clean rhythm electric guitar`

remains a selectable/renderable expression while also linking to Electric Guitar + Clean + Rhythm.

Semantic decomposition is additive metadata. It must never delete, hide, replace, or normalize away the source expression.

### Validation contract

Knowledge compilation fails acceptance when:

- the count of materialized factory expressions differs from the corpus source-expression count;
- any source expression is non-selectable;
- source output wording is not preserved.

The current Factory snapshot contains 6,035 unique source Instruments expressions, so the real compiled database is expected to contain all 6,035 after owner-local finalization.

### Consequences

- Users retain the full source vocabulary, including meaningful playing/processing variants.
- Canonical identities stay stable for grouping/search while expressions stay rich and specific.
- Semantic curation can scale through reusable concepts without shrinking the selectable option space.
- Residual-only mining reduces **review work**, not the database catalog.
- Future UI/runtime work can search/browse full expressions while still exposing structured instrument identity and semantic metadata.

---

## ADR-019 — Database V1 closes at full semantic coverage, not 100% identity coverage

**Status:** accepted  
**Date:** 2026-09-21

### Context

The current Factory contains 6,035 first-class Instruments expressions. Semantic completion reached 6,035 / 6,035 with zero residuals, while 4,472 expressions are fully identity-decomposed. Some valid sound layers are semantic-only and do not represent a physical/canonical instrument identity.

### Decision

Declare Database V1 complete when the source inventory is losslessly materialized/selectable, genre crosswalk is complete, semantic residuals are zero, build/curation/validation invariants pass, and the renderer/database contracts are fixed.

Do **not** require 100% canonical identity coverage. Semantic-only expressions are valid product data and must not be forced into fabricated identities.

### Consequences

- Database V1 is an accepted dependency for runtime/compiler/UI work.
- Future Vocal/statements/parameters/definitions/relations enrichment is additive Post-V1 work.
- A future database milestone is justified by schema/invariant changes or new source requirements, not ordinary enrichment.
- `docs/DATABASE_V1.md` is the canonical table/role/invariant overview.

---

## ADR-020 — Suno structured-v1 uses a hard 1,000-character semantic budget

**Status:** accepted  
**Date:** 2026-09-21

### Context

All 10,043 Factory `structured_prompt` values are <=1,000 characters; the observed maximum is exactly 1,000. The source distribution and per-section P90 lengths indicate intentional budgeting rather than mid-string truncation.

### Decision

`suno-structured-v1` has `max_characters=1000`. The renderer must budget/compact semantics before final serialization, preserve complete bracketed sections, keep Exclude separate, and never implement overflow as blind final-string slicing.

Explicit/locked user intent must not be silently discarded only to satisfy the limit; impossible protected-content combinations require a diagnostic/user choice.

### Consequences

- Factory preflight/validation rejects source prompts above 1,000 characters.
- Renderer configuration carries the hard global limit and source-derived soft per-section targets.
- Runtime/compiler/UI work must expose/manage the same budget contract.


---

## ADR-021 — Production application stack is TypeScript/React/Vite/pnpm with Tauri 2 packaging

**Status:** accepted  
**Date:** 2026-09-21

### Decision

Application/runtime/compiler code uses strict TypeScript. The UI uses React and Vite inside a pnpm workspace. Tauri 2 is the accepted desktop shell direction after the web foundation is stable. The core product requires no backend, hosted service, or runtime AI dependency.

Dependency versions are pinned when installed and still require the normal cost/license review.

### Consequences

The web application remains the primary shared implementation. Desktop packaging wraps the same product architecture rather than creating a second app stack.

---

## ADR-022 — Runtime Pack v1 is the application data boundary

**Status:** accepted  
**Date:** 2026-09-21

### Decision

The normal application does not read `corpus.sqlite` and does not require SQLite-WASM to mirror `knowledge.sqlite`. Owner-local tooling compiles `knowledge.sqlite` into deterministic versioned Runtime Pack artifacts documented in `docs/RUNTIME_DATA_CONTRACT_V1.md`.

### Consequences

Web, Tauri and self-hosted deployments can consume the same semantic payload contract. Runtime payload shape may evolve independently of the authoring/evidence SQLite schemas.

---

## ADR-023 — Compiler is a pure TypeScript package

**Status:** accepted  
**Date:** 2026-09-21

### Decision

MusicSpec -> renderer compilation lives in a pure TypeScript package with no React, DOM, browser-storage or Tauri dependency.

The compiler returns structured sections, budget state, diagnostics and compaction decisions in addition to final plaintext outputs.

### Consequences

Compiler behavior is deterministic/testable in isolation and reusable across web, native shell and future renderer targets.

---

## ADR-024 — Studio UI uses adaptive four-chapter composition and one shared picker pattern

**Status:** accepted  
**Date:** 2026-09-21

### Decision

The 17 renderer facets are organized into four high-level chapters: DNA, Pulse, Palette and Finish. Desktop uses a keyboard/mouse-efficient studio composition with persistent navigation/live output where space allows. Mobile uses focused work surfaces and sheets/docks.

Large/explainable vocabularies use one composable search/browse picker pattern rather than per-feature dropdown implementations.

### Consequences

Responsive behavior changes composition, not capability. Genre, instrument-expression, knowledge and other large selectors share interaction infrastructure.

---

## ADR-025 — Project persistence uses a storage adapter; IndexedDB is the first web target

**Status:** accepted  
**Date:** 2026-09-21

### Decision

Persisted musical state remains versioned MusicSpec plus project metadata behind a `ProjectStorage` adapter. Web/PWA initially targets IndexedDB. A later Tauri-native implementation may use application data/filesystem storage behind the same interface.

Web user preferences are stored through the separate IndexedDB-backed user-data adapter. `localStorage` is legacy-migration input only.

### Consequences

Project persistence is portable and does not leak browser implementation details into domain state.

---

## ADR-026 — V'gine owns a modular design system with semantic tokens

**Status:** accepted  
**Date:** 2026-09-21

### Decision

Reusable UI is organized in a dedicated V'gine design-system layer: tokens -> primitives -> controls/overlays -> patterns -> studio components.

Feature modules may compose these layers but must not duplicate generic buttons, chips, sheets, search fields, pickers, typography, spacing, radii, shadows or theme logic.

Paradise and Ash implement the same semantic token contract.

### Consequences

Global visual/ergonomic changes can be made once without design drift across feature modules.

---

## ADR-027 — Radix may provide selected behavior primitives; shadcn is reference material, not the design foundation

**Status:** accepted  
**Date:** 2026-09-21

### Decision

Radix is the preferred candidate for selected complex accessibility/focus/keyboard primitives, wrapped behind V'gine components and styled entirely by V'gine.

shadcn/ui is not the base component system and is not a required dependency. It may be consulted or selectively adapted only when useful; no Tailwind requirement or generic shadcn aesthetic is introduced merely to consume it.

All external code/dependencies still pass cost/license review before installation/adoption.

### Consequences

The project can reuse difficult accessibility behavior without surrendering its visual system or architecture to a generic UI kit.

---

## ADR-028 — Motion is centralized as a product motion system

**Status:** accepted  
**Date:** 2026-09-21

### Decision

Motion for React is the selected candidate for layout/presence/gesture/drag/spring animation. Simple micro-transitions remain CSS.

A shared motion package owns durations, easings, springs and named recipes such as press/select/insert/remove/swap/expand/sheet/promptDiff/layoutMorph. Every recipe has a reduced-motion behavior.

### Consequences

Feature modules do not invent arbitrary animation physics. Motion communicates causality and state rather than becoming decorative background activity.

---

## ADR-029 — No generic CSS/component-framework aesthetic in the product foundation

**Status:** accepted  
**Date:** 2026-09-21

### Decision

The production visual foundation is modern native CSS, CSS Modules and semantic CSS custom properties. Tailwind, MUI, Bootstrap and similar generic framework aesthetics are not adopted as the default product styling layer.

### Consequences

The application keeps a distinct V'gine visual language while still allowing reviewed headless/behavior primitives where technically justified.


## ADR-030 — Large-pool favorites are preference state, not project semantics

**Status:** accepted

Genres, Instruments and other high-cardinality option pools may expose persistent user favorites. Favoriting uses one shared interaction contract and is stored independently from MusicSpec. Favorites rank before non-favorites and are ordered by actual usage count with recency as a tie-breaker.

The browser implementation uses the IndexedDB-backed user-data adapter. Favorite state remains independent from ProjectDocument/MusicSpec and must remain replaceable behind that storage boundary.

## ADR-031 — Manual rendered-prompt editing is an explicit output override

**Status:** accepted

The deterministic compiler result remains reproducible from MusicSpec. Users may unlock the final rendered Style prompt and edit/delete text manually. This creates a separate output override; it never back-parses into MusicSpec and never becomes semantic source truth.

Resetting the override restores the current compiler result. The hard renderer budget still applies to the manual output.

## ADR-032 — Chapter reset is scoped; new prompt reset is global

**Status:** accepted

Each of the four Studio chapters can clear only the MusicSpec facets it owns. Starting a new prompt clears the whole MusicSpec plus prompt-scoped UI acknowledgements and manual output overrides. User-level preferences such as favorites survive project resets.

## ADR-033 — UI localization is independent from renderer language

**Status:** accepted

Studio UI text uses typed locale catalogs. German and English are the first supported interface locales; the architecture allows additional locales without component rewrites.

MusicSpec stores semantic IDs/values rather than localized UI labels. The Suno structured renderer remains English in v1. Changing the interface language must never alter compiled prompt semantics or renderer section labels.

## ADR-034 — Major Genres are selectable genre entities in Studio

**Status:** accepted

All 24 Major Genres are always visible in the Genre picker. Selecting a Major Genre filter shows the pure Major Genre itself as the first selectable result, followed by its taxonomy subgenres.

MusicSpec may store the stable Major Genre Runtime ID as a genre influence ID. Compiler knowledge therefore resolves both Major Genre IDs and subgenre IDs to canonical labels.

## ADR-035 — Expanded-pool return controls are viewport/segment scoped

**Status:** accepted

A floating return-to-start control for an expanded option pool is visible only after the user has scrolled materially below that segment's start and while the viewport is still inside the segment. It is hidden before/at the segment start and after the segment is passed.

This prevents multiple stale floating controls when several expandable pools exist on one page.

## ADR-036 — Editor Runtime payload is the shared facet-control source

**Status:** accepted

Pulse, Palette and Finish consume one lazy, manifest-validated `editor.json` Runtime payload for parameters, parameter options, curated statements and Exclude entries. Feature components do not invent local option catalogs.

Easy and Advanced remain views over the same MusicSpec. Easy writes statement selections; Advanced writes stable parameter-option selections and facet custom text.

Parameter cardinality follows the existing knowledge schema. `multi` allows multiple selected options. Other option-bearing parameter types are exclusive within their parameter until a more specific relation/constraint contract overrides that behavior.

## ADR-037 — Favorite hold feedback uses one synchronized timing source

**Status:** accepted

Mouse/touch favorite timing is 0.8 s to add and 1.0 s to remove. JavaScript state transition and SVG progress use the same duration variables so visual completion cannot drift from the actual state change.

Add feedback uses the active theme's semantic success color and an animated checkmark. Removal retains explicit danger-colored square/X feedback.

## ADR-038 — Runtime knowledge loads lazily and only explicit links become explainable

**Status:** accepted

The application does not load the full Knowledge payload during initial Studio bootstrap. `knowledge.json` is loaded, manifest-validated and cached on the first explanation request.

A UI label becomes an interactive Knowledge term only when its Runtime entity carries a concrete `knowledge_entry_id` (or an equivalent explicit semantic relation). The UI does not infer dictionary identity from matching visible strings.

Definition selection follows UI locale first, English fallback second. This localization path is independent of the English v1 prompt renderer.

## ADR-039 — Project persistence uses versioned ProjectDocument v1 over ProjectStorage

**Status:** accepted

The persisted web project is a versioned `vgine-project-v1` document behind the existing `ProjectStorage` abstraction.

The document stores MusicSpec as semantic source truth plus explicit secondary project/output state:

- stable project ID/title/timestamps;
- MusicSpec;
- manual Style output override, when present;
- minimal prompt-scoped workspace state such as active Studio chapter and genre-skip acknowledgement.

Theme, UI locale, Favorites and other user preferences are not project state and remain outside ProjectDocument.

The first web adapter uses IndexedDB without an external dependency. Tauri/native storage may later implement the same interface without changing domain/compiler state.

## ADR-040 — Tracked Product Editor Foundation guarantees facet completeness

**Status:** accepted

The completed Database V1 is not reopened merely to manufacture application controls for every ordinary MusicSpec facet. Product-owned editor vocabulary lives in the tracked `data/product/editor-foundation-v1.json` contract and is compiled into Runtime Pack `editor.json`.

The Foundation provides deterministic Easy statements and Advanced parameters/options for all ordinary facets except Genre and Instruments. Genre/Instrument selection continues to come from their specialized Database V1 runtime layers.

Reviewed/approved database editor records overlay matching Foundation records by stable ID. The Foundation is therefore a minimum product surface, not a higher-authority replacement for durable curation.

A runtime export is invalid if Foundation v1 no longer covers every required ordinary facet with both Easy and Advanced selectable content.

## ADR-041 — Easy/Advanced are mutually exclusive authoring layers per facet

**Status:** accepted

Easy and Advanced continue to edit the same MusicSpec, but a facet must not retain contradictory state from both authoring layers once the user mutates the new layer.

Mode switching is view-only. On the first Advanced mutation, Easy `statement` selections are removed. Selecting an Easy statement replaces Advanced selections and custom text for that facet.

A global editor-depth preference controls all ordinary facets at once; individual facet switches remain local overrides.

## ADR-042 — Personal Studio data is local IndexedDB state

**Status:** accepted

Projects, pool Favorites, Advanced custom presets, Theme, locale and editor-depth preferences are device-local data. Web/PWA persistence uses IndexedDB-backed adapters. No server or cloud persistence is introduced.

Legacy `localStorage` values may be read only for one-time migration and are no longer the active persistence target.

## ADR-043 — Product-owned editor vocabulary has a tracked Knowledge companion

**Status:** accepted

Product Editor Foundation controls must not remain semantic dead ends. A tracked Product Knowledge Foundation supplies stable explanatory entries for product-owned parameters, options, Easy statements and Exclude choices.

Runtime merge precedence is Product Knowledge Foundation -> reviewed/approved database Knowledge by stable ID. The product layer guarantees explanation coverage without replacing durable curated knowledge authority.

The Product Knowledge Foundation is independently fingerprinted in Runtime manifests.

## ADR-044 — Prompt explanations are provenance-backed, not inferred from output prose

**Status:** accepted

Explain mode derives live-prompt explanations from MusicSpec selection IDs and their Runtime semantic links. It may verify that the selection's rendered value is present in the final section before surfacing the explanation.

The product does not string-guess arbitrary custom prompt wording into Knowledge concepts. Unlinked user text remains unannotated.

## ADR-045 — Explain is a selection-time singleton overlay, not layout content

**Status:** accepted

Explain mode exists primarily where a user makes a choice. Any selectable Runtime entity with an explicit Knowledge link should expose that definition before selection, while the rendered/copyable prompt remains semantically unchanged.

Desktop interaction uses a subtle dashed term affordance with delayed hover/focus preview; click pins the explanation. Touch uses tap to pin the same concept in a mobile-safe sheet. Only one explanation surface may be active at a time.

Explanation surfaces render through a viewport-level portal rather than inside cards/pickers. They must not be clipped by parent overflow, create layout shift, or accumulate overlapping popovers. The old live-prompt explanation-chip rows are not part of the accepted Studio UX.

This interaction rule does not relax ADR-038/ADR-044: explainability still requires an explicit Runtime Knowledge ID or semantic relation. No rendered-string inference is introduced.

## ADR-046 — Product Knowledge prose defines music concepts, never editor mechanics

**Status:** accepted

A Product Knowledge definition must answer what the musical term, value, phrase, production characteristic or undesirable condition means. It must not explain that an item is an Easy preset, Advanced option, UI control, prompt fragment, or Exclude action.

Product Knowledge authoring therefore treats stable IDs and editor metadata as context only. User-facing definitions should explain audible/structural/production meaning in clear English and German, with context-dependent caveats where needed.

The complete v1 authoring batch lives beside the Product Knowledge source as `data/product/knowledge-foundation-v1-authoring-request.txt`. Returned ID/EN/DE text is validated and imported through `scripts/data/import_product_knowledge_authoring.py`; the importer preserves IDs/links and replaces only localized `plain` definitions with revision bumps.

## ADR-047 — Project library uses ProjectStorage documents plus a separate active-project pointer

**Status:** accepted

Multi-project Studio state continues to use the existing `ProjectStorage` document contract. Each project has its own stable local ID and persists MusicSpec plus the already accepted secondary project/workspace state.

The currently open project ID is a user-level local preference stored through `UserDataStorage`, not embedded into a project document. The historical fixed ID `active` is migration input only: Studio migrates that legacy record to a fresh project ID and removes the old record after successful save.

Project operations preserve the same local-only boundary:

- rename keeps project ID and creation time while updating title and `updated_at`;
- duplicate clones semantic/output/workspace state under a fresh ID and fresh timestamps;
- export serializes one validated `vgine-project-v1` document to a user-downloaded `.vgine.json` file;
- import validates `vgine-project-v1`, then creates a fresh local ID instead of overwriting an existing project with the exported ID;
- deleting the active project switches to the most recently updated remaining project, or creates a new blank local project when none remain.

No server/cloud sync is introduced. Project import/export is explicit user-controlled file I/O.

## ADR-048 — Explain must never steal a selectable control's primary click/tap

**Status:** accepted

Explain is secondary assistance. When a Knowledge-linked term is also the visible label of a selectable option, its primary activation semantics win.

- Desktop mouse hover and keyboard focus preview the explanation.
- Clicking the selectable label, or pressing Enter/Space while it has keyboard focus, activates/toggles the underlying option.
- Non-selectable Knowledge terms may still use click-to-pin.
- Touch has no hover, so selectable Knowledge terms expose a separate compact explanation affordance; tapping the label still selects, while tapping the explanation affordance opens the mobile explanation surface.
- This rule applies consistently to Easy statements, Advanced values, recommended numeric values, Genre results, Instrument expressions and Exclude entries.

This refines ADR-005/ADR-045: inline explanation remains available before selection, but it cannot make the actual control harder to operate.

## ADR-049 — Undo/redo is session-local MusicSpec history, not project data

**Status:** accepted

Studio authoring gets a bounded in-memory undo/redo history around MusicSpec mutations.

- History is not serialized into `vgine-project-v1` and does not change `ProjectStorage`.
- Opening, creating, importing, duplicating or switching projects clears both history stacks.
- Autosave persists only the resulting current MusicSpec.
- Direct text-entry fields keep native browser undo; global MusicSpec shortcuts ignore text inputs, textareas, selects and contenteditable targets.
- Repeated changes to one stable selection ID and continuous facet custom-text edits may coalesce within a short interaction window, avoiding dozens of steps from range drags/typing.
- Distinct semantic selections are not intentionally merged into one history step.

This keeps recovery fast without creating hidden cross-project state or expanding the persistence contract.

## ADR-050 — BPM slider range is ergonomic, not a hard domain ceiling

**Status:** accepted

The BPM control separates fast bounded manipulation from explicit expert entry.

- Slider and recommended-value interaction remain bounded to the Product Foundation range (currently 40–220 BPM).
- Direct numeric BPM entry may exceed the slider range; the entered positive finite value is preserved in MusicSpec/compiler output.
- When the stored value is outside the slider range, the slider visual clamps to the nearest endpoint rather than mutating the stored value.
- Direct entry remains step-snapped; the range metadata continues to describe the physical slider, not the entire representable BPM domain.

The Live Prompt also follows a single-scroll-path rule: it grows with structured output and does not own an inner vertical scrollbar on desktop. Manual Style editing preserves the themed structured appearance while remaining plain-text and non-semantic.

## ADR-051 — Live Prompt follows the page; causality highlight is facet-scoped

**Status:** accepted

The desktop Live Prompt may follow long Studio editing sessions, but it must preserve one page scroll path.

- The preview has no inner vertical scroll container.
- Sticky positioning uses the rendered preview height to derive a top offset. Short previews stay near the global top bar; tall previews scroll upward until their footer can fit in the viewport, then follow from that position.
- The active authoring facet is the only deterministic prompt section given a persistent causality highlight.
- A MusicSpec mutation briefly pulses only facet sections that actually changed; genre and Exclude are explicit targets too.
- Active-facet identity comes from explicit `data-facet` / MusicSpec keys, not rendered prompt text.
- Manual Style overrides remain plain text and are not reverse-classified into section ownership.

This supersedes the indiscriminate `.preview.changed .changed-line` behavior where every structured section flashed after any Style change.

## ADR-052 — Large pools use spatial keyboard navigation and keyboard-equivalent favorites

**Status:** accepted

Large Genre, Instrument and Exclude result grids must remain efficient without a pointer.

- `/` focuses search and `ArrowDown` transfers focus from search into the first visible result.
- Arrow-key movement is derived from rendered card geometry, not hard-coded column counts, so it follows responsive grid changes.
- `Home` / `End` reach the first/last visible result and `Escape` returns focus to search.
- Enter/Space perform the result's primary selection/toggle action.
- The pointer hold gesture for Favorite has a keyboard equivalent: `Shift+F` toggles the same local favorite state.
- Result focus is visibly represented on the entire result card even when an internal full-card button owns accessible activation.

No separate roving-tabindex persistence or picker-specific keyboard state is introduced.

## ADR-053 — Locked and unlocked Style output share one compact visual rhythm

**Status:** accepted

The deterministic locked Live Prompt and the themed manual Style editor represent the same text surface and should not diverge in vertical density.

- Structured Style lines must not gain artificial inter-section spacing merely because they are clickable source links.
- Mobile source-link affordances may be smaller than the general 44 px primary-control target when the link is a secondary reverse-navigation affordance inside dense read-only output.
- The dense locked Style view should match the themed manual editor's font size/line-height closely enough that lock/unlock does not cause a large layout jump.
- Exclude remains a separate output block and may retain a larger touch target.
- This rule changes presentation only; compiler serialization/copy output remain plain text and unchanged.

## ADR-054 — Manual Style editing is a guarded final-output escape hatch

**Status:** accepted

The global manual Style editor exists for deliberate final output corrections, not as a parallel semantic authoring mode.

- The first unlock from deterministic Style opens an inline guard; opening that guard alone does not create or persist a manual override.
- Confirming the guard snapshots the current compiler Style into the explicit manual output override. MusicSpec and the deterministic compiler continue underneath, but subsequent Studio edits do not alter the visible/copyable manual Style.
- If the user is still building the sound, custom wording belongs in the matching facet's **Advanced → Custom wording** field so it remains part of MusicSpec, recompiles normally, participates in project history, and retains prompt-to-source navigation.
- Arbitrary manual Style text is never reverse-parsed or string-guessed into a facet.
- Restoring the original discards the manual override and immediately reconnects the visible Style to the current deterministic compiler result.
- A persisted/existing manual override may be locked and reopened without repeating the first-transition guard; the warning is a mode-boundary acknowledgement, not recurring friction.

The guard stays inline in the Live Prompt and does not move central editing into a modal, dropdown, or hidden surface.

## ADR-055 — Deterministic Style rows are text-first; source navigation is a separate affordance

**Status:** accepted

Locked deterministic Style output must derive its density from the rendered prompt text, not from control geometry.

- A structured Style line is rendered as plain themed text with zero button/control padding.
- Reverse Prompt→Source navigation is a separate icon action positioned in the prompt gutter outside normal text flow.
- The source action remains keyboard focusable, labeled with the owning section and may expose `aria-current="location"`; hiding its visual chrome on desktop must never remove it from keyboard access.
- The source action must not reserve inline space, force minimum row height, change line wrapping or turn the renderer line into a card/button surface.
- Active-facet and changed-section causality attach to the semantic line container and may use non-layout-affecting emphasis.
- Mobile may keep the secondary source action persistently visible while retaining the compact text rhythm accepted by ADR-053.
- Exclude remains a separate output action and is not forced into this dense structured-line treatment.

This refines ADR-051/ADR-053: reverse navigation remains explicit and accessible without making the prompt text itself an oversized interaction target.
