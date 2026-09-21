# Prompt V'gine — Local Data Architecture

**Status:** v1 foundation  
**Hard rule:** raw factories, generated databases, generated indexes, and compiled runtime data stay local and are not committed to GitHub.

## 1. Why this is split from application source

The repository must contain the reproducible *machinery* for building Prompt V'gine's data layer, not the data layer itself. This protects repository size, data-policy flexibility, updateability, and the ability to rebuild from newer factories without treating a generated SQLite file as source code.

Tracked in GitHub:

- schemas;
- deterministic importer/miner code;
- migrations/version contracts;
- UI/product architecture;
- validation logic;
- tiny synthetic fixtures;
- documentation;
- safe aggregate baseline findings when useful.

Local-only:

- `GRAPH1KS_PUBLIC_VAULT_FACTORY.json.gz`;
- `GRAPH1KS_GENRE_MAP_FACTORY.json` when used as a build input;
- future source packs/corpora;
- `corpus.sqlite`;
- `knowledge.sqlite`;
- runtime SQLite/JSON/search bundles;
- generated corpus reports and intermediate indexes.

## 2. Data products

### A. `corpus.sqlite` — evidence/mining database

Purpose: answer questions about the source corpus without forcing the runtime product to carry 10k source prompts.

Contains:

- source fingerprints and schema versions;
- track metadata and original structured prompts;
- every parsed prompt section and clause;
- normalized token-by-section statistics;
- genre-by-section token statistics;
- repeated n-gram/phrase candidates;
- negative/exclude items and occurrences;
- raw genre taxonomy and many-to-many Major Genre relationships;
- conservative Vault→taxonomy crosswalk candidates;
- full-text section search;
- optional deep positional token index.

This database is build-time evidence. It is not a runtime dependency.

### B. `knowledge.sqlite` — canonical curated knowledge database

Purpose: represent the concepts the product understands.

Contains:

- genres and Major Genres;
- aliases;
- dictionary/knowledge entries;
- term variants used for inline highlighting;
- beginner definitions and context definitions;
- concept relations;
- instruments/families/aliases;
- parameters and parameter options;
- Easy-mode statements/combinations;
- genre and instrument traits;
- prompt section definitions;
- renderer profiles;
- exclude entries;
- provenance/version information.

The initial bootstrap imports the authoritative 24 Major Genres and 1,564 taxonomy genres as knowledge entities. It does **not** pretend to have high-quality definitions for every genre yet. Definitions are a separate curation state.

### C. Runtime bundles — generated from approved knowledge

Future local build products may include:

- `runtime.promptvgine.sqlite` for native/Tauri/server usage;
- static web search/data shards for browser/PWA usage;
- compact renderer/option manifests.

These are generated artifacts, not source-of-truth files.

## 3. Pipeline

```text
LOCAL SOURCE PACKS
      │
      ▼
[1] Preflight / fingerprint
      │  schema + version + SHA-256
      ▼
[2] Lossless ingest
      │  preserve raw text and ordering
      ▼
[3] Deterministic normalization
      │  normalized lookup forms; never overwrite raw
      ▼
[4] Structural extraction
      │  sections → clauses → tokens / negative items
      ▼
[5] Corpus mining
      │  usage stats, n-grams, co-occurrence, candidates
      ▼
[6] Crosswalk / curation
      │  aliases, concepts, definitions, approved options
      ▼
[7] Knowledge DB
      │
      ▼
[8] Runtime compile
      │  native DB + web shards
      ▼
[9] Validation / report
```

Every lossy decision must happen **after** raw evidence is preserved.

## 4. Source-pack contract

Every local input is treated as a versioned source pack with:

- source kind;
- schema identifier;
- source version/taxonomy version;
- exported/generated timestamp when available;
- SHA-256;
- importer/extraction-rule version.

A rebuild can therefore answer: “Which exact source and rules produced this database?”

Future factory updates must not silently change meaning. The preflight stage rejects unsupported schema IDs; a new schema gets an explicit importer/migration path.

## 5. Prompt-section handling

The importer preserves the raw header and also maps it to a canonical section key.

Current corpus contains 23 raw header labels, including legacy/compound variants such as:

- `BPM/Meter`;
- `Meter/Groove`;
- `Mix`;
- `Low End`;
- `Emotion`;
- `Density`.

These are not deleted or rewritten in the evidence store. The v1 renderer intentionally emits the narrower product contract:

`Genre → Era → BPM → Key/Mode → Groove → Melody → Harmony → Drums → Bass → Instruments → Exciters → Texture → Vocal → Dynamics → Space/Mix → Production → Structure`.

Unknown future source headers are retained as `unknown:<slug>` rather than being silently dropped.

## 6. Text normalization policy

Store both forms:

- `*_raw`: exact source wording;
- `*_norm`: deterministic Unicode/case/whitespace-normalized lookup form.

For taxonomy matching, a separate lookup normalization may remove diacritics/punctuation and normalize `&` to `and`. This representation is for candidate matching only; it is never rendered back to the user.

Do not stem/lemmatize destructively. If later linguistic enrichment is added, lemma/stem is an additional field with provenance.

## 7. Phrase mining

The corpus is highly generative: most Melody, Harmony, Groove, Drums, Bass, Space/Mix and Production section texts are unique. Therefore exact full sentences are poor primary UI options.

Mining should focus on:

- high-value words/concepts;
- stable multiword phrases;
- section-specific usage;
- co-occurring concept combinations;
- patterns that can become curated Easy statements;
- parameter/value candidates for Advanced mode.

`phrase_candidate` stores repeated 2–5-gram evidence (minimum frequency currently 3). Unique text remains queryable from raw sections/full-text search and does not need a dedicated n-gram row.

