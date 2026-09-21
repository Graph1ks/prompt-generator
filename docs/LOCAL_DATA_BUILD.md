# Local Data Build

Prompt V'gine source factories, generated databases, reports, and curation backups are **local-only**. GitHub contains only the reproducible schemas/tools/docs/tests.

## Requirements

- Python 3.11+ recommended;
- no third-party Python packages for the v1 data toolchain;
- SQLite through Python's standard library;
- local copies of the two Factory files.

## First build

From the repository root:

```bash
python scripts/data/build_local_data.py \
  --vault /path/to/GRAPH1KS_PUBLIC_VAULT_FACTORY.json.gz \
  --genre-map /path/to/GRAPH1KS_GENRE_MAP_FACTORY.json \
  --out-dir .local-data/current \
  --force
```

Outputs:

```text
.local-data/current/
  corpus.sqlite       # disposable evidence/mining DB
  curation.sqlite     # durable local human/AI-reviewed authoring state
  knowledge.sqlite    # disposable compiled knowledge DB
  reports/
    corpus-profile.json
```

**Important:** `--force` replaces only generated `corpus.sqlite` and `knowledge.sqlite`. It does not delete `curation.sqlite`.

## Validate

```bash
python scripts/data/validate_local_data.py --dir .local-data/current
```

This checks SQLite integrity plus core corpus/taxonomy/renderer/curation invariants.

## Inspect the corpus

Where a word is used:

```bash
python scripts/data/query_corpus.py --db .local-data/current/corpus.sqlite term grit
python scripts/data/query_corpus.py --db .local-data/current/corpus.sqlite term transient
```

Explore one prompt section:

```bash
python scripts/data/query_corpus.py --db .local-data/current/corpus.sqlite section drums
python scripts/data/query_corpus.py --db .local-data/current/corpus.sqlite candidates drums --min-count 20
```

Genre-conditioned vocabulary:

```bash
python scripts/data/query_corpus.py --db .local-data/current/corpus.sqlite genre "Boom Bap"
```

Unresolved Vault genre labels:

```bash
python scripts/data/query_corpus.py --db .local-data/current/corpus.sqlite unmatched-genres
```

Exclude vocabulary:

```bash
python scripts/data/query_corpus.py --db .local-data/current/corpus.sqlite exclude
```

Build profile:

```bash
python scripts/data/query_corpus.py --db .local-data/current/corpus.sqlite profile
```

## Optional deep token index

The normal build stores section/token/phrase statistics plus full-text search without one DB row per token occurrence. If exact positional token research becomes necessary:

```bash
python scripts/data/build_local_data.py \
  --vault /path/to/GRAPH1KS_PUBLIC_VAULT_FACTORY.json.gz \
  --genre-map /path/to/GRAPH1KS_GENRE_MAP_FACTORY.json \
  --out-dir .local-data/deep \
  --deep-token-index \
  --force
```

This is intentionally slower/larger.

## Curation lifecycle

`curation.sqlite` is the durable asset.

It stores reviewed/approved:

- knowledge entries;
- inline-dictionary term variants;
- beginner definitions and context definitions;
- semantic relations;
- explicit Vault genre crosswalk decisions;
- instruments/families/aliases;
- Advanced parameters/options;
- Easy statements/combinations;
- the local review queue.

The builder overlays this durable state onto a newly generated `knowledge.sqlite` every rebuild. This means Factory updates can replace evidence without destroying months of curation.

The initial build also seeds unresolved Vault genre labels into the local review queue. It does **not** flood curation with every repeated n-gram; phrase/word evidence stays queryable in `corpus.sqlite` until deliberately promoted.

## Back up curation before bulk work or schema changes

```bash
python scripts/data/backup_curation.py \
  --source .local-data/current/curation.sqlite \
  --out-dir .local-data/backups
```

The backup is integrity-checked and remains local/ignored by Git.

## Compare a future Factory update

Build the new source snapshot into a separate directory:

```bash
python scripts/data/build_local_data.py \
  --vault /path/to/new/GRAPH1KS_PUBLIC_VAULT_FACTORY.json.gz \
  --genre-map /path/to/new/GRAPH1KS_GENRE_MAP_FACTORY.json \
  --out-dir .local-data/next \
  --force
```

Then compare evidence snapshots:

```bash
python scripts/data/diff_local_data.py \
  --old .local-data/current/corpus.sqlite \
  --new .local-data/next/corpus.sqlite \
  --json .local-data/next/reports/source-diff.json
```

Review:

- added/removed/changed tracks;
- changed source prompt documents;
- genre additions/removals;
- Major Genre mapping changes;
- new/removed section labels;
- section-label count shifts.

Only after review should a new corpus snapshot become the working source.

## Safe update sequence

1. Back up `curation.sqlite`.
2. Build the new Factory snapshot separately.
3. Run validation.
4. Run the corpus diff.
5. Review new section labels and taxonomy changes.
6. Review new unresolved genre labels.
7. Reuse/copy the durable curation DB into the chosen working build directory.
8. Rebuild `knowledge.sqlite` so curation overlays the new evidence/taxonomy.
9. Validate again.

Never edit `corpus.sqlite` manually. Evidence changes belong in source inputs or extraction code.

## Test the tooling without real Factory data

```bash
python -m unittest discover -s tests -p "test_*.py" -v
```

Tests use invented synthetic data only.

## Repository boundary

Tracked:

- `schema/*.sql`;
- `scripts/data/*.py`;
- synthetic tests/fixture documentation;
- architecture/product docs.

Local-only:

- Factory exports;
- `corpus.sqlite`;
- `curation.sqlite`;
- `knowledge.sqlite`;
- backups;
- WAL/SHM files;
- generated reports;
- future runtime bundles.
