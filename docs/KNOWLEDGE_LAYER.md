# Prompt V'gine — Knowledge Layer and Inline Dictionary

## Purpose

Prompt V'gine should let a user read musical language without already being a producer. The application therefore owns a semantic dictionary that can recognize and explain terms wherever they appear—in controls, genre descriptions, instruments, option labels, and the generated prompt itself.

This is not a field-help system and not a tooltip collection. It is a structured knowledge graph with runtime term matching.

## 1. What can be a knowledge entry

Examples of `entry_type`:

- `genre` / `major_genre`;
- `instrument` / `instrument_family`;
- `rhythm_concept`;
- `harmony_concept`;
- `melody_concept`;
- `production_term`;
- `mix_term`;
- `dynamics_term`;
- `texture_term`;
- `vocal_term`;
- `articulation`;
- `envelope_term`;
- `descriptor`;
- `technique`;
- `structure_term`.

One canonical concept can have many surface forms. `transient`, `transients`, and `transient-forward` can point to one concept while keeping surface-specific context when needed.

## 2. Definition contract

A useful beginner definition answers a concrete question before using specialist vocabulary.

Bad:

> Low-end architecture: source, register, attack, sustain, movement and relationship with the kick.

This merely replaces one unknown term with several more.

Better for `Attack`:

> Attack is how quickly a sound becomes loud after the note starts. A fast attack feels immediate and punchy; a slower attack fades in more gently.

Bass context:

> On a bass sound, attack affects whether the bass strikes at the same moment as the kick or sits more softly behind it.

Every approved entry should aim to provide:

1. **One-liner** — fast answer in plain language.
2. **Plain definition** — still beginner-readable, slightly fuller.
3. **Why it matters** — audible consequence.
4. **Context definition(s)** — section/parameter/instrument/genre-specific meaning.
5. **Hear it as** — analogy/comparison when genuinely useful.
6. **Misconception** — optional correction of a common false assumption.
7. **Expert note** — optional detail that should not pollute the beginner explanation.

Do not force every field to exist. Missing honest content is better than filler.

## 3. Examples

### Grit

One-liner:

> Audible roughness or “dirt” in a sound instead of a perfectly clean, smooth surface.

Production context:

> Adding subtle grit can make a clean recording feel rougher, older, more physical, or more aggressive without turning it into obvious heavy distortion.

### Transient

One-liner:

> The very short beginning of a sound—the first click or punch before the rest of the sound develops.

Drums context:

> Stronger/sharper drum transients make a kick or snare feel more immediate and punchy. Softer transients make the hit rounder.

### Swing

One-liner:

> A timing feel where some notes are intentionally delayed relative to a perfectly even grid, making the rhythm roll or bounce instead of feeling mechanical.

Current-project interpretation example:

> Here, light swing supports the laid-back Boom Bap pocket without making the beat feel heavily shuffled.

## 4. Genre and subgenre knowledge

Genres are dictionary entries too.

A genre definition should separate:

- what the genre broadly is;
- the musical characteristics commonly associated with it;
- what is *not automatically implied*;
- related/subgenre/parent relationships;
- the current Prompt V'gine role when used in a blend.

Do not turn stereotypes into requirements. Example: Boom Bap may often be associated with samples and older production aesthetics, but selecting Boom Bap must not silently force vinyl crackle or lo-fi production.

For a genre blend, Prompt V'gine can provide a generated explanation of the combination:

- **Foundation** — what musical grammar this influence currently supplies;
- **Fusion** — which additional language is being integrated;
- **Accent** — which texture/production/color cues are being borrowed.

The combination explanation is generated from the actual routing/state, not stored as one prewritten sentence for every possible combination.

## 5. Runtime term matching

Recommended matching order:

1. normalize only for lookup; preserve rendered text;
2. collect candidate `term_variant` matches;
3. prefer the **longest valid phrase** (`Dark Jazz` before `Jazz`);
4. use section/context scope to disambiguate overloaded surfaces;
5. use explicit match priority as a final deterministic tie-breaker;
6. avoid overlapping highlights;
7. normally highlight only the first occurrence of the same entry inside one compact block.

The rendered/copyable string is never modified. The UI renders a decorated token/span layer over the plaintext representation.

## 6. Ambiguity

A surface may mean different things in different contexts. Do not force one global definition when context can resolve it.

Examples:

- `attack` as envelope behavior vs an aggressive performance description;
- `house` as genre vs ordinary English word;
- `break` as structural section vs drum break;
- instrument names that overlap with ordinary nouns.

`term_variant` identifies possible concepts; context and section determine the preferred entry.

If ambiguity cannot be resolved safely, the UI may offer two meanings rather than confidently displaying the wrong one.

## 7. Guidance levels

Dictionary marking is user-configurable:

- **Beginner:** broad musical terminology and genres are highlighted;
- **Standard:** specialist terminology and less-obvious genres/instruments;
- **Expert:** uncommon/specialized terms only;
- **Off:** no inline markers.

Definition data remains available to explicit search even when markers are off.

## 8. Relationship graph

`knowledge_relation` supports typed links such as:

- `broader_than` / `narrower_than`;
- `related_to`;
- `often_used_with`;
- `opposite_of`;
- `often_confused_with`;
- `derived_from`;
- `genre_influence`;
- `instrument_family`;
- `describes`.

Relations are curated/evidence-backed, not inferred as truth merely because two words co-occur once.

## 9. Evidence and provenance

The corpus is evidence, not an oracle.

For a mined candidate term/phrase we should be able to inspect:

- source section(s);
- occurrence/track counts;
- example contexts;
- genre-conditioned usage;
- source factory hash/version;
- extraction rule version.

Curators can therefore distinguish a stable musical concept from an accidental wording habit in one prompt.

## 10. Localized knowledge

Entity identity is language-independent. Definitions and term variants carry a locale.

This permits:

- English term with English explanation;
- English term with German explanation;
- German UI alias for an English production term;
- locale-specific examples without duplicating the concept.

## 11. Current-project explanation

The third layer should be assembled at runtime from MusicSpec, not hardcoded.

Example inputs:

- concept: `transient`;
- section: `drums`;
- option: `sharp`;
- Foundation genre: Boom Bap;
- Bass: sustained/round.

Generated explanation can say:

> In this prompt the drums are given a sharper initial hit, which helps them stay defined against the rounder sustained bass.

This layer must remain deterministic/explainable where possible. It should not require a paid model/API for core functionality.
