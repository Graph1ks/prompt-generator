# Local Data Build

Prompt V'gine databases are generated locally and must not be committed to GitHub.

## Requirements

- Python 3.11+ recommended;
- no third-party Python packages required for the v1 bootstrap;
- SQLite comes from Python's standard library.

## Build

```bash
python scripts/data/build_local_data.py \
  --vault /absolute/or/relative/path/GRAPH1KS_PUBLIC_VAULT_FACTORY.json.gz \
  --genre-map /absolute/or/relative/path/GRAPH1KS_GENRE_MAP_FACTORY.json \
  --out-dir .local-data/current \
  --force
```

Output:

```text
.local-data/current/
  corpus.sqlite
  knowledge.sqlite
  reports/
    corpus-profile.json
```

All of `.local-data/` is ignored by Git.

## Optional deep positional token index

Normal mining/search does not need one database row per token. If exact token offsets are needed:

```bash
python scripts/data/build_local_data.py \
  --vault /path/GRAPH1KS_PUBLIC_VAULT_FACTORY.json.gz \
  --genre-map /path/GRAPH1KS_GENRE_MAP_FACTORY.json \
  --out-dir .local-data/deep \
  --deep-token-index \
  --force
```

Expect a larger/slower build.

## Query examples

```bash
python scripts/data/query_corpus.py --db .local-data/current/corpus.sqlite term grit
python scripts/data/query_corpus.py --db .local-data/current/corpus.sqlite term transient
python scripts/data/query_corpus.py --db .local-data/current/corpus.sqlite section drums
python scripts/data/query_corpus.py --db .local-data/current/corpus.sqlite genre "Hip-Hop"
python scripts/data/query_corpus.py --db .local-data/current/corpus.sqlite unmatched-genres
```

## Safe rebuild workflow

Build into a new directory first. Do not overwrite the only known-good local DB while testing a new source version/importer.

Recommended:

```text
.local-data/
  builds/
    2026-09-21-a/
    2026-10-xx-b/
  current -> chosen build (optional local symlink/junction)
```

Compare `reports/corpus-profile.json` before promoting a new build.

## What belongs in GitHub

Allowed/tracked:

- `schema/*.sql`;
- `scripts/data/*.py`;
- synthetic fixtures;
- docs;
- migration/import logic.

Local-only:

- source factories;
- generated SQLite files;
- generated reports;
- generated runtime bundles;
- intermediate mining artifacts.
