# Graph1ks Prompt V'gine

**Virtual Prompt Engine** — a visual music-specification editor that builds structured Suno prompts while explaining the musical language it uses.

## Status

**Stage:** architecture/data foundation  
**Repository mode:** public owner-controlled / solo-dev  
**License:** source-available / noncommercial for third parties; commercial rights reserved to Graph1ks

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

On Windows/PowerShell, first run the read-only plan:

```powershell
py scripts\data\build_local_data.py --vault ".local-data\source\GRAPH1KS_PUBLIC_VAULT_FACTORY.json.gz" --genre-map ".local-data\source\GRAPH1KS_GENRE_MAP_FACTORY.json" --out-dir ".local-data\current" --plan
```

Then build or resume with the same sources:

```powershell
py scripts\data\build_local_data.py --vault ".local-data\source\GRAPH1KS_PUBLIC_VAULT_FACTORY.json.gz" --genre-map ".local-data\source\GRAPH1KS_GENRE_MAP_FACTORY.json" --out-dir ".local-data\current"
```

The build is checkpointed and resumable; ordinary reruns resume safely. It creates/adopts local `corpus.sqlite`, preserves durable `curation.sqlite`, compiles `knowledge.sqlite`, and keeps incomplete work isolated until validation/promotion.

Then validate/inspect it:

```bash
python scripts/data/query_corpus.py --db .local-data/current/corpus.sqlite term grit
python scripts/data/query_corpus.py --db .local-data/current/corpus.sqlite section drums
python scripts/data/query_corpus.py --db .local-data/current/corpus.sqlite unmatched-genres
python scripts/data/query_curation.py --db .local-data/current/curation.sqlite queue --type genre_crosswalk
python scripts/data/validate_local_data.py --dir .local-data/current
```

Before bulk curation or schema work:

```bash
python scripts/data/backup_curation.py --source .local-data/current/curation.sqlite
```

When Factory files change, build a second snapshot and compare it with `scripts/data/diff_local_data.py`.

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
8. `docs/CURATION_WORKFLOW.md`
9. `docs/MUSICSPEC_V1.md`
10. `docs/PROMPT_FORMAT.md`

Then inspect the current Git state and run the relevant fixture/local verification before changing code.

## Repository layout

```text
schema/                 local SQLite schema definitions
scripts/data/           local-only build/mining/query tools
data/fixtures/          tiny synthetic test inputs only
docs/                   product, data, continuity, licensing docs
```

## Security / cost / licensing

The core path must remain zero-cost and local/static-capable. No paid API, cloud database, or model service is required for the current design.

Graph1ks Material is source-available for noncommercial use under the repository `LICENSE`. Third-party monetization—including project-connected donations/tips—is prohibited; commercial rights in Graph1ks Material are reserved to Graph1ks. See `LICENSE`, `COMMERCIAL_LICENSE.md`, `LICENSES.md`, `PROJECT.md`, and `docs/LICENSING.md`.
