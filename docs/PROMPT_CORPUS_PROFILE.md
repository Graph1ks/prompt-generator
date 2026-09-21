# Prompt V'gine — Prompt Corpus Baseline Profile

**Source snapshot analyzed:** `GRAPH1KS_PUBLIC_VAULT_FACTORY.json.gz` + `GRAPH1KS_GENRE_MAP_FACTORY.json` supplied for the project.  
**Purpose:** architecture baseline, not a frozen product dataset.  
**Generated databases remain local-only.**

## 1. Corpus scale

| Metric | Count |
|---|---:|
| Vault tracks | 10,043 |
| Parsed structured-prompt sections | 115,736 |
| Structured-prompt tokens | 852,459 |
| Raw structured section labels | 23 |
| Distinct section-order sequences | 98 |
| Negative/exclude item occurrences | 100,235 |
| Unique normalized negative/exclude items | 4,802 |
| Vault `genre` labels | 344 |
| Taxonomy Major Genres | 24 |
| Taxonomy genres/subgenres | 1,564 |

All structured prompt lines in the inspected snapshot matched the `[Header: content]` grammar; no malformed lines were observed in the baseline pass.

## 2. Section coverage and uniqueness

| Canonical section | Rows | Unique values | Repeated-value share |
|---|---:|---:|---:|
| Genre | 10,043 | 8,854 | 11.84% |
| Key/Mode | 10,043 | 378 | 96.24% |
| Melody | 10,043 | 10,005 | 0.38% |
| BPM | 10,040 | 247 | 97.54% |
| Bass | 10,036 | 9,738 | 2.97% |
| Harmony | 9,956 | 9,866 | 0.90% |
| Instruments | 9,882 | 9,478 | 4.09% |
| Space/Mix | 9,761* | 9,717 | 0.45% |
| Drums | 9,362 | 9,218 | 1.54% |
| Era | 9,226 | 2,467 | 73.26% |
| Groove | 9,016 | 8,944 | 0.80% |
| Production | 4,459 | 4,422 | 0.83% |
| Texture | 2,915 | 2,904 | 0.38% |
| Dynamics | 747 | 710 | 4.95% |
| Emotion | 120 | 69 | 42.50% |
| Meter | 34 | 11 | 67.65% |
| Exciters | 20 | 20 | 0% |
| Structure | 16 | 16 | 0% |
| Density | 12 | 12 | 0% |
| BPM/Meter | 3 | 3 | 0% |
| Low End | 1 | 1 | 0% |
| Meter/Groove | 1 | 1 | 0% |

`*` The raw source has 9,760 `Space/Mix` rows plus one legacy `Mix` row; both normalize to the `space_mix` canonical key.

### Architectural consequence

BPM, Key/Mode and much of Era are naturally parameter-like. Melody, Harmony, Groove, Drums, Bass, Instruments, Texture, Space/Mix and Production are overwhelmingly unique sentences. Therefore the UI must **not** simply expose every full source sentence as a selectable option.

Those sections should be mined into concepts, phrase patterns, parameters, and curated combinations while retaining the original source sentence as evidence.

## 3. Raw section-label variants

Observed raw labels:

- Genre
- Era
- BPM
- BPM/Meter
- Meter
- Meter/Groove
- Key/Mode
- Groove
- Melody
- Harmony
- Drums
- Bass
- Low End
- Instruments
- Exciters
- Texture
- Emotion
- Density
- Dynamics
- Space/Mix
- Mix
- Production
- Structure

The evidence DB preserves these labels. Product rendering uses a versioned canonical subset and does not silently erase legacy information.

## 4. Strong lexical domains already visible

Examples of high-frequency section vocabulary from the actual corpus:

### Groove

`pulse`, `backbeat`, `straight`, `syncopated`, `pocket`, `slow`, `steady`, `accents`, `kick`, `percussion`, `snare`, `half-time`, `swing`.

### Melody

`guitar`, `motif`, `carries`, `piano`, `hook`, `electric`, `synth`, `descending`, `riff`, `answers`, `phrase`, `rising`, `lead`, `contour`.

### Harmony

`major-key`, `progression`, `minor`, `movement`, `color`, `suspended`, `loop`, `dominant`, `tension`, `chord`, `chromatic`, `cadences`, `modal`, `voicings`.

### Drums

`snare`, `kick`, `kit`, `acoustic`, `hats`, `fills`, `restrained`, `percussion`, `soft`, `cymbal`, `dry`, `crisp`, `sparse`, `tight`, `electronic`, `punchy`, `programmed`, `clap`.

