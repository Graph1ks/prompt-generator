# PROJECT.md

Fill this file when creating a new repository from the template. Delete instructions that do not apply.

## Product

**Name:** <project-name>  
**One-line purpose:** <what the product does>  
**Primary users:** <target users>  
**Project stage:** prototype / alpha / beta / production  
**Target platforms:** <web / Windows / macOS / Linux / mobile / server / library / other>  
**Versioning/release model:** <SemVer / date-based / unversioned / other>  
**Changelog:** enabled / disabled / not-applicable

## Repository mode

**Repository visibility:** private / public  
**Collaboration mode:** owner-controlled / community  
**External pull requests:** disabled / collaborators-only / enabled  
**Issues:** enabled / disabled  
**Projects:** enabled / disabled  
**Discussions:** enabled / disabled  
**Community inbox behavior:** user-triggered only  
**Wiki:** enabled / disabled  
**Pages:** enabled / disabled / not-applicable  
**Fork policy:** disabled / allowed / not-applicable  
**Repository settings verified:** yes / no  
**Verified on/by:** <date and human/authenticated tooling>

Default public mode is **owner-controlled source**, not community contributions. See `docs/REPOSITORY_VISIBILITY.md`.

## Scope

### In scope

- <item>

### Explicitly out of scope

- <item>

## Engineering targets

**Primary quality target:** <e.g. correctness, latency, offline-first, portability>  
**Performance targets:** <measurable targets if relevant>  
**Availability target:** <if relevant>  
**Data-size assumptions:** <if relevant>  
**Supported environments:** <versions/platforms>

## Architecture

**Runtime/language:** <...>  
**Primary framework:** <...>  
**Storage:** <...>  
**Packaging/distribution:** <...>

### Architecture constraints

- Keep the architecture proportional to current product scope.
- Prefer local/self-contained components where they are technically appropriate.
- Do not introduce paid runtime requirements.

## Cost policy

**Required production cost target:** zero.

List any optional external integrations here. The core project must not depend on paid services unless this file is explicitly changed by the owner.

| Integration | Required? | Cost model | Free production path? | Notes |
|---|---:|---|---:|---|
| None | — | — | — | — |

## Licensing strategy

Treat these as separate axes.

**Source model:** open-source / proprietary / source-available / mixed / internal  
**Commercial model:** commercial use intended / non-commercial only / internal only / undecided  
**Deployment/distribution:** distributed binaries / distributed source / SaaS-network service / local-only / internal / mixed  
**Copyleft posture:** permissive preferred / weak copyleft acceptable / strong copyleft acceptable / case-by-case

### Code

**Chosen code license/terms:** <license / proprietary / undecided>  
**Why it fits:** <reason>  
**Patent considerations:** <...>  
**Attribution/NOTICE requirements:** <...>

### Data / models / assets

Fill only what applies.

**Dataset/corpus license or terms:** <none / terms / undecided>  
**Model/weights license or terms:** <none / terms / undecided>  
**Fonts/media/assets license or terms:** <none / terms / undecided>  
**Documentation license:** <same as code / separate license / proprietary / undecided>

Each category may have different rights. Do not assume the code license covers data, model weights, fonts, media, or documentation.

### Contribution model

**External contributions accepted?** yes / no / later  
**Contributor mechanism:** none / DCO / CLA / copyright assignment / undecided  
**Why:** <reason>

Do not copy a CLA or license into the repository before the project strategy is decided. See `docs/LICENSING.md`.

## Dependency policy

Project-specific additions to `AGENTS.md`:

- <e.g. no GPL-family runtime dependencies>
- <e.g. Apache-2.0/MIT/BSD/ISC preferred>
- <e.g. native dependencies require review>

## Data sources

| Source | Purpose | License/terms | Commercial use | Redistribution | Attribution | Status |
|---|---|---|---|---|---|---|
| <source> | <purpose> | <license> | yes/no/unclear | yes/no/unclear | <requirement> | proposed/approved |

## Security/privacy

**Sensitive data handled:** <none or description>  
**Secrets used:** <none or where stored>  
**Network exposure:** <local only / LAN / public / other>  
**Important threat assumptions:** <...>

Never place real secrets, private local paths, or personal production data in this file.

## QA / release gate

Minimum checks for this project:

- <test command>
- <lint/typecheck command>
- <build command>
- <benchmark command if relevant>
- privacy/path leak check
- dependency license/cost review for new dependencies
- repository settings verification after manual GitHub changes
- persistent-data recovery check for destructive changes when applicable

## Continuity

Operational current state lives in `STATUS.md`. Detailed continuation context lives in `docs/HANDOVER.md`.

`CHANGELOG.md` records curated product/release history when changelog tracking is enabled. Git remains the complete technical history.

A new agent/user must be able to resume from repository state plus these documents without relying on prior chat history. Persist project decisions/facts, not raw conversations.

## Current priorities

1. <priority>
2. <priority>
3. <priority>
