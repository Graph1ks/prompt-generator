# Handover

**Last updated:** 2026-09-21  
**Current phase/milestone:** Prompt V'gine product/data foundation merged to `main`; next phase is owner-local evidence build and curation.

## Current objective

The repository is prepared so a future developer/agent can work on Prompt V'gine without chat history and without storing the Factory corpus or generated databases in GitHub.

The next meaningful work should happen from a local clone with the owner's Factory files.

## What was just completed

- Foundation PR #1 was squash-merged to `main` as `5d8bc38797d88eb3487a35abea263d42a225b41a`; the required post-merge `validate` GitHub Actions check passed.

- Converted the generic repository template into the Graph1ks Prompt V'gine project.
- Captured the accepted UX/product design, including Easy/Advanced shared state, 1–3 Genre Influences, mobile-first picker UX, inline knowledge dictionary, quality checks, two visual palette directions, prompt diff/highlighting behavior, and accessibility constraints.
- Defined MusicSpec v1 and a machine-readable JSON Schema.
- Locked the Suno structured-v1 rendering contract and separate Exclude output.
- Profiled the supplied real Vault/taxonomy and recorded safe aggregate findings.
- Implemented local-only SQLite schemas for evidence, durable curation, and compiled knowledge.
- Implemented deterministic local build/mining, corpus query, curation query, validation, curation backup, and corpus snapshot diff tools using the Python standard library.
- Added synthetic tests proving DB creation and curation preservation across `--force` rebuild.
- Added GitHub Actions that verifies the tooling without access to the real Factory data.
- Hardened `.gitignore` so raw factories and generated databases/artifacts stay out of Git.

## Current implementation state

### Exists now

```text
LOCAL FACTORIES
      │
      ▼
corpus.sqlite            disposable evidence/mining
      │
      ├──────────► curation.sqlite    durable reviewed authoring state
      │                    │
      └──────────────┬─────┘
                     ▼
              knowledge.sqlite        disposable compiled knowledge
                     │
                     ▼
             future runtime bundles
                     │
                     ▼
                  MusicSpec
                     │
                     ▼
          suno-structured-v1 renderer
```

The current code stops deliberately before the production React/Tauri application. Data/semantic contracts should be exercised locally first.

### Intentionally not implemented yet

- production React/Vite/Tauri app;
- runtime web/native bundle compiler;
- full curated genre definitions;
- full instrument ontology;
- full descriptor/parameter option catalog;
- Vocal vocabulary enrichment;
- automatic runtime inline highlighter;
- final renderer implementation in TypeScript.

These should be built on the documented schemas/contracts rather than invented independently.

## Important files / entry points

| Path | Why it matters |
|---|---|
| `PROJECT.md` | product scope, zero-cost rule, platform/data constraints |
| `docs/PRODUCT_UX_FOUNDATION.md` | accepted UX/product behavior |
| `docs/DATA_ARCHITECTURE.md` | evidence → curation → compiled knowledge architecture |
| `docs/KNOWLEDGE_LAYER.md` | inline dictionary semantics and matching model |
| `docs/CURATION_WORKFLOW.md` | how evidence becomes reviewed product knowledge |
| `docs/MUSICSPEC_V1.md` | semantic application-state contract |
| `schema/music-spec-v1.schema.json` | machine-readable MusicSpec contract |
| `docs/PROMPT_FORMAT.md` | Suno structured-v1 renderer + Exclude contract |
| `docs/PROMPT_CORPUS_PROFILE.md` | aggregate findings from the supplied source snapshot |
| `docs/LOCAL_DATA_BUILD.md` | exact local build/validate/query/backup/update commands |
| `schema/corpus-v1.sql` | disposable evidence DB schema |
| `schema/curation-v1.sql` | durable local authoring DB schema |
| `schema/knowledge-v1.sql` | disposable compiled knowledge DB schema |
| `scripts/data/build_local_data.py` | local Factory ingest/mining/compile entry point |
| `scripts/data/query_corpus.py` | read-only evidence exploration |
| `scripts/data/query_curation.py` | read-only curation/review-queue inspection |
| `scripts/data/validate_local_data.py` | local DB integrity/invariant validation |
| `scripts/data/backup_curation.py` | integrity-checked curation backup |
| `scripts/data/diff_local_data.py` | old/new Factory evidence comparison |
| `tests/test_local_data_build.py` | synthetic regression tests |
| `.github/workflows/data-tooling.yml` | synthetic CI |

## Decisions already made

See `docs/DECISIONS.md`. Do not casually reopen these:

- real Factory/generated DB data is local-only;
- corpus evidence and curated knowledge are separate;
- durable curation is separate from disposable compiled knowledge;
- MusicSpec is source of truth, not the rendered string;
- Easy and Advanced are views of one state;
- inline dictionary is a core subsystem;
- Genre Influence is ordered Foundation/Fusion/Accent, not percentages;
- Exclude is a separate comma-delimited output;
- explanation-heavy option sets use searchable pickers/sheets, not native dropdowns;
- constraints advise; they do not censor;
- future Factory releases are built separately and diff-reviewed before promotion.

## Real-source baseline already established

Architecture was validated against the supplied snapshot:

- 10,043 tracks;
- 115,736 parsed prompt sections;
- 852,459 structured-prompt tokens;
- 100,235 Exclude item occurrences / 4,802 normalized unique Exclude items;
- 23 raw section labels / 98 section-order variants;
- 344 Vault genre labels;
- 24 Major Genres / 1,564 taxonomy genres.

Genre crosswalk baseline:

- 193 exact Vault labels representing 8,515 tracks;
- 13 conservative normalized matches representing 690 tracks;
- 138 unresolved labels representing 838 tracks.

The unresolved labels are deliberately reviewable rather than guessed. Examples include composite/alias/taxonomy-gap candidates such as `Synth-Pop`, `R&B/Soul`, `Pop Soul`, and `Pop R&B`.

## Known problems / risks

- Source prompt language is highly unique in Melody/Harmony/Groove/Drums/Bass/Instruments/Mix/Production. Full source sentences should not become giant option lists.
- Frequent n-grams include grammatical scaffolding; candidate mining requires review.
- Vocal is absent from structured source prompts; Exciters and Structure are sparse.
- Genre labels can be aliases, composites, or actual taxonomy gaps; do not use blind string collapse.
- Stable curated IDs must survive label renames once real projects reference them.
- Final app dependencies/fonts/icons/motion stack still require zero-cost/license review before adoption.
- `curation.sqlite` becomes the critical local asset after substantial authoring; backups and future additive migrations matter.

## Next concrete work

1. Clone/pull this foundation locally and place Factory files outside tracked paths (or under an ignored local path).
2. Run the build and validation commands from `docs/LOCAL_DATA_BUILD.md`.
3. Back up `curation.sqlite`.
4. Inspect:
   - `query_curation.py ... queue --type genre_crosswalk`;
   - unmatched genre labels;
   - section vocabulary and repeated phrase candidates;
   - specific terms such as `grit`, `transient`, `attack`, `swing`.
5. Curate genre crosswalk decisions first because genre identity drives later genre-conditioned mining.
6. Begin instrument identity extraction separately from descriptors/behaviors.
7. Build the first approved dictionary entries/definitions/context definitions.
8. Build reviewed Advanced parameters/options and Easy statements from evidence.
9. Only after the semantic model has real curated content, implement the TypeScript MusicSpec/compiler/runtime bundles and production UI.

## Verification

Repository/synthetic:

```bash
python -m py_compile scripts/data/*.py
python -m json.tool schema/music-spec-v1.schema.json > /dev/null
python -m unittest discover -s tests -p "test_*.py" -v
```

Local real-data build:

```bash
python scripts/data/build_local_data.py \
  --vault /path/to/GRAPH1KS_PUBLIC_VAULT_FACTORY.json.gz \
  --genre-map /path/to/GRAPH1KS_GENRE_MAP_FACTORY.json \
  --out-dir .local-data/current \
  --force

python scripts/data/validate_local_data.py --dir .local-data/current
```

Foundation PR #1 and the resulting `main` commit passed the required `validate` GitHub Actions check.

During foundation development the real-source equivalent pipeline also passed SQLite integrity, curation-preservation, query, backup, and same-snapshot diff smoke tests.

## Important context / traps

- **Never commit the real Factory files or any generated SQLite/runtime bundle.**
- `--force` must not delete `curation.sqlite`.
- Back up curation before bulk changes.
- Do not manually edit `corpus.sqlite`; fix source/import rules instead.
- Do not equate “genre exists” with “genre explanation is already curated.”
- Do not generate filler definitions merely to reach 100% coverage.
- Source metadata artist/song references are evidence metadata; they should not automatically be emitted into user prompts.
- Copy output must remain clean plaintext even when the UI decorates terms with dictionary markers/highlights.

## Local / generated state

The repository assumes local generated state under an ignored directory such as:

```text
.local-data/
  current/
    corpus.sqlite
    curation.sqlite
    knowledge.sqlite
    reports/
  backups/
```

None of this is repository state.

## Resume instruction

A new developer/agent should:

1. read `AGENTS.md`;
2. read `PROJECT.md`;
3. read `STATUS.md`;
4. read this file;
5. read the relevant product/data contracts above;
6. inspect current Git/CI state;
7. run synthetic verification before changing data tooling;
8. when real Factory data is available locally, build into an ignored directory and validate it before curation.
