# Local Data Build

Prompt V'gine source factories, generated databases, checkpoints, reports, and curation backups are **local-only**. GitHub contains only reproducible schemas/tools/docs/tests.

The local build follows the same long-job safety standard used by RhymeLab: visible progress, persisted checkpoints, ordinary-rerun resume, source/build fingerprint binding, validation before promotion, and no implicit destruction of the last known-good data.

## Windows 11 / PowerShell — owner path

Assumed repository:

```text
D:\prompt-engine
```

Assumed local Factory files:

```text
.local-data\source\GRAPH1KS_PUBLIC_VAULT_FACTORY.json.gz
.local-data\source\GRAPH1KS_GENRE_MAP_FACTORY.json
```

### 1. Read-only plan

```powershell
py scripts\data\build_local_data.py --vault ".local-data\source\GRAPH1KS_PUBLIC_VAULT_FACTORY.json.gz" --genre-map ".local-data\source\GRAPH1KS_GENRE_MAP_FACTORY.json" --out-dir ".local-data\current" --plan
```

This fingerprints/inspects sources and current output state but does not create or replace build artifacts.

### 2. Build or resume

```powershell
py scripts\data\build_local_data.py --vault ".local-data\source\GRAPH1KS_PUBLIC_VAULT_FACTORY.json.gz" --genre-map ".local-data\source\GRAPH1KS_GENRE_MAP_FACTORY.json" --out-dir ".local-data\current"
```

**Run the same command again after a pause/crash/reboot.** It resumes from the last committed checkpoint when the source/build fingerprints still match.

There is no normal `--force` workflow anymore.


### Database foundation finalization — preferred owner workflow

After pulling a repository revision that changes database/compiler semantics, use one bundled phase instead of running build/validate/mining manually:

```powershell
Set-Location D:\prompt-engine
git pull
py scripts\data\database_foundation_session.py finalize --out-dir ".local-data\current" --vault ".local-data\source\GRAPH1KS_PUBLIC_VAULT_FACTORY.json.gz" --genre-map ".local-data\source\GRAPH1KS_GENRE_MAP_FACTORY.json"
```

This command:

- upgrades/recompiles generated knowledge without rebuilding a matching promoted corpus unnecessarily;
- preserves durable `curation.sqlite`;
- validates corpus, knowledge, and curation;
- verifies every source-backed Instruments expression is present in `knowledge.sqlite`;
- verifies every source-backed expression remains selectable;
- verifies the original expression output wording is preserved;
- refreshes knowledge-mining/decomposition reports;
- stores verbose subprocess output under `reports\database\`;
- prints one concise final terminal line.

Primary acceptance report:

```text
.local-data\current\reports\database\database-foundation-acceptance-v1.json
```

Do not paste detailed build/mining output into chat unless that acceptance phase fails.

### Acceptance-gated semantic completion — next database phase

Only after the acceptance report above says `status: ok`, prepare the next large semantic-review phase with one command:

```powershell
py scripts\\data\\knowledge_completion_session.py prepare --out-dir ".local-data\\current" --batch-size 250
```

This command is read-only with respect to the databases. It verifies the successful acceptance invariants, reconciles the accepted source/selectable/decomposition counts against the full instrument decomposition JSON + CSV, fails closed on stale/mismatched artifacts, groups residual semantic tokens, and writes bounded partial/unresolved review batches.

Local outputs:

```text
.local-data\\current\\reports\\knowledge-completion\\knowledge-completion-plan-v1.json
.local-data\\current\\reports\\knowledge-completion\\residual-token-groups-v1.csv
.local-data\\current\\reports\\knowledge-completion\\batches\\instrument-semantic-review-batch-###-v1.json
```

The batches contain exact source expression wording plus current resolved instrument/concept IDs, residual tokens, coverage, occurrence/track evidence, and deterministic **review priority**. Frequency affects review order only; it never auto-approves semantics.

Crucially, this phase does not modify `curation.sqlite` and does not alter product availability. Every source-backed Instruments expression remains a first-class selectable/renderable database entity whether it is fully decomposed, partial, or unresolved. Canonical identity and semantic concepts remain additive metadata underneath the expression.

Use reviewed batch evidence to author scoped `knowledge-curation-decisions-v2` bundles, apply them through `knowledge_curation_session.py`, then regenerate the completion plan for the next coherent batch.


### 3. Status

```powershell
py scripts\data\build_local_data.py --out-dir ".local-data\current" --status
```

Status is read-only and shows promoted artifacts plus any resumable checkpoint/stage state.

### 4. Validate

```powershell
py scripts\data\validate_local_data.py --dir ".local-data\current"
```

### 5. Back up durable curation

Before bulk curation/schema work:

```powershell
py scripts\data\backup_curation.py --source ".local-data\current\curation.sqlite" --out-dir ".local-data\backups"
```

## Output layout

```text
.local-data/current/
  corpus.sqlite                 # promoted evidence/mining DB
  curation.sqlite               # DURABLE local reviewed authoring state
  knowledge.sqlite              # promoted compiled knowledge DB
  corpus.previous.sqlite        # retained previous corpus after a fresh corpus promotion, when applicable
  knowledge.previous.sqlite     # retained previous compiled knowledge after replacement, when applicable
  reports/
    corpus-profile.json
  .build-v2/
    state.sqlite                # resumable machine-readable checkpoint
    corpus.building.sqlite      # incomplete work only, when corpus is being rebuilt
    knowledge.building.sqlite   # incomplete work only
    build-report.json           # pre-promotion report
