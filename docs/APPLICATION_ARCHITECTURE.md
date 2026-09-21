# Prompt V'gine — Application Architecture

**Status:** accepted application foundation  
**Date:** 2026-09-21  
**Scope:** production application/runtime/UI architecture above completed Database V1

## 1. Core architectural rule

Prompt V'gine is a semantic music-specification editor, not a prompt-string editor.

The canonical data flow is:

```text
knowledge.sqlite
  -> local runtime-pack compiler
  -> versioned Runtime Pack v1
  -> application runtime repositories/search
  -> shared MusicSpec state
  -> deterministic compiler
  -> renderer profile output (first: suno-structured-v1)
```

Rendered Suno text is output only. React components, browser storage, Tauri APIs, and UI-specific state must not become compiler dependencies.

## 2. Production stack

The accepted production direction is:

- **TypeScript in strict mode** for application/runtime/compiler code;
- **React** for the user interface;
- **Vite** for web development/build tooling;
- **pnpm workspaces** for the repository JavaScript/TypeScript workspace;
- **Tauri 2** for desktop packaging and the shared web-native shell, with mobile targets evaluated from the same application architecture;
- **Python standard library** remains the owner-local data-build/runtime-pack compiler environment;
- **no required backend** for the core product;
- **no required runtime AI/model/API** for prompt compilation, search, or definitions.

Versions are pinned only when the dependency is actually added. Every external dependency still passes the repository cost/license/dependency gate before installation.

## 3. Package boundaries

Target repository structure:

```text
apps/
  studio/                  React/Vite product shell
packages/
  music-spec/              semantic state types, migrations, validation
  runtime-data/            Runtime Pack contract/loaders/repositories
  compiler/                MusicSpec -> renderer compilation/budget/diagnostics
  search/                  local search ranking + worker boundary
  ui/                      V'gine design system/components
  motion/                  centralized motion tokens/recipes
src-tauri/                 Tauri shell when web foundation is stable
scripts/data/              local Python data/runtime compilers
schema/                    durable JSON/SQLite schemas
```

Hard boundaries:

- `packages/compiler` is pure and must not import React, DOM APIs, browser storage, or Tauri APIs.
- `packages/music-spec` contains no renderer-specific UI state.
- `packages/ui` contains reusable visual/interaction building blocks, not music-domain business rules.
- application feature modules compose packages; they do not reimplement generic primitives.

## 4. Design system architecture

The V'gine visual language is a first-class subsystem. Generic application features must not create ad-hoc visual primitives.

`packages/ui` is organized into layers:

```text
ui/
  tokens/       color, typography, spacing, radius, shadow, z-index, motion hooks
  primitives/   Button, IconButton, Text, Surface, Stack, Cluster, Divider, Icon
  controls/     Chip, Toggle, Slider, SearchField, LockButton, SegmentedControl, NumberField
  overlays/     Dialog, Sheet, BottomSheet, Popover, Tooltip
  patterns/     Picker, SearchResults, PropertyEditor, FacetHeader, OptionGrid, KnowledgeTerm
  studio/       StudioPanel, FacetRail, PromptPreview, BudgetMeter, ChapterNav
```

A feature may add a domain-specific component such as `InstrumentResult`, but it must compose the common layers rather than clone them.

### Design tokens

All reusable visual decisions use semantic tokens. Product code must not scatter raw colors, radii, shadows, timings, or spacing values.

Examples:

- `--surface-base`, `--surface-raised`, `--surface-floating`, `--surface-inverse`;
- `--text-primary`, `--text-muted`, `--border-subtle`, `--border-strong`;
- `--radius-sm` ... `--radius-xl`;
- spacing/typography scales;
- focus, success, warning, danger, and selection tokens.

The accepted **Paradise** and **Ash** palettes are theme implementations of the same semantic token contract, not separate component styles.

## 5. Styling decision

Default styling is modern native CSS plus CSS Modules and CSS custom properties.

Use:

- CSS Grid/Flexbox;
- container queries where they improve adaptive layout;
- `clamp()` and logical properties;
- cascade layers where useful;
- `prefers-reduced-motion`;
- semantic design tokens.

Do **not** adopt Tailwind, MUI, Bootstrap, or a generic component-framework visual language as the product foundation.

## 6. Radix and shadcn boundary

### Radix

Radix primitives are the preferred candidate for selected complex accessibility/interaction primitives such as Dialog, Popover, Tabs, Slider, Tooltip and related focus/keyboard behavior.

Rules:

- adopt selectively, not wholesale;
- wrap imported primitives behind V'gine components when they become part of the reusable UI contract;
- V'gine owns all visual styling and product behavior;
- dependency/version/license review occurs before first installation.

### shadcn/ui

shadcn/ui is **not** the V'gine base design system and is not a required dependency.

It may be used as implementation/reference material when a pattern is useful, but:

- no shadcn default aesthetic is accepted as product design;
- no Tailwind requirement is introduced merely to use shadcn;
- copied/adapted component code becomes explicitly reviewed project code with attribution/license obligations handled normally;
- reusable components still live under the V'gine design-system boundaries above.

## 7. Motion system

Motion is structural/causal UI feedback, not decoration.

**Motion for React** is the selected animation engine candidate for layout animation, presence, gestures, drag/reorder, springs, and coordinated transitions. Simple hover/focus/color/opacity transitions remain CSS.

