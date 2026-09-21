# Third-Party Notices

This file tracks third-party code, assets, fonts, datasets, models, or other material that is actually shipped or redistributed with Graph1ks Prompt V'gine.

## Current foundation

No third-party runtime package or hosted service is required by the current Python/SQLite local-data foundation or the pure TypeScript compiler packages.

Python and SQLite are platform/runtime dependencies and are not relicensed by this repository.

The application/compiler development toolchain currently uses Node.js 24 LTS, pnpm 11.27.1 (MIT), and TypeScript 7.0.2 (Apache-2.0). These are development/build tools in the current phase and are not redistributed in Prompt V'gine runtime output. Exact review sources are recorded in `docs/DEPENDENCY_REVIEW.md`.

## Studio runtime

The current web Studio redistributes the following permissively licensed runtime packages in its generated JavaScript bundle:

| Package | Version | License | Role |
|---|---:|---|---|
| React | 19.3.0 | MIT | UI runtime |
| React DOM | 19.3.0 | MIT | browser DOM renderer |
| Scheduler | 0.28.0 | MIT | React DOM runtime dependency |

Vite 8.3.0 and @vitejs/plugin-react 6.1.1 are MIT-licensed build/development dependencies and are not application runtime requirements.

Exact review sources and version decisions are recorded in `docs/DEPENDENCY_REVIEW.md`.

The project may later use additional third-party frameworks, libraries, fonts, icons, or other assets. Before they are shipped, their exact versions, licenses, attribution/NOTICE obligations, commercial compatibility, and redistribution requirements must be recorded here or in an equivalent authoritative notice bundle.

## Data

The owner-local Factory inputs and generated databases are not committed or redistributed by this repository. See `DATA_SOURCES.md`.

This notice file does not relicense third-party material.
