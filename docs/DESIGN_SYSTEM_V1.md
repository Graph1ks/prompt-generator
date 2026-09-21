# Prompt V'gine — Design System + Motion v1

**Status:** implementation foundation accepted  
**Date:** 2026-09-21  
**Packages:** `@vgine/ui`, `@vgine/motion`

## 1. Core rule

V'gine owns its visual language.

Feature code composes semantic tokens and shared components. It must not create local copies of generic colors, spacing, radii, focus styles, touch sizing, shadows or animation physics.

The design stack is layered:

```text
semantic tokens
  -> theme implementations
  -> primitives
  -> controls / overlays
  -> reusable patterns
  -> Studio/domain composition
```

This slice implements the first two layers plus the shared motion language. React primitives come later.

## 2. Theme contract

Supported theme IDs:

- `paradise`;
- `ash`.

Both implement the same semantic variables:

```text
background / surfaces
text / muted / inverse text
border / strong border
accent / accent strong / accent contrast
selection / focus
success / warning / danger
```

Product components consume semantic variables such as `--vg-color-surface-raised`; they do not branch on Paradise/Ash or reference palette colors directly.

## 3. Paradise palette

Accepted source palette:

```text
#000004
#1D402D
#FFF9EC
#A85527
#E4A030
```

The theme uses palette variables plus CSS `color-mix()` to derive surface/border states while keeping one recognizable visual family.

## 4. Ash palette

Accepted source palette:

```text
#6D6C73
#1D1E26
#3E4034
#262623
#A69286
```

Muted normal text is derived from Taupe + Gray rather than using the darker Gray directly. This keeps the secondary text treatment closer to normal-text contrast requirements on the Ink background.

## 5. Base token groups

`packages/ui/styles/tokens.css` currently owns:

- spacing scale;
- radius scale;
- system-font stacks;
- type scale/line-height/weights;
- touch-target minimum;
- Studio layout sizing primitives;
- shadow scale;
- z-index tiers;
- focus-ring contract;
- baseline box sizing;
- baseline focus-visible behavior.

No external font is introduced in the foundation. A future custom font requires its own asset/license/performance review.

## 6. CSS architecture

Tracked CSS uses cascade layers:

```css
@layer vgine.tokens
@layer vgine.motion
```

Application/component layers will be added explicitly instead of relying on accidental import precedence.

Recommended future order:

```css
@layer reset, vgine.tokens, vgine.motion, vgine.primitives, vgine.components, vgine.utilities;
```

## 7. Motion language

`@vgine/motion` owns:

### Durations

- instant: 0ms
- fast: 120ms
- normal: 220ms
- slow: 360ms

### Easing families

- standard;
- enter;
- exit;
- emphasized.

### Spring families

- responsive;
- layout;
- sheet;
- reorder.

Feature code should select a named recipe rather than inventing stiffness/damping/timing values.

## 8. Named motion recipes

Accepted recipes:

- `press`;
- `select`;
- `insert`;
- `remove`;
- `swap`;
- `expand`;
- `sheet`;
- `promptDiff`;
- `layoutMorph`.

These names describe product causality. A later Motion-for-React adapter maps them into library-specific transition objects.

The domain/UI packages must not import Motion merely to obtain constants already represented here.

## 9. Reduced motion

Every recipe has a reduced-motion behavior.

The pure TypeScript helper converts reduced-motion requests to short/zero-duration tween behavior; it never returns a spring.

CSS also collapses normal/slow transition durations under `prefers-reduced-motion: reduce` and disables smooth scrolling.

Reduced motion is part of the component contract, not a post-release patch.

## 10. Radix / shadcn boundary

This design foundation does not require either.

When React primitives are implemented:

- Radix may be adopted selectively for difficult accessibility/focus/keyboard behavior;
- imported primitives remain visually controlled by V'gine;
- shadcn may be consulted as implementation/reference material;
- shadcn is not the base design system;
- Tailwind is not introduced merely to consume shadcn.

Exact package versions are reviewed only when installed.

## 11. Current dependency state

`@vgine/ui` and `@vgine/motion` add **zero external npm dependencies**.

They compile/test under the existing pinned Node/pnpm/TypeScript toolchain.

## 12. QA contract

Current automated checks verify:

- Paradise and Ash are explicit supported themes;
- both themes implement every semantic color token;
- base layout tokens remain present;
- no unreviewed Inter font dependency leaks into the system-font foundation;
- all accepted causal motion recipes exist;
- reduced-motion output never returns a spring;
- motion duration scale remains centralized.

When React primitives begin, QA expands to keyboard, focus, touch, responsive composition and browser rendering.

## 13. Next layer

The next application slice may now introduce reviewed React/Vite dependencies and build:

1. product CSS entry/reset;
2. first primitives: `Surface`, `Button`, `IconButton`, `Text`, `Stack`, `Cluster`;
3. focus/pressed/disabled/loading states;
4. theme switch using the same token contract;
5. a Motion-for-React adapter if the reviewed package is introduced;
6. the first Studio shell consuming the domain/runtime packages.