`packages/motion` owns the shared motion language:

- duration tokens: instant / fast / normal / slow;
- shared easing curves;
- spring recipes;
- named interaction recipes such as `press`, `select`, `insert`, `remove`, `swap`, `expand`, `sheet`, `promptDiff`, `layoutMorph`;
- reduced-motion variants for every recipe.

Feature code must not invent arbitrary spring/timing constants when an existing recipe fits.

Primary production uses:

- Foundation/Fusion/Accent drag/swap;
- picker/sheet transitions;
- Easy <-> Advanced layout morphs;
- insertion/removal/reorder feedback;
- prompt-section diff highlighting;
- lock/suggestion state changes.

Continuous decorative animation is not required for comprehension.

## 8. Shared picker/search pattern

Large vocabularies never become native dropdown walls.

Genre, instrument-expression, concept, statement, Exclude and knowledge selection use one composable picker pattern:

```text
search
recommended / recent / favorites
semantic filters/categories
virtualized ranked results
selection/detail/knowledge affordances
```

Desktop may render the picker as an anchored/side workspace or dialog depending on task context. Mobile uses a bottom/full-height sheet. Both use the same data/search contract.

Large result lists are virtualized. Search runs outside expensive React rendering and is designed for a worker boundary.

## 9. Application state

MusicSpec is the only canonical musical project state.

Additional UI state is allowed only for interaction concerns such as:

- currently open chapter/facet;
- active picker/query;
- pinned knowledge explanation;
- temporary animation/diff state;
- unsaved project metadata.

Easy and Advanced edit the same MusicSpec. There is no hidden Easy prompt, Advanced prompt, or preview-specific prompt state.

Zustand is the preferred lightweight application-state candidate when the React implementation begins, subject to normal dependency review. Domain logic remains in pure functions/packages rather than store actions when possible.

## 10. Compiler boundary

The compiler accepts:

- MusicSpec;
- Runtime Pack knowledge repositories;
- renderer profile ID.

It returns structured output, not only a string:

```text
CompilationResult
  styleText
  excludeText
  sections[]
  budget { used, max, remaining, valid }
  diagnostics[]
  compactions[]
```

The hard `suno-structured-v1` 1,000-character rule is solved semantically before serialization. Protected explicit/locked content is never silently removed; impossible protected combinations produce a diagnostic requiring a user decision.

## 11. Persistence

Project persistence uses an adapter boundary:

```text
ProjectStorage
  list
  load
  save
  remove
```

Initial web/PWA storage target: IndexedDB. Tauri may later provide a native filesystem/AppData implementation behind the same interface.

`localStorage` is limited to small preferences such as theme/guidance/last-open surface; it is not the canonical project database.

Persisted projects include MusicSpec schema version, stable IDs, user text, locks, origins/routing and project metadata. Rendered prompt text may be cached but is never canonical state.

## 12. Desktop/mobile composition

The same component system adapts composition rather than simply scaling the desktop page.

### Desktop

Preferred three-zone studio:

```text
Facet/Chapter rail | active studio workspace | live prompt/diagnostics
```

Important controls remain visible and keyboard/mouse efficient; repeated modal nesting is avoided.

### Mobile

Preferred composition:

- four high-level chapters;
- one focused work surface;
- picker/bottom-sheet interactions;
- persistent bottom dock for live prompt/budget/copy;
- no essential hover interaction;
- no nested-scroll traps.

The four chapters organize the full renderer facets without reducing capability:

1. **DNA** — Genre influences, Era, Key/Mode;
2. **Pulse** — BPM, Groove, Drums, Bass, Dynamics;
3. **Palette** — Melody, Harmony, Instruments, Exciters, Texture, Vocal;
4. **Finish** — Space/Mix, Production, Structure, Exclude.

## 13. Performance model

Normal UI runtime must not require `corpus.sqlite`.

The web/native application consumes compiled Runtime Packs from `knowledge.sqlite`. Initial search operates on compact local search documents; a server/search service is not required.

Performance rules:

- virtualize large result sets;
- avoid thousands of mounted result nodes;
- lazy-load/shard only where measured payload/startup behavior justifies it;
- do not create micro-shards before measuring the real Runtime Pack;
- keep compiler operations deterministic and inexpensive enough for live preview.

TanStack Virtual is the preferred virtualization candidate, subject to dependency review before installation.

## 14. QA gates for the application phase

Before a production application slice is accepted:

- TypeScript strict/typecheck passes;
- unit tests cover changed compiler/state/search behavior;
- keyboard and touch paths are tested for changed UI primitives;
- reduced-motion behavior is verified for new motion recipes;
- desktop + narrow/mobile layout is exercised;
- compiler output remains deterministic;
- runtime-pack schema/build ID compatibility is enforced;
- new dependencies pass cost/license review.

## 15. Implementation order

Accepted order:

1. Runtime Pack v1 contract/export/validation;
2. TypeScript workspace + `music-spec` package;
3. pure compiler + 1,000-character budget engine;
4. runtime-data/search repositories and search worker;
5. V'gine design-system tokens/primitives + motion recipes;
6. React/Vite Studio shell;
7. Easy/Advanced feature modules;
8. Tauri packaging after the web application foundation is stable.

Do not reverse this order by building a large mock-data UI that later dictates a conflicting runtime/compiler shape.
