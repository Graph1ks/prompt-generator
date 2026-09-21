# Data Sources and Redistribution Boundary

## Local project Factory inputs

The current local build accepts:

- `GRAPH1KS_PUBLIC_VAULT_FACTORY.json.gz`
- `GRAPH1KS_GENRE_MAP_FACTORY.json`

These files are owner-local build inputs. They are intentionally excluded from Git, GitHub Actions, public fixtures, and release artifacts.

The repository records only schemas, deterministic build/mining tooling, synthetic fixtures, and safe aggregate findings.

## Generated local data

The following are generated/local artifacts and are not public repository source:

- `corpus.sqlite`
- `curation.sqlite`
- `knowledge.sqlite`
- local build checkpoints;
- local reports;
- local backups;
- future runtime data bundles.

## Licensing/provenance rule

Public availability of a source is not sufficient permission to redistribute or commercialize it.

Before any external dataset, corpus, model, font, icon set, media asset, or other third-party material becomes part of a shipped Prompt V'gine distribution, record:

- authoritative source;
- exact license/terms;
- commercial-use status;
- redistribution rights;
- attribution/NOTICE requirements;
- database/share-alike obligations where applicable;
- update method and version/snapshot;
- whether derived data inherits restrictions.

Unknown or unclear rights mean **not approved for shipping yet**.

## Graph1ks license boundary

The repository root LICENSE applies only to Graph1ks Material. It does not override or sublicense third-party rights.