## 8. Word/term usage model

The corpus DB supports the questions required for curation:

- Where does `grit` occur?
- Is `transient` primarily Mix, Production, Texture, or Drums language?
- Which terms dominate the Bass section?
- Which words are associated with a specific Vault genre inside Groove vs Harmony?
- Which recurring phrases are section-specific?
- What source examples support a candidate definition/option?

Core evidence tables:

- `token_section_stat`;
- `genre_section_token_stat`;
- `phrase_candidate`;
- `prompt_section_fts`;
- `section_value_stat`.

The optional `--deep-token-index` persists every token offset when exact positional research is necessary. It is deliberately opt-in because the normal FTS/statistical index is much smaller and sufficient for most work.

## 9. Genre identity and crosswalk

The taxonomy is canonical for browsing:

- 24 Major Genres;
- 1,564 unique genre/subgenre entities;
- many-to-many genre→Major Genre mapping.

The Vault metadata has 344 distinct `genre` labels and does not perfectly share the same naming vocabulary.

Crosswalk policy:

1. exact label match → safe candidate;
2. normalized exact match → safe candidate;
3. heuristic/composite match → never silently approve;
4. unmatched → explicit curation queue.

The current bootstrap resolves 193 labels exactly and another 13 through conservative normalization; 138 Vault genre labels remain deliberately unresolved. This is a feature, not a failure: aliases/composites such as `Pop Soul` or `R&B/Soul` require an explicit semantic decision.

## 10. Stable identity and rename strategy

Do not use display labels as long-term identity without an escape hatch.

Bootstrap IDs are deterministic from names so a clean rebuild is reproducible. Future curated renames must use an identity override/alias migration so a spelling correction does not accidentally create a new concept and orphan user data.

The knowledge model supports:

- aliases;
- deprecated entries;
- replacement links;
- provenance;
- schema migrations.

## 11. Knowledge lifecycle

Every knowledge item has a status:

- `candidate` — mined/imported; not automatically trusted as UI knowledge;
- `reviewed` — examined but not necessarily ready for all runtime surfaces;
- `approved` — safe for product use;
- `deprecated` — retained for identity/history but not offered normally.

Imported taxonomy labels can be approved as *identities* while their definitions remain draft/missing. Approval is field/content-specific; “genre exists” is different from “genre explanation is curated.”

## 12. Definitions and localization

Definitions are normalized content, not baked into controls.

The schema supports per-locale rows from day one. English may ship first; German can be added without changing entity IDs or parameter logic.

Definition types include:

- one-line summary;
- plain definition;
- why it matters;
- hear-it-as analogy;
- misconception;
- expert note;
- context-specific definition.

The third dictionary layer—“what is this doing in *your* current prompt?”—is generated from current MusicSpec state and is not a static database sentence.

## 13. Easy statements vs Advanced atoms

`statement` stores curated phrases/combinations used by Easy mode. A statement may link to:

- concepts;
- parameter options;
- source evidence/provenance.

Advanced mode exposes `parameter` and `parameter_option` directly and permits custom text where allowed.

This avoids two separate prompt systems. Both modes write the same semantic state.

## 14. Renderer independence

The database stores semantic state and renderer configuration separately.

A renderer profile defines:

- section order;
- output header labels;
- empty-section behavior;
- renderer version.

Suno structured v1 is only one renderer profile. A future Suno format change should require a renderer migration, not a rewrite of the knowledge model.

Exclude remains a separate output channel and is not represented as a normal structured prompt section.

## 15. Update strategy

For every new source release:

1. place new factories in a local source directory;
2. run preflight and compare hashes/schema versions;
3. build a new DB into a new temporary output directory;
4. compare corpus profile against previous build;
5. inspect new/removed headers, genres, aliases, high-frequency term changes, and unmatched crosswalk entries;
6. apply reviewed curation/migration rules;
7. validate foreign keys, uniqueness, renderer contract, and search indexes;
8. atomically replace the previous local generated artifacts only after success.

Never mutate the only good DB in place during source ingestion.

## 16. Local command contract

Initial build:

```bash
python scripts/data/build_local_data.py \
  --vault /path/to/GRAPH1KS_PUBLIC_VAULT_FACTORY.json.gz \
  --genre-map /path/to/GRAPH1KS_GENRE_MAP_FACTORY.json \
  --out-dir .local-data/v1 \
  --force
```

Optional exact positional token index:

```bash
python scripts/data/build_local_data.py \
  --vault /path/to/GRAPH1KS_PUBLIC_VAULT_FACTORY.json.gz \
  --genre-map /path/to/GRAPH1KS_GENRE_MAP_FACTORY.json \
  --out-dir .local-data/v1-deep \
  --deep-token-index \
  --force
```

Corpus inspection:

```bash
python scripts/data/query_corpus.py --db .local-data/v1/corpus.sqlite term grit
python scripts/data/query_corpus.py --db .local-data/v1/corpus.sqlite term transient
python scripts/data/query_corpus.py --db .local-data/v1/corpus.sqlite section drums
python scripts/data/query_corpus.py --db .local-data/v1/corpus.sqlite genre "Hip-Hop"
python scripts/data/query_corpus.py --db .local-data/v1/corpus.sqlite unmatched-genres
```

## 17. Runtime/platform strategy

The canonical knowledge model must support three deployment shapes without changing semantics:

- **Web/PWA:** locally compiled static data/search shards loaded on demand;
- **Tauri/native:** compact runtime SQLite or compiled bundles;
- **Server/self-hosted:** the same compiled model can be loaded server-side.

The heavy corpus/evidence DB is never required for ordinary app use.
