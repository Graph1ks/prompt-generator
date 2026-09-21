# Prompt V'gine — Compiler v1

**Status:** implementation foundation accepted  
**Date:** 2026-09-21  
**Packages:** `@vgine/music-spec`, `@vgine/compiler`

## 1. Boundary

The compiler is a pure TypeScript package.

```text
MusicSpec
+ normalized runtime compiler knowledge
+ renderer profile ID
  -> CompilationResult
```

It must not depend on React, DOM APIs, browser storage, Tauri, network services, or runtime AI.

## 2. Current toolchain

- Node.js: **24.21.0 LTS** baseline for JS/TS development and CI;
- pnpm: **11.27.1** pinned package manager;
- TypeScript: **7.0.2** exact dev dependency;
- tests: Node's built-in `node:test` after TypeScript compilation.

No application UI package is introduced by this compiler slice.

## 3. MusicSpec v1 runtime validation

`@vgine/music-spec` mirrors the accepted MusicSpec v1 contract and provides runtime validation for imported/untyped data.

The implementation validates:

- exact schema version;
- one to three genre influences;
- supported Foundation/Fusion/Accent roles;
- unique genre roles;
- known routing facets and unique routing entries;
- only the 17 canonical MusicSpec v1 facet keys;
- facet/selection/custom-text shapes;
- supported selection kinds/origins;
- Exclude item shape.

Unknown v1 facets are rejected rather than silently reinterpreted. Future facet additions require a schema/version migration.

## 4. Compiler input

The initial compiler consumes a normalized runtime view:

```text
CompilationKnowledge
  runtimeBuildId
  rendererProfiles
  genreLabels
```

This is intentionally **not** the physical Runtime Pack JSON shape. The future `runtime-data` package owns the adapter from Runtime Pack v1 snake_case payloads to compiler-domain types.

## 5. Rendering

The compiler:

1. validates MusicSpec;
2. resolves the requested renderer profile;
3. creates Genre content from ordered Foundation/Fusion/Accent influences;
4. adds facet selections and custom text;
5. normalizes internal whitespace;
6. removes exact same-section semantic duplicates;
7. renders only non-empty sections in renderer-profile order;
8. emits Exclude separately as a comma-delimited plaintext output;
9. applies semantic budget handling before final validity is decided.

Every style section remains a complete `[Header: content]` line.

## 6. Protection and semantic budget precedence

The current deterministic protection model is:

### Never auto-omit

- genre influences;
- facet-locked content;
- selection-locked content;
- `origin=user`;
- `origin=imported`;
- `origin=freeform`;
- facet custom text.

These are treated as explicit/protected intent.

### Auto-omission order when over budget

1. `origin=derived`;
2. `origin=genre_suggestion`;
3. `origin=statement`.

Within the same tier, the longest item is considered first, then stable source order is used as the deterministic tie-breaker.

After every omission the full structured prompt is re-rendered and re-counted.

If the prompt still exceeds the renderer maximum after all eligible lower-priority material has been removed, the compiler returns a `budget_conflict` diagnostic and leaves the complete protected output intact. It never slices the plaintext.

## 7. Duplicate handling

Exact normalized duplicates inside the same section are collapsed deterministically.

If a protected and removable duplicate collide, the protected copy wins.

Every removal/deduplication is exposed through `compactions[]`; the compiler does not silently hide its budget decisions.

## 8. Character counting

Budget counting uses Unicode code points:

```ts
Array.from(text).length
```

This avoids JavaScript UTF-16 surrogate pairs counting one visible supplementary code point as two units.

The count includes:

- brackets;
- header text;
- separators;
- newlines between rendered sections.

Exclude does not consume the style budget.

## 9. Structured output

`CompilationResult` contains:

```text
rendererProfileId
runtimeBuildId
styleText
excludeText
sections[]
budget { used, max, remaining, valid }
diagnostics[]
compactions[]
```

The UI must inspect `budget.valid` and diagnostics instead of assuming every compiler call is exportable.

## 10. Known deliberate limitation of this slice

The first budget engine performs:

- exact semantic deduplication;
- deterministic omission of lower-priority derived/suggested material.

It does **not yet** rewrite or linguistically shorten a long semantic item.

The next compiler iteration may add deterministic compact representations where the runtime knowledge contract contains an approved shorter equivalent. It must not invent lossy paraphrases merely to hit the budget.

## 11. Verification

Current compiler/MusicSpec regression coverage includes:

- minimal MusicSpec validation;
- rejection of unknown facets;
- duplicate role/routing rejection;
- canonical section ordering;
- separate Exclude rendering;
- derived-before-explicit budget behavior;
- protected custom-text budget conflict;
- complete-section preservation;
- Unicode code-point counting;
- deterministic repeated compilation.
