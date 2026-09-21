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

## ADR-006 — Genre influence is 1–3 ordered roles, not percentages

**Status:** accepted  
**Date:** 2026-09-21

### Decision

A project can have Foundation, Fusion, and Accent genre influences. Genres can be drag-swapped between roles. The product does not expose default numeric influence percentages because the prompt target expresses language rather than meaningful numeric mixing weights.

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
