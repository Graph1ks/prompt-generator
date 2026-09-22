# Changelog

This file records meaningful product, behavior, compatibility, security, data, and release changes. Git history remains the complete technical history.

## Unreleased

### Added

- Added reusable large-pool favorites with browser persistence, mouse/touch long-press progress (1.5 s add, 2 s remove), usage-based favorite ordering, explicit Genre `Alle anzeigen`, expanded-list return-to-top, and automatic compact reset after selection.
- Added scoped Studio page reset, global new-prompt reset, one-time genre-free continuation warning, and final Style prompt unlock/manual-edit/restore controls while keeping MusicSpec as semantic source truth.
- Added a verified product-owned V'gine lexicon seed plus `docs/VGINE_LEXICON_ENTRY.md`; the historical spelling is documented as a late-medieval abbreviation of `virgine` without inventing one universal pronunciation.

- Added accepted production application architecture: strict TypeScript/React/Vite/pnpm, Tauri 2 packaging direction, pure compiler boundaries, modular V'gine design system, selective Radix/shadcn boundary, centralized Motion recipes, adaptive four-chapter Studio layout, and storage/search module contracts.
- Added the strict pnpm/TypeScript workspace with `@vgine/music-spec` runtime validation and a pure deterministic `@vgine/compiler` implementing structured Suno rendering, separate Exclude output, semantic deduplication, prioritized budget omission, Unicode code-point counting, diagnostics and compaction receipts.
- Added `@vgine/runtime-data` Runtime Pack v1 bootstrap validation/compiler adaptation plus a dependency-free `@vgine/search` kernel with deterministic ranking, kind filters, worker-ready protocol, and a real 10,348-document benchmark harness.
- Added `@vgine/ui` semantic design tokens with Paradise/Ash themes and `@vgine/motion` centralized causal motion/reduced-motion recipes, without importing a generic component framework or external font.
- Added the first production-buildable `apps/studio` React/Vite shell, exact-pinned React 19.3/Vite 8.3 toolchain, responsive desktop/mobile chapter composition, Paradise/Ash switch, live-output shell, and initial token-driven V'gine React primitives.
- Added real Runtime Pack staging/loading to Studio, typed Major Genre bootstrap data, a production Genre picker over 24 Major Genres / 1,564 genres, shared MusicSpec Foundation/Fusion/Accent helpers, and live compiler/budget preview. Accepted the dependency-free 10,348-document search baseline at 4.9 ms median / 10.117 ms P95 / 14.472 ms P99.
- Added Runtime Pack v1 contract/schema and a dependency-free resumable exporter from `knowledge.sqlite` with deterministic payload hashes/build IDs, staged resume, stale-work rejection, Database V1 invariant checks, atomic promotion and previous-pack retention.
- Added synthetic Runtime Pack regression coverage for plan/no-write, source-expression preservation, no-op reruns, stale-state recovery and last-known-good retention.
- Standardized local operator outputs into one flat `reports/` directory plus separate `logs/` and durable backups; added a conflict-safe one-time migrator for legacy nested report folders.
- Initialized **Graph1ks Prompt V'gine** product and UX foundation.
- Added MusicSpec v1 semantic state contract and JSON Schema.
- Added the Suno structured-v1 prompt renderer contract with a separate comma-delimited Exclude output and a hard 1,000-character style-prompt ceiling.
- Added local-only SQLite schemas for disposable corpus evidence, durable curation state, and compiled knowledge.
- Added deterministic local Factory ingest/mining and knowledge compilation tooling.
- Added corpus and curation inspection CLIs, local integrity validation, curation backup, and Factory snapshot diff tools.
- Added inline-knowledge/dictionary and evidence-backed curation architecture.
- Added synthetic regression tests and GitHub Actions verification that does not require the real Factory data.
- Recorded aggregate baseline findings from the supplied 10,043-prompt / 1,564-genre source snapshot.
- Added a self-contained noncommercial source license, commercial-rights policy, copyright notice, licensing map, third-party notice ledger, and data-source redistribution boundary.
- Added resumable v2 local build state, staged work artifacts, source/build fingerprinting, read-only plan/status commands, safe pause/resume, stale-checkpoint rejection, and loss-safe promotion.
- Added bundled report-driven genre curation: automatic backup, full JSON/CSV review export, decision-bundle freshness/target validation, transactional apply, automatic knowledge recompile/validation, rollback on failure, receipts, and refreshed reports.
- Added bundled instrument/lexicon mining reports with curation-aware filtering, instrument segment/head-token evidence, section-aware term/phrase evidence, source examples, full CSV exports, automatic local curation backup, and concise terminal output.
- Added reviewed knowledge decision bundles and transactional knowledge apply/recompile/validate/rollback tooling for instrument families, canonical instruments, aliases, dictionary concepts, definitions, and context definitions.
- Strengthened knowledge-mining reports with semantic curation fingerprints and phrase-noise suppression for instrument-list adjacency, Key/Mode literals, connector boundaries, and common grammar scaffolding.
- Added instrument ontology v2 decision bundles with scoped report binding, aliases for existing instruments, durable instrument traits, and transactional Advanced parameter/option authoring.
- Added semantic Instruments decomposition reports that distinguish fully-semantic coverage from explicit instrument-identity coverage.
- Changed the Instruments mining queue from raw-string prioritization to semantic-residual prioritization so already-explained compound phrases no longer require manual review.
- Added complete source-backed Instruments expression materialization: every comma/semicolon-delimited source phrase is now preserved as a first-class selectable/renderable `instrument_expression` with original output wording, frequency evidence, semantic links, decomposition state, and search support.
- Added compiled expression→instrument and expression→concept relations so compound options such as `clean rhythm electric guitar` remain selectable while also resolving to structured identity/modifier semantics.
- Added hard validation that source-expression count, selectable-expression count, and preserved output wording stay lossless during knowledge compilation.
- Added `query_knowledge.py` for compiled expression/stat/search inspection.
- Added a bundled `database_foundation_session.py finalize` workflow that recompiles, validates, refreshes mining, writes acceptance/log reports, and keeps terminal output concise.
- Added `knowledge_completion_session.py prepare`, an acceptance-gated read-only semantic completion planner that reconciles accepted expression/decomposition counts and emits residual-token reports plus bounded Instruments semantic-review batches without mutating curation or shrinking the selectable expression catalog.
- Added end-to-end completion-review binding: every semantic-review batch is SHA-addressed in the completion plan, a v2 decision template binds to the exact plan hash, and `knowledge_curation_session.py` verifies `completion_plan` as a supported reviewed artifact before durable mutation.
- Added conservative coordinated shared-head instrument decomposition: phrases such as `tenor and baritone saxophones` can reuse a reviewed shared head only when all inferred instrument phrases already exist in the canonical/alias lexicon; unknown combinations remain residual.
- Added explicit decomposition grammar scaffolding for `as`, `in`, and `used` so sentence structure does not masquerade as missing instrument semantics.
- Added guarded hyphen-compound decomposition: exact reviewed de-hyphenated phrases are reused, while component-level inference requires complete reviewed coverage and refuses compounds that would imply multiple instrument identities.
- Hardened instrument-expression tokenization for Unicode names, apostrophes, and dotted acronyms, and expanded the explicit grammar/count scaffolding set used only by semantic decomposition.
- Added Factory-derived renderer budgeting: source preflight/validation rejects structured prompts above 1,000 characters, compiled renderer profiles carry the global hard limit, and renderer sections carry P90 soft targets/sample counts without inventing missing Vocal evidence.
- Build revision advanced to `promptvgine-local-data-build-v2-resumable-3-prompt-budget`; completed older checkpoints can advance knowledge stages without rebuilding a matching promoted corpus.

