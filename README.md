# Graph1ks Prompt V'gine

**Virtual Prompt Engine** — a visual music-specification editor that builds structured Suno prompts while explaining the musical language it uses.

## Status

**Stage:** architecture/data foundation  
**Repository mode:** public owner-controlled / solo-dev  
**License:** undecided

## Product direction

Prompt V'gine is designed around:

- one to three draggable Genre Influences (Foundation / Fusion / Accent);
- Easy mode with curated musical statements;
- Advanced mode with granular controls and custom text;
- a shared semantic MusicSpec beneath both modes;
- site-wide inline explanations for genres, instruments, production terms, descriptors, and generated prompt language;
- source-compatible structured prompt output such as `[Genre: ...]`, `[BPM: ...]`, `[Groove: ...]`;
- separate comma-delimited Exclude output;
- local/offline-first data and zero required paid services.

See `docs/PRODUCT_UX_FOUNDATION.md` for the accepted UX foundation.

## Local data rule

**Real source factories and generated databases do not belong in this repository.**

The repo stores schemas, deterministic build/mining tools, documentation, and tiny synthetic fixtures. Build the data locally:

```bash
python scripts/data/build_local_data.py \
  --vault /path/to/GRAPH1KS_PUBLIC_VAULT_FACTORY.json.gz \
  --genre-map /path/to/GRAPH1KS_GENRE_MAP_FACTORY.json \
  --out-dir .local-data/current \
  --force
```

Then inspect it:

```bash
python scripts/data/query_corpus.py --db .local-data/current/corpus.sqlite term grit
python scripts/data/query_corpus.py --db .local-data/current/corpus.sqlite section drums
python scripts/data/query_corpus.py --db .local-data/current/corpus.sqlite unmatched-genres
```

See `docs/LOCAL_DATA_BUILD.md` and `docs/DATA_ARCHITECTURE.md`.

## Current source baseline

The initial architecture was validated against the project-provided snapshot containing:

- 10,043 Vault tracks;
- 115,736 parsed structured prompt sections;
- 852,459 structured-prompt tokens;
- 24 Major Genres;
- 1,564 taxonomy genres/subgenres.

The database itself is not committed. Aggregate architecture findings are recorded in `docs/PROMPT_CORPUS_PROFILE.md`.

## Development read order

1. `AGENTS.md`
2. `PROJECT.md`
3. `STATUS.md`
4. `docs/HANDOVER.md`
5. `docs/PRODUCT_UX_FOUNDATION.md`
6. `docs/DATA_ARCHITECTURE.md`
7. `docs/KNOWLEDGE_LAYER.md`

Then inspect the current Git state and run the relevant fixture/local verification before changing code.

## Repository layout

```text
schema/                 local SQLite schema definitions
scripts/data/           local-only build/mining/query tools
data/fixtures/          tiny synthetic test inputs only
docs/                   product, data, continuity, licensing docs
```

## Security / cost / licensing

The core path must remain zero-cost and local/static-capable. No paid API, cloud database, or model service is required for the current design. See `AGENTS.md`, `PROJECT.md`, `SECURITY.md`, and `docs/LICENSING.md`.
