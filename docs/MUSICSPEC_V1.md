# MusicSpec v1

**Status:** accepted contract for the first application implementation  
**Purpose:** semantic source of truth shared by Easy mode, Advanced mode, quality checks, inline explanations, and prompt renderers.

## 1. Core rule

The final Suno prompt is **not** application state. Prompt V'gine edits a structured MusicSpec and renders text from that state.

Easy and Advanced modes are different editing surfaces over the same object.

## 2. Top-level shape

```text
MusicSpec
├─ schema_version
├─ genre_influences[1..3]
│  ├─ Foundation
│  ├─ Fusion
│  └─ Accent
├─ facets
│  ├─ genre
│  ├─ era
│  ├─ bpm
│  ├─ key_mode
│  ├─ groove
│  ├─ melody
│  ├─ harmony
│  ├─ drums
│  ├─ bass
│  ├─ instruments
│  ├─ exciters
│  ├─ texture
│  ├─ vocal
│  ├─ dynamics
│  ├─ space_mix
│  ├─ production
│  └─ structure
└─ exclude[]
```

The JSON Schema lives in `schema/music-spec-v1.schema.json`. The executable TypeScript contract/runtime validator lives in `packages/music-spec`; unknown facet keys are rejected in v1 rather than silently interpreted.

## 3. Genre influences

A project has one to three ordered influences.

```json
{
  "role": "foundation",
  "genre_id": "genre:boom-bap:...",
  "routing": ["groove", "drums", "bass"],
  "locked": false
}
```

Roles:

- `foundation` — primary musical grammar;
- `fusion` — secondary language integrated into the foundation;
- `accent` — limited color/texture/production influence.

The roles are ordered and directly swappable by drag in the UI. There are no default percentage weights.

`routing` says *where* an influence should matter. Advanced mode can edit/lock routing. Easy mode can rely on reviewed defaults/suggestions.

## 4. Facet state

Every facet can contain structured selections plus optional custom text.

A selection records:

- stable selected object ID when available;
- kind: statement / parameter option / concept / freeform;
- value/output fragment when needed;
- origin/provenance;
- lock state.

Example:

```json
{
  "groove": {
    "locked": false,
    "selections": [
      {
        "id": "statement:groove:laid-back-swing",
        "kind": "statement",
        "value": "laid-back swung pocket",
        "origin": "user",
        "locked": false
      }
    ],
    "custom_text": null
  }
}
```

## 5. Easy mode

Easy mode writes reviewed `statement`/combination selections into facet state.

A statement should, where possible, link back to concepts/parameter options so Advanced mode can explain or expand what it means.

Easy mode must not create a second hidden prompt state.

## 6. Advanced mode

Advanced mode edits atomic parameters/options, routing, ownership/relations, locks, and optional custom section text.

Advanced custom text is still attached to a specific facet. It is not an unstructured global prompt blob.

## 7. Locks

Locks protect explicit user intent from later suggestions/randomization.

Locking can exist at:

- genre-influence level;
- facet level;
- selection level.

A later derived suggestion must not overwrite a locked value silently.

## 8. Origins

Initial origin vocabulary:

- `user` — directly selected/typed by the user;
- `statement` — expanded from an Easy-mode reviewed statement;
- `genre_suggestion` — suggested from genre knowledge/defaults;
- `derived` — deterministic consequence of other state;
- `imported` — reconstructed from an imported project/prompt;
- `freeform` — explicit custom user text.

Origins are used for explanation and conflict resolution, not for deciding that one choice is “correct.”

## 9. Quality checks

Quality checks read MusicSpec and return diagnostics. They do not mutate it automatically.

Examples:

- multiple primary melodic owners;
- competing low-end owners;
- conflicting dry/wet instructions;
- unclear kick/bass relationship;
- user override contradicting a genre suggestion.

A diagnostic may propose a resolution, but applying it is an explicit action.

## 10. Dictionary context

Current-project explanations derive from MusicSpec.

Example inputs:

- concept: `transient`;
- context: `drums`;
- current option: `sharp`;
- Foundation: Boom Bap;
- Bass: sustained/rounded.

The UI can then explain what “sharp transients” are doing **in this project**, while the static knowledge DB supplies the global and facet-specific definitions.

## 11. Rendering

Renderers consume MusicSpec and compiled knowledge.

The first renderer is `suno-structured-v1`, documented in `docs/PROMPT_FORMAT.md`.

Renderer behavior must be deterministic for the same MusicSpec + knowledge version.

## 12. Persistence and migrations

Persist:

- `schema_version`;
- stable IDs;
- user text;
- locks/origins/routing.

Do not persist rendered prompt text as the canonical state. It may be cached for convenience but must be reproducible.

Future MusicSpec changes require explicit migration logic rather than silent reinterpretation.