### Fixed

- Fixed the Studio white-screen regression where Vite development could load stale ignored `packages/*/dist` output and miss newly added workspace exports such as `createMusicSpec`. `pnpm dev` now rebuilds workspace packages first, and Vite dev resolves exact internal `@vgine/*` imports from source.

### Changed

- Relaxed MusicSpec v1 genre influences from 1–3 to **0–3**. Genre is now optional; the compiler simply omits the Genre section when none is selected.
- Fixed hover-state contrast for primary/accent Studio buttons.

- Reworked the Studio presentation to preserve the supplied V'GINE concept's product composition instead of a generic dashboard shell: editorial top bar/intro, horizontal four-stage navigation, large color-coded Genre Influence cards, inline taxonomy picker, sticky record-sleeve Live Prompt, Style/Exclude tabs, budget treatment and mobile Studio/Preview dock. Runtime Pack, MusicSpec and compiler contracts remain the production source of truth.

- **Database V1 milestone completed** for the current Factory snapshot: 6,035 / 6,035 source-backed Instruments expressions are fully semantic with 0 semantic residuals; all remain first-class selectable/renderable entities. The last completion snapshot contains 4,472 fully identity-decomposed expressions, 9 instrument families, 164 canonical instrument entities, and 161 active aliases.
- Added `docs/DATABASE_V1.md` as the canonical three-database/table inventory, invariants, completion boundary, maintenance lifecycle, and next-thread starting point.

- Repository is now explicitly a zero-paid-service, local/offline-first, owner-controlled solo-dev project.
- Raw Factory files, generated databases, generated reports, backups, and runtime data bundles are explicitly local-only and ignored by Git.
- Genre source mapping supports aliases, composites, and taxonomy gaps instead of blindly collapsing labels.
- Knowledge lifecycle now preserves durable local curation across Factory/corpus rebuilds.
- Public licensing is now explicitly source-available/noncommercial for third parties; project-connected donations/tips and other monetization are prohibited, while commercial rights in Graph1ks Material are reserved to Graph1ks.
- Long-running local data jobs now follow the RhymeLab-style resumable build standard with visible progress and last-known-good artifact preservation.
- Semantic-completion acceptance is now correctly split into immutable foundation gating vs mutable knowledge progress: post-acceptance curation may increase fully-semantic/identity coverage, while current decomposition JSON/CSV must remain internally consistent and source-expression inventory must remain unchanged.
- Completion plans now include a read-only snapshot of the current canonical instrument families, instrument IDs, and aliases so identity/alias curation can reuse exact compiled entities instead of guessing IDs or creating duplicates. 
- Zero-residual completion plans now report `status: complete` and a terminal completion action instead of incorrectly suggesting another semantic-review round.

### Data / compatibility

- Current local database lifecycle is `corpus.sqlite` (disposable evidence) + `curation.sqlite` (durable authoring) + `knowledge.sqlite` (disposable compiled knowledge).
- Future Factory updates must be built as separate snapshots and diff-reviewed before promotion.
- The previous `--force` local build workflow is retired; ordinary reruns resume safely. Existing valid v1 corpus builds can be adopted without destructive rebuilding.
