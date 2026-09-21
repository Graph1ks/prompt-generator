# Changelog

This file records meaningful product, behavior, compatibility, security, data, and release changes. Git history remains the complete technical history.

## Unreleased

### Added

- Initialized **Graph1ks Prompt V'gine** product and UX foundation.
- Added MusicSpec v1 semantic state contract and JSON Schema.
- Added the Suno structured-v1 prompt renderer contract with a separate comma-delimited Exclude output.
- Added local-only SQLite schemas for disposable corpus evidence, durable curation state, and compiled knowledge.
- Added deterministic local Factory ingest/mining and knowledge compilation tooling.
- Added corpus and curation inspection CLIs, local integrity validation, curation backup, and Factory snapshot diff tools.
- Added inline-knowledge/dictionary and evidence-backed curation architecture.
- Added synthetic regression tests and GitHub Actions verification that does not require the real Factory data.
- Recorded aggregate baseline findings from the supplied 10,043-prompt / 1,564-genre source snapshot.
- Added a self-contained noncommercial source license, commercial-rights policy, copyright notice, licensing map, third-party notice ledger, and data-source redistribution boundary.
- Added resumable v2 local build state, staged work artifacts, source/build fingerprinting, read-only plan/status commands, safe pause/resume, stale-checkpoint rejection, and loss-safe promotion.

### Changed

- Repository is now explicitly a zero-paid-service, local/offline-first, owner-controlled solo-dev project.
- Raw Factory files, generated databases, generated reports, backups, and runtime data bundles are explicitly local-only and ignored by Git.
- Genre source mapping supports aliases, composites, and taxonomy gaps instead of blindly collapsing labels.
- Knowledge lifecycle now preserves durable local curation across Factory/corpus rebuilds.
- Public licensing is now explicitly source-available/noncommercial for third parties; project-connected donations/tips and other monetization are prohibited, while commercial rights in Graph1ks Material are reserved to Graph1ks.
- Long-running local data jobs now follow the RhymeLab-style resumable build standard with visible progress and last-known-good artifact preservation.

### Data / compatibility

- Current local database lifecycle is `corpus.sqlite` (disposable evidence) + `curation.sqlite` (durable authoring) + `knowledge.sqlite` (disposable compiled knowledge).
- Future Factory updates must be built as separate snapshots and diff-reviewed before promotion.
- The previous `--force` local build workflow is retired; ordinary reruns resume safely. Existing valid v1 corpus builds can be adopted without destructive rebuilding.
