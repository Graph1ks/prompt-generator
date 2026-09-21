# PROJECT.md

## Product

**Name:** Graph1ks Prompt V'gine  
**One-line purpose:** A visual music-specification editor and knowledge-rich prompt compiler for building precise Suno prompts without requiring users to already speak producer jargon.  
**Primary users:** Suno users from beginners through advanced musicians/producers.  
**Project stage:** prototype / architecture foundation  
**Target platforms:** web/PWA, Windows/macOS/Linux desktop via Tauri or equivalent lightweight web-native shell, self-hosted/static server deployment  
**Versioning/release model:** SemVer  
**Changelog:** enabled

## Repository mode

**Repository visibility:** public  
**Collaboration mode:** owner-controlled  
**External pull requests:** collaborators-only / owner-controlled  
**Issues:** enabled  
**Projects:** optional  
**Discussions:** optional  
**Community inbox behavior:** user-triggered only  
**Wiki:** disabled  
**Pages:** not-applicable for now  
**Fork policy:** allowed by GitHub/public-repository behavior  
**Repository settings verified:** partially; application foundation work does not change repository settings  
**Verified on/by:** 2026-09-21, authenticated GitHub tooling

## Scope

### In scope

- One-to-three Genre Influence model with Foundation / Fusion / Accent roles.
- 24-Major-Genre + subgenre browsing/search based on the Graph1ks genre taxonomy.
- Easy mode with curated words/combination statements.
- Advanced mode with granular parameters, explicit routing/ownership, and custom section input.
- Shared semantic MusicSpec state across Easy and Advanced modes.
- Structured Suno prompt rendering using source-compatible `[Header: content]` sections.
- Separate comma-delimited Exclude output.
- Site-wide inline music dictionary / knowledge layer with beginner/context/current-project explanations.
- Instrument identity separated from role, register, articulation, envelope/behavior, processing, and space.
- Quality checks/relations that explain conflicts without blocking creative choices.
- Local-only corpus mining, knowledge database generation, and runtime data compilation.
- Responsive/mobile-first interaction patterns and accessible non-hover fallbacks.
- Motion used for causality, reorder, picker transitions, and live-output diff feedback.

### Explicitly out of scope for the current foundation

- Paid APIs or required hosted services.
- A runtime AI dependency for core prompt generation or definitions.
- Committing raw factory data, generated databases, generated indexes, or runtime bundles to GitHub.
- Silent artist imitation/reference insertion into exported prompts.
- Treating corpus frequency as automatic musical truth.
- Separate incompatible Easy and Advanced prompt engines.

## Engineering targets

**Primary quality target:** deterministic, explainable, local-first semantic generation with excellent UI ergonomics.  
**Performance targets:** picker/search interactions should feel instant on normal hardware; runtime data must be compiled/sharded so the 10k-prompt evidence corpus is not required by the normal UI.  
**Availability target:** core builder works offline after application/assets are installed or cached.  
**Data-size assumptions:** current evidence baseline is 10,043 prompt records and 1,564 taxonomy genres; architecture must tolerate substantial future growth without giant dropdowns or full-corpus browser payloads.  
**Supported environments:** modern evergreen browsers; desktop targets through a web-native shell; local data tooling via Python 3.11+ recommended.

## Architecture

**Runtime/language:** TypeScript/React planned for application; Python standard library for local data bootstrap/mining tooling.  
**Primary framework:** React/Vite direction; Tauri 2 or equivalent lightweight shell subject to final dependency/license review.  
**Storage:** local SQLite split into disposable evidence (`corpus.sqlite`), durable authoring (`curation.sqlite`), and disposable compiled knowledge (`knowledge.sqlite`); resumable build checkpoints live in ignored local state; future web/native runtime bundles are compiled locally.  
**Packaging/distribution:** static web/PWA + local desktop packaging; no required backend.

### Operator workflow

Owner-local maintenance should be optimized for a solo developer: one coherent command per meaningful phase, concise terminal summaries, detailed machine-readable reports for review/AI handoff, automatic backups before durable curation changes, and transactional apply/recompile/validation bundles where practical.

### Large-data build reliability

Long-running local ingestion, mining, enrichment, compilation, migration, and materialization jobs are durable build pipelines rather than disposable scripts.

They must provide plan/status/resume behavior, source/build fingerprints, bounded checkpointed work, visible console progress, cooperative stop handling, integrity gates, and validation-before-promotion. Incomplete work is isolated from promoted artifacts. Reset operations may remove only incomplete work unless the owner explicitly requests something more destructive.

The current local-data builder implements this contract with `.build-v2/state.sqlite`, staged work databases, ordinary-rerun resume, stale-checkpoint rejection, and retained `*.previous.sqlite` promoted backups.

### Architecture constraints

- MusicSpec/semantic state is the source of truth; rendered Suno text is an output format.
- Keep raw source evidence lossless before applying normalization/curation.
- Never overwrite durable `curation.sqlite` during a Factory rebuild; generated corpus/knowledge are replaceable, curation is not.
- Do not couple semantic knowledge to a single Suno renderer version.
- Preserve provenance and source hashes for every generated data build.
- Heavy corpus/evidence data is build-time only.
- Runtime dictionary matching and prompt compilation must not require a paid model/API.
- Keep the architecture proportional to current product scope.
- Prefer local/self-contained components where technically appropriate.
- Do not introduce paid runtime requirements.

