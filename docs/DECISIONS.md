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

`--force` may replace corpus/knowledge but must not delete curation.

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