```

Everything above is ignored by Git.

## Existing v1 local database

The owner already created a valid v1 `corpus.sqlite` / `curation.sqlite` / `knowledge.sqlite`.

The resumable v2 builder is intentionally backward-safe:

- if the promoted v1 corpus fingerprints match the current Factory files, it adopts that corpus rather than rebuilding/deleting it;
- durable `curation.sqlite` is retained;
- compiled knowledge may be regenerated to attach current build/curation fingerprints;
- replacement occurs only after validation;
- the previous compiled knowledge DB is retained as `knowledge.previous.sqlite`.

A fresh v2 corpus rebuild is optional, not required merely to adopt the new tooling.

## Console progress

Long stages print useful progress to the terminal, including where meaningful:

```text
[corpus:tracks] 5,000 / 10,043 (49.8%) · 1,234/s · batch 0.20s · ETA ~4s · sections ... · tokens ...
```

The build uses named stages and reports processed/total, percentage, throughput, batch duration, and ETA where available.

## Ctrl+C / interruption

Ctrl+C requests a safe pause. The builder finishes or rolls back the current safe unit, persists state, closes databases, and leaves reusable work in `.build-v2/`.

Resume by running the normal build command again.

## Source/build safety

The checkpoint is bound to:

- Vault SHA-256;
- Genre Map SHA-256;
- build revision.

If sources or build semantics change while incomplete work exists, the builder refuses to combine them with the stale checkpoint.

Inspect with `--status`. Only if the old incomplete work is intentionally disposable, reset it:

```powershell
py scripts\data\build_local_data.py --out-dir ".local-data\current" --reset-work
```

`--reset-work` deletes **only incomplete/checkpoint work**. It does not delete:

- Factory sources;
- promoted `corpus.sqlite`;
- promoted `knowledge.sqlite`;
- durable `curation.sqlite`.

## Explicit fresh corpus rebuild

Only when you deliberately want to regenerate the evidence corpus from the current Factory files:

```powershell
py scripts\data\build_local_data.py --vault ".local-data\source\GRAPH1KS_PUBLIC_VAULT_FACTORY.json.gz" --genre-map ".local-data\source\GRAPH1KS_GENRE_MAP_FACTORY.json" --out-dir ".local-data\current" --rebuild-corpus
```

The existing promoted corpus remains untouched until the new work artifact passes validation. On successful promotion, the former corpus is retained as `corpus.previous.sqlite`.

## Bundled instrument + lexicon mining — preferred next phase

After the genre crosswalk is reviewed/applied, prepare the next evidence bundle with one command:

```powershell
py scripts\data\knowledge_mining_session.py prepare --out-dir ".local-data\current"
```

The command integrity-checks corpus + curation + compiled knowledge, creates an integrity-checked curation backup, mines instrument-list segments plus head-token variant groups, mines section-aware terms and repeated 2–4 word phrases, and writes prioritized JSON reports plus full CSV evidence. It does **not** mutate curation or auto-promote candidates.

Instrument mining is semantic-residual driven. Every source segment is decomposed with longest-match semantics against compiled canonical instruments and concepts. Fully explained segments are removed from the primary review queue. Semantic-only sound layers such as pads/effects/noise may be fully explained without being forced into fake instrument identities.

Primary review files:

```text
.local-data\current\reports\knowledge\instrument-candidates-v1.json
.local-data\current\reports\knowledge\lexicon-candidates-v1.json
```

Full local evidence:

```text
.local-data\current\reports\knowledge\instrument-candidates-full-v1.csv
.local-data\current\reports\knowledge\lexicon-candidates-full-v1.csv
.local-data\current\reports\knowledge\instrument-decomposition-v1.json
.local-data\current\reports\knowledge\instrument-decomposition-full-v1.csv
.local-data\current\reports\knowledge\knowledge-mining-summary-v1.json
```

## Bundled knowledge curation apply

After AI/human review, place the reviewed decision bundle at:

```text
.local-data\current\reports\knowledge\knowledge-curation-decisions-v1.json
```

Apply the whole reviewed batch with one command:

```powershell
py scripts\data\knowledge_curation_session.py apply --out-dir ".local-data\current" --bundle ".local-data\current\reports\knowledge\knowledge-curation-decisions-v1.json" --vault ".local-data\source\GRAPH1KS_PUBLIC_VAULT_FACTORY.json.gz" --genre-map ".local-data\source\GRAPH1KS_GENRE_MAP_FACTORY.json"
```

The apply command verifies source/review fingerprints and exact reviewed-report hashes, creates a curation backup, applies instrument families/instruments/aliases/dictionary entries in one transaction, recompiles knowledge, validates the promoted databases, restores curation and recompiles recovery state if the operation fails, writes a receipt, and refreshes the next mining reports.

New mining reports include a semantic curation fingerprint so future decision bundles are rejected if durable curation changes after review. The first pre-fingerprint report can still be applied only when its exact report hashes and source fingerprints match.

Phrase prioritization deliberately excludes Instruments-list adjacency, Key/Mode literals, boundary connectors, and common grammatical scaffolding. Mined phrases remain evidence until reviewed.

## Scalable instrument ontology v2

Reviewed Instruments work can use a scoped v2 bundle. This lets one large Instruments-only decision set add canonical instruments, aliases, semantic concepts, intrinsic instrument traits, Advanced parameters, and parameter options without requiring an unrelated lexicon report hash.

Save the reviewed owner-local bundle as:

```text
.local-data\current\reports\knowledge\instrument-ontology-decisions-v2.json
```

Apply it with one command:

```powershell
py scripts\data\knowledge_curation_session.py apply --out-dir ".local-data\current" --bundle ".local-data\current\reports\knowledge\instrument-ontology-decisions-v2.json" --vault ".local-data\source\GRAPH1KS_PUBLIC_VAULT_FACTORY.json.gz" --genre-map ".local-data\source\GRAPH1KS_GENRE_MAP_FACTORY.json"
```

The command validates the exact reviewed report hash + source fingerprints + curation fingerprint, backs up durable curation, applies additive curation-schema migrations, writes the bundle transactionally, recompiles knowledge, validates, restores/recompiles recovery state on failure, and refreshes the residual-only mining reports.

The current v2 ontology model separates **canonical instrument identity** from source/role/processing/articulation/timbre/density/register/voice-architecture/arrangement/style semantics. This must not be confused with the product option catalog: every source compound expression remains an independent selectable/renderable `instrument_expression`. Do not multiply canonical identities just because source expressions differ.

## Inspect compiled instrument expressions

These commands are expert/debug tools; normal operation should use the bundled database finalizer above.

```powershell
py scripts\data\query_knowledge.py --db ".local-data\current\knowledge.sqlite" stats
py scripts\data\query_knowledge.py --db ".local-data\current\knowledge.sqlite" expression "clean electric guitar"
py scripts\data\query_knowledge.py --db ".local-data\current\knowledge.sqlite" search "muted trumpet"
py scripts\data\query_knowledge.py --db ".local-data\current\knowledge.sqlite" unresolved --limit 100
```

The expression query returns the full source-facing option plus any resolved canonical instruments, concepts, decomposition state, and residual semantics.

## Inspect corpus evidence

```powershell
py scripts\data\query_corpus.py --db ".local-data\current\corpus.sqlite" term grit
py scripts\data\query_corpus.py --db ".local-data\current\corpus.sqlite" term transient
py scripts\data\query_corpus.py --db ".local-data\current\corpus.sqlite" section drums
py scripts\data\query_corpus.py --db ".local-data\current\corpus.sqlite" candidates drums --min-count 20
py scripts\data\query_corpus.py --db ".local-data\current\corpus.sqlite" genre "Boom Bap"
py scripts\data\query_corpus.py --db ".local-data\current\corpus.sqlite" unmatched-genres
py scripts\data\query_corpus.py --db ".local-data\current\corpus.sqlite" exclude
py scripts\data\query_corpus.py --db ".local-data\current\corpus.sqlite" profile
```

## Bundled curation session — preferred workflow

Do not dump large review queues into the terminal.

Prepare one complete review bundle:

```powershell
py scripts\data\curation_session.py prepare --out-dir ".local-data\current"
```

That single command:

- integrity-checks corpus + curation;
- creates an integrity-checked curation backup;
- exports all currently unreviewed genre-crosswalk candidates;
- adds source examples plus deterministic nearest-taxonomy suggestions;
- writes JSON + CSV reports under `.local-data\current\reports\curation\`;
- prints only a short summary/path to the terminal.

Primary handoff file for AI/human review:

```text
.local-data\current\reports\curation\genre-crosswalk-review-v1.json
```

After a reviewed decision bundle exists at:

```text
.local-data\current\reports\curation\genre-crosswalk-decisions-v1.json
```

apply the entire reviewed batch with one command:

```powershell
py scripts\data\curation_session.py apply --out-dir ".local-data\current" --bundle ".local-data\current\reports\curation\genre-crosswalk-decisions-v1.json" --vault ".local-data\source\GRAPH1KS_PUBLIC_VAULT_FACTORY.json.gz" --genre-map ".local-data\source\GRAPH1KS_GENRE_MAP_FACTORY.json"
```

The apply bundle automatically:

- verifies report/bundle freshness;
- validates all referenced canonical genre IDs;
- creates a fresh curation backup;
- applies decisions in one SQLite transaction;
- recompiles knowledge;
- runs post-apply validation;
- rolls curation back from backup if compile/validation fails;
- writes a detailed receipt/report;
- refreshes the remaining review report;
- prints only a concise final summary plus live build progress if a long stage actually runs.

## Inspect curation

```powershell
py scripts\data\query_curation.py --db ".local-data\current\curation.sqlite" stats
py scripts\data\query_curation.py --db ".local-data\current\curation.sqlite" queue --type genre_crosswalk
```

## Factory update

Never overwrite the only current build merely to inspect a new Factory release.

Build a separate snapshot:

```powershell
py scripts\data\build_local_data.py --vault "PATH\TO\NEW\GRAPH1KS_PUBLIC_VAULT_FACTORY.json.gz" --genre-map "PATH\TO\NEW\GRAPH1KS_GENRE_MAP_FACTORY.json" --out-dir ".local-data\next"
```

Validate and compare:

```powershell
py scripts\data\validate_local_data.py --dir ".local-data\next"
py scripts\data\diff_local_data.py --old ".local-data\current\corpus.sqlite" --new ".local-data\next\corpus.sqlite" --json ".local-data\next\reports\source-diff.json"
```

Review the diff before promoting/adopting a new source snapshot.

## CI / synthetic verification

Real Factory data never enters GitHub Actions. Repository tooling is tested with invented synthetic data:

```powershell
py -m py_compile scripts\data\*.py
py -m unittest discover -s tests -p "test_*.py" -v
```

CI specifically covers normal builds, curation preservation, safe pause/resume, stale-checkpoint rejection, v1 adoption, safe reset, read-only planning, and retention of previous promoted artifacts.

## Hard boundaries

Never manually edit `corpus.sqlite`.

Never delete/replace `curation.sqlite` as part of an ordinary Factory rebuild.

Never commit Factory exports, SQLite databases, checkpoints, generated reports, or backups.