## Cost policy

**Required production cost target:** zero.

Core application and local build pipeline must remain fully functional without paid services. Optional future integrations require explicit owner approval and must not be required for core functionality.

| Integration | Required? | Cost model | Free production path? | Notes |
|---|---:|---|---:|---|
| None | — | — | — | Current core is local/static |

## Licensing strategy

**Source model:** source-available, not OSI Open Source  
**Commercial model:** third-party use is noncommercial only; commercial/monetized rights in Graph1ks Material are reserved to Graph1ks  
**Deployment/distribution:** mixed static web + distributed desktop binaries  
**Copyleft posture:** permissive preferred for dependencies unless explicitly reviewed

### Graph1ks Material

Graph1ks-authored code, project-specific documentation, UI, tests, scripts, schemas, and original project assets are governed by:

- `LICENSE`
- `COMMERCIAL_LICENSE.md`
- `COPYRIGHT`

The public grant permits noncommercial use/modification/sharing under the repository terms. Project-connected monetization is prohibited for third parties, including donations/tips, ads, sponsorships, affiliate revenue, paid support/hosting/SaaS, subscriptions, paid access, and bundling with paid products/services.

Commercial exploitation of Graph1ks Material is reserved to Graph1ks. The repository does not offer a public third-party commercial license.

### Data / models / assets

**Factory/generated data:** owner-local build inputs/artifacts; not committed or granted public redistribution rights by the root code license  
**Third-party data/code/assets:** retain their original terms; authoritative boundaries live in `LICENSES.md`, `THIRD_PARTY_NOTICES.md`, and `DATA_SOURCES.md`  
**Model/weights:** none required for core  
**Fonts/media/assets:** must be reviewed before final inclusion; prototype choices are not automatic production approval

### Contribution model

**External contributions accepted?** no under the current project model  
**Contributor mechanism:** none currently; if outside code/documentation contributions are ever enabled, define contributor-rights terms before merging any contribution  
**Why:** solo-dev, owner-controlled project; keep authorship and commercial rights in Graph1ks Material centralized

## Dependency policy

Project-specific additions to `AGENTS.md`:

- Core data build uses Python standard library unless a third-party dependency provides clear value and passes cost/license review.
- Do not introduce a required cloud database, hosted search service, or metered model/API.
- Do not add a runtime SQLite-WASM dependency merely to reuse the native DB in web; static web shards are a valid compile target.
- Final font/icon/motion libraries require explicit dependency/asset review.

## Data sources

| Source | Purpose | License/terms | Commercial use | Redistribution | Attribution | Status |
|---|---|---|---|---|---|---|
| `GRAPH1KS_PUBLIC_VAULT_FACTORY.json.gz` | prompt evidence/corpus mining | project-provided; terms to be recorded before distribution | to confirm | **not assumed** | to confirm | local build input |
| `GRAPH1KS_GENRE_MAP_FACTORY.json` | canonical genre taxonomy | project-provided; terms to be recorded before distribution | to confirm | **not assumed** | to confirm | local build input |

## Security/privacy

**Sensitive data handled:** none required by core design  
**Secrets used:** none required for local/static core  
**Network exposure:** static/public web when deployed; local desktop otherwise  
**Important threat assumptions:** generated data and user projects remain local unless a future explicit sync/export feature is added

Never commit local source packs, generated databases, private paths, or user project data.

## QA / release gate

Minimum foundation checks:

- `python -m py_compile scripts/data/*.py`
- `python -m unittest discover -s tests -p "test_*.py" -v`
- synthetic fixture build succeeds from `data/fixtures/`
- `PRAGMA integrity_check` returns `ok` for generated local databases
- source schema/hash preflight succeeds
- no raw factory/database/generated bundle is tracked by Git
- renderer contract emits bracketed prompt sections and separate unbracketed comma-list Exclude
- dependency license/cost review for new runtime dependencies
- responsive/keyboard/touch QA when UI implementation begins

## Continuity

Operational current state lives in `STATUS.md`. Detailed continuation context lives in `docs/HANDOVER.md`.

Important durable design documents:

- `docs/PRODUCT_UX_FOUNDATION.md`
- `docs/DATA_ARCHITECTURE.md`
- `docs/KNOWLEDGE_LAYER.md`
- `docs/PROMPT_CORPUS_PROFILE.md`
- `docs/LOCAL_DATA_BUILD.md`
- `docs/DECISIONS.md`

## Current priorities

1. Run the finished local data toolchain against the owner’s local Factory files and start deliberate genre/term/instrument curation.
2. Mine/curate instruments, descriptors, parameters, reusable statements, and dictionary entries without promoting raw frequency directly to product truth.
3. Implement the documented MusicSpec/compiler contracts in TypeScript.
4. Build the first production-quality Easy/Advanced editor and inline knowledge interaction on top of the stable semantic model.
