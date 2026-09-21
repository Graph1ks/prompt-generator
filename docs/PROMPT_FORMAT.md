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
