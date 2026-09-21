# Project Status

**Last updated:** 2026-09-21  
**Foundation merged:** PR #1 → `5d8bc38797d88eb3487a35abea263d42a225b41a`  
**Verification:** post-merge `validate` GitHub Actions run passed  
**Current phase/milestone:** foundation complete; ready for owner-local Factory build and curation

## Current objective

Hand off a reproducible, zero-paid-service local data foundation so the owner can build and curate Prompt V'gine's real knowledge databases locally without committing source factories or generated databases to GitHub.

## Current state

- Product/UX foundation, inline dictionary model, MusicSpec v1, and Suno structured-v1 output contract are documented.
- Local data architecture is implemented as three SQLite lifecycles:
  - disposable `corpus.sqlite` evidence/mining;
  - durable local `curation.sqlite` authoring state;
  - disposable compiled `knowledge.sqlite`.
- Real Factory files, generated DBs, backups, reports, and runtime bundles are ignored and must remain local.
- Local builder parses tracks/sections/clauses/tokens, indexes prompt text, mines repeated phrases, parses Exclude items, imports the 24/1,564 genre taxonomy, produces genre crosswalk candidates, seeds unresolved genre review items, overlays durable curation, and compiles knowledge search.
- Read-only corpus and curation inspection CLIs, integrity validation, curation backup, and source-snapshot diff tooling exist.
- Synthetic unit tests cover the build contract and prove curation survives a forced corpus/knowledge rebuild.
- GitHub Actions runs the Python compile check, MusicSpec JSON syntax check, and synthetic unit tests without access to private/local Factory data.

## Last verified checks

- Foundation PR #1 merged to `main`; post-merge required `validate` check — **success**.
- Local real-source validation during foundation development — 10,043 tracks, 115,736 structured sections, 852,459 tokens, 24 Major Genres, 1,564 taxonomy genres; all generated SQLite integrity checks passed.
- Durable curation preservation smoke test — curated `Grit` entry/definition survived `--force` rebuild and compiled into `knowledge.sqlite`.
- Same-snapshot corpus diff smoke test — zero additions/removals/changes.

## Current blocker

None in repository foundation. The next phase intentionally requires the owner-local Factory files and local curation work.

## Next concrete action

On the owner's development machine, follow `docs/LOCAL_DATA_BUILD.md`: build `.local-data/current` from the two Factory files, validate it, back up `curation.sqlite`, inspect the unresolved genre queue and corpus vocabulary, then begin evidence-backed curation.

## Do not redo

- Do not reintroduce a GitHub-hosted/generated database.
- Do not merge corpus evidence and curated knowledge into one lifecycle.
- Do not turn raw n-gram frequency directly into product knowledge.
- Do not build separate Easy/Advanced prompt states.
- Do not change Exclude into a structured bracketed prompt section.
- Do not replace search/browse pickers with large native dropdowns.

## Important context

- `curation.sqlite` is the valuable durable local asset. Normal `--force` rebuilds intentionally replace only `corpus.sqlite` and `knowledge.sqlite`.
- Back up curation before bulk edits or future curation-schema migrations.
- The current Vault has no structured Vocal section coverage and very sparse Exciters/Structure coverage; do not fabricate those vocabularies from inadequate evidence.
- The repository contains aggregate corpus findings only, not the real source data.

For deeper continuation context, read `docs/HANDOVER.md`.
