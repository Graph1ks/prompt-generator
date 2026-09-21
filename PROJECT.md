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
**Storage:** local generated SQLite evidence/knowledge databases; runtime web/native bundles compiled locally from approved knowledge.  
**Packaging/distribution:** static web/PWA + local desktop packaging; no required backend.

### Architecture constraints

- MusicSpec/semantic state is the source of truth; rendered Suno text is an output format.
- Keep raw source evidence lossless before applying normalization/curation.
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

**Source model:** undecided; repository is currently public owner-controlled source  
**Commercial model:** commercial use intended/possible; final terms undecided  
**Deployment/distribution:** mixed static web + distributed desktop binaries  
**Copyleft posture:** permissive preferred for dependencies unless explicitly reviewed

### Code

**Chosen code license/terms:** undecided  
**Why it fits:** owner decision still required before release terms are finalized  
**Patent considerations:** review with final dependency/license choice  
**Attribution/NOTICE requirements:** track per dependency/asset

### Data / models / assets

**Dataset/corpus license or terms:** project-provided factory data; redistribution is not assumed and generated databases are local-only  
**Model/weights license or terms:** none required for core  
**Fonts/media/assets license or terms:** must be reviewed before final inclusion; prototype font direction is not automatic production approval  
**Documentation license:** undecided

### Contribution model

**External contributions accepted?** no by default / owner-triggered only  
**Contributor mechanism:** none currently  
**Why:** solo-dev owner-controlled project

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

- `python -m py_compile scripts/data/build_local_data.py scripts/data/query_corpus.py`
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

1. Stabilize local corpus/knowledge schema and genre crosswalk curation workflow.
2. Mine/curate instruments, descriptors, parameters, reusable statements, and dictionary entries from the corpus without promoting raw frequency directly to product truth.
3. Implement MusicSpec + renderer contracts before building the production UI.
4. Build the first production-quality Easy/Advanced editor and inline knowledge interaction on top of the stable semantic model.