### Bass

`electric bass`, `roots`, `short`, `notes`, `synth bass`, `syncopated`, `movement`, `sustained`, `kick`, `upright bass`, `octave`, `sub`.

### Space/Mix

`centered`, `dry`, `wide`, `low end`, `depth`, `foreground`, `stereo`, `upper`, `mids`, `narrow`, `width`, `transients`, `ambience`.

### Production

`polished`, `studio`, `controlled`, `transients`, `clean`, `dynamic`, `arrangement`, `warm`, `precise`, `separation`, `attack`, `contrast`.

These are *candidate vocabulary families*, not automatically approved glossary entries.

## 5. Example term distribution: why context matters

The corpus already shows that the same word belongs to different contexts.

`transient` (singular) occurs in the baseline index approximately as follows:

| Section | Occurrences |
|---|---:|
| Space/Mix | 341 |
| Production | 171 |
| Texture | 33 |
| Drums | 15 |
| Era | 10 |
| Groove | 1 |

`grit` occurs primarily in Texture and Production, but also appears in Space/Mix and a few other contexts.

This directly supports the knowledge-layer design: a global definition is not enough; the product needs section/context explanations.

## 6. Repeated phrase evidence

High-frequency phrases demonstrate useful building blocks but also show why raw n-grams require curation.

Examples:

- Drums: `acoustic kit`, `kick and snare`, `dry snare`, `crisp snare`;
- Bass: `electric bass`, `synth bass`, `upright bass`;
- Space/Mix: `low end`, `centered low end`, `rhythm section`, `low mids`, `dry center`;
- Groove: `rock pulse`, `syncopated kick`.

Other high-frequency n-grams such as `carries a`, `pulse with`, or `and snare` are grammatical scaffolding, not useful concepts. Candidate mining must score/filter and then curate rather than promoting frequency directly into UI options.

## 7. Negative / Exclude corpus

Every Vault track in the analyzed snapshot has a negative prompt. The data is already naturally comma-delimited and aligns with the product decision to keep Exclude separate from the structured prompt.

Very common exclusions include:

- vocals;
- singing;
- spoken word;
- vocal chops;
- narration;
- choir;
- ad-libs;
- vocal samples;
- trap hats;
- oversized cinematic percussion;
- huge reverb;
- bright supersaws.

This corpus can seed candidate exclude entries, but variants/synonyms should be normalized into concepts before product exposure.

## 8. Genre taxonomy/crosswalk baseline

Taxonomy:

- 24 Major Genres;
- 1,564 unique genre/subgenre records;
- 1,149 genres belong to one Major Genre;
- 344 belong to two;
- 71 belong to three.

The Vault has 344 distinct `genre` labels:

| Crosswalk status | Labels | Tracks represented |
|---|---:|---:|
| Exact taxonomy label | 193 | 8,515 |
| Conservative normalized match | 13 | 690 |
| Unmatched / needs curation | 138 | 838 |

Thus 9,205 of 10,043 tracks are covered by exact or conservative-normalized label mapping, while 838 tracks use labels requiring explicit alias/composite decisions.

Examples among unresolved labels include `Synth-Pop`, `R&B/Soul`, `New Wave`, `Pop Soul`, `Instrumental Rock`, `Soul Pop`, and `Pop R&B`.

Do **not** silently collapse these labels. Some are spelling aliases, some are composites, some may expose genuine taxonomy gaps, and some should map to multiple influences rather than one genre ID.

## 9. Important gaps in the current corpus

The structured prompts are strong for core instrumental/production facets, but coverage is not uniform:

- Vocal sections are absent in this snapshot;
- Exciters are extremely sparse;
- Dynamics has limited coverage relative to core sections;
- Structure appears in only a handful of structured prompts even though `instrumental_arrangement` contains rich arrangement information;
- Texture and Production are present only in subsets of the corpus.

Therefore future Vocal/Exciter/Structure vocabularies must not be fabricated merely by stretching sparse evidence. They need separate curated/source enrichment.

## 10. v1 extraction conclusion

The source corpus is best treated as **evidence for a semantic model**, not as the runtime option list.

The correct next extraction layers are:

1. normalize/crosswalk genre identity;
2. identify instruments vs descriptors vs actions/behaviors;
3. identify section-specific concepts and values;
4. mine repeatable phrase patterns;
5. curate Easy statements from coherent combinations;
6. map Advanced parameters/options to those concepts;
7. write beginner/context definitions;
8. derive genre traits only when evidence is sufficient and clearly label defaults as suggestions rather than rules.
