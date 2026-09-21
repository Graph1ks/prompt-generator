# Local Output Layout

**Status:** accepted local-operator layout  
**Date:** 2026-09-21

Prompt V'gine uses one predictable local output layout. Generated/local artifacts remain untracked.

## Canonical layout

```text
.local-data/
├── current/
│   ├── corpus.sqlite
│   ├── curation.sqlite
│   ├── knowledge.sqlite
│   ├── runtime-v1/
│   ├── reports/
│   ├── logs/
│   └── .build-v2/
└── backups/
```

### `current/reports/`

Human/AI-reviewable results only. **Flat directory; no topic subdirectories.**

Use descriptive domain prefixes:

- `corpus-profile.json`
- `database-foundation-acceptance-v1.json`
- `database-foundation-session-v1.json`
- `curation-genre-crosswalk-review-v1.json`
- `curation-genre-crosswalk-review-v1.csv`
- `curation-genre-crosswalk-decisions-v1.json`
- `curation-last-apply-receipt.json`
- `knowledge-instrument-candidates-v1.json`
- `knowledge-instrument-decomposition-v1.json`
- `knowledge-mining-summary-v1.json`
- `knowledge-completion-plan-v1.json`
- `knowledge-completion-batch-001-v1.json`
- `knowledge-last-curation-apply-receipt.json`
- `runtime-export-v1.json`

Decision bundles remain reports/review artifacts because they are durable human-reviewed inputs. They must never be silently overwritten during layout migration.

### `current/logs/`

Technical subprocess output only:

- build stdout/stderr;
- validation output;
- report-refresh output;
- recovery/recompile diagnostics.

Logs are not review reports and should not pollute `reports/`.

### `.local-data/backups/`

Durable safety copies, especially `curation.sqlite` backups. Backups intentionally live outside `current/` so replacing/rebuilding the current generated snapshot cannot remove them.

## Legacy layout migration

Older tooling created nested directories such as:

```text
reports/database/
reports/knowledge/
reports/curation/
reports/knowledge-completion/
reports/knowledge-completion/batches/
```

and the first Runtime Pack command could create `current/runtime-v1-export-report.json`.

Preview the safe migration:

```powershell
py scripts\data\normalize_local_output_layout.py --out-dir ".local-data\current"
```

Apply only after reviewing the plan:

```powershell
py scripts\data\normalize_local_output_layout.py --out-dir ".local-data\current" --apply
```

The migrator:

- never overwrites a different destination file;
- treats byte-identical duplicates as safe duplicates;
- aborts the whole apply if any conflicting destination exists;
- moves technical logs into `logs/`;
- removes legacy directories only when empty.

## Runtime export report

Normal Runtime Pack export now writes its machine-readable result automatically to:

```text
.local-data/current/reports/runtime-export-v1.json
```

`--report` is retained only as an explicit override.

## Rule for new tooling

New local tooling must choose exactly one of:

- report -> `current/reports/<domain>-<purpose>.<ext>`
- technical log -> `current/logs/<domain>-<purpose>.<ext>`
- safety backup -> `.local-data/backups/<purpose>...<ext>`
- generated product/runtime artifact -> its dedicated directory under `current/`

Do not create another report root or nested report taxonomy without an accepted architecture change.
