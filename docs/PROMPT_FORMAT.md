# Prompt Output Contract — Suno Structured v1

**Status:** accepted v1 renderer contract

## Style prompt

The style prompt uses one bracketed section per non-empty facet:

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

Rules:

- the complete rendered style prompt has a **hard maximum of 1,000 characters**, including brackets, headers and newline separators;
- character counting is Unicode code-point/string length after final plaintext normalization;
- budget semantics before serialization; never blindly slice the rendered string at character 1,000;
- preserve complete `[Header: content]` lines; no section may be left syntactically incomplete;
- source-derived P90 full-line lengths are soft budgeting targets, not hard section caps;
- when over budget, compact/remove redundant or lower-priority derived material before explicit user intent;
- locked or explicit custom user text is never silently removed solely to satisfy the budget; if protected content cannot fit, emit a clear budget diagnostic and require an explicit user choice;
- Exclude is a separate output and does not consume the 1,000-character style-prompt budget;
- emit only non-empty sections;
- preserve the canonical order above;
- headers are part of the copied plaintext;
- generated UI highlighting/dictionary markup is never copied;
- editing one facet should visually identify the corresponding rendered section;
- when one action changes multiple facets, every affected section may be highlighted;
- Advanced custom text belongs inside its assigned section rather than creating arbitrary headers.

## Genre

Genre output describes the 1–3 ordered influences and, where useful, their musical roles/routing. Do not emit invented numeric influence percentages.

The UI may show Foundation/Fusion/Accent labels even when the compiled wording is more natural.

## BPM and Groove

BPM and Groove remain separate sections.

BPM communicates numeric/felt tempo where intentionally specified.

Groove communicates time organization: pocket, swing, subdivision, syncopation, backbeat, perceived half/double time, etc.

## Key/Mode

Use `[Key/Mode: ...]` only when known, selected, or musically justified. Do not fabricate a key merely to fill the prompt.

## Exclude

Exclude is **not part of the bracketed style prompt**.

It is a separate copy surface containing a plain comma-separated list:

```text
bright glossy pop synths, competing lead instruments, cavernous drum reverb
```

Rules:

- no brackets;
- no `Exclude:` prefix;
- no `[Exclude: ...]` line;
- empty Exclude produces an empty separate output;
- individual exclusions remain semantic items internally even though the copied representation is comma-delimited.

## Rendering and UI decoration

The visible output may decorate known terms with the Prompt V'gine inline dictionary and may show temporary replacement/highlight states.

The copied text remains exactly the clean renderer output.

## Renderer versioning

This contract is renderer profile `suno-structured-v1`.

A future Suno format change creates a new renderer profile/version. It must not require rewriting MusicSpec or curated musical knowledge.


## Source-derived soft section targets

For `suno-structured-v1`, the compiled renderer profile stores the current
Factory P90 full-line lengths as soft targets:

`Genre 56 · Era 49 · BPM 10 · Key/Mode 25 · Groove 106 · Melody 110 · Harmony 97 · Drums 94 · Bass 89 · Instruments 107 · Exciters 80 · Texture 88 · Dynamics 87 · Space/Mix 107 · Production 120 · Structure 96`.

Vocal has no source-derived target in the current snapshot because no structured
Vocal rows exist. A future Vocal budget requires separate curated/source evidence.

These values guide compression/allocation only. The global 1,000-character
ceiling is the actual renderer invariant.
