# Dependency Review

Use this for any dependency that is non-trivial, externally distributed with the product, legally unusual, operationally significant, or difficult to remove.

## Candidate

**Name:**  
**Version:**  
**Purpose:**  
**Alternatives considered:**  
**Why the existing stack is insufficient:**

## Cost gate

- [ ] Free to obtain/use for development.
- [ ] Free to build/package.
- [ ] Free for the intended production use.
- [ ] No required metered API/service.
- [ ] No required paid account/subscription.
- [ ] No realistic mandatory cost hidden behind a "free tier".

**Cost notes:**

## License gate

**License:**  
**Authoritative license source checked:**  
**Commercial use allowed for this project model:** yes / no / unclear  
**Redistribution allowed as intended:** yes / no / unclear  
**Attribution/NOTICE obligations:**  
**Copyleft/source-sharing implications:**  
**Transitive license concerns:**  
**Redistributed/shipped transitive components accounted for:** yes / no / not-applicable

- [ ] Compatible with project license/distribution model.
- [ ] Required notices can be satisfied.
- [ ] No non-commercial/research-only/field-of-use restriction conflicts with the project.

## Engineering gate

- [ ] Maintained enough for our risk level.
- [ ] Security posture acceptable.
- [ ] Dependency weight is justified.
- [ ] Performance impact acceptable.
- [ ] Lock-in/migration risk acceptable.
- [ ] In-house implementation is not clearly better overall.
- [ ] Required third-party notices/source obligations are known for shipped components.

## Decision

**Approved / rejected / needs clarification:**  
**Reason:**  
**Reviewer/date:**


## Application architecture selections — installation gate

The following are **architecture-selected candidates, not yet installed dependencies**. The exact version and authoritative license source must be recorded at the first commit that adds each package.

| Candidate | Intended role | Architecture decision | Install status |
|---|---|---|---|
| React | UI runtime | accepted | not installed |
| TypeScript | strict application/compiler language toolchain | accepted | **approved/installed: 7.0.2** |
| Vite | web dev/build | accepted | not installed |
| pnpm | JS/TS workspace/package manager | accepted | **approved/installed: 11.27.1** |
| Tauri 2 | desktop shell / shared native packaging path | accepted | not installed |
| Motion for React | layout/presence/gesture/spring motion | accepted candidate | not installed |
| Radix primitives | selected accessibility/interaction primitives | selective candidate | not installed |
| Zustand | lightweight application/UI state | preferred candidate | not installed |
| TanStack Virtual | large-list virtualization | preferred candidate | not installed |

shadcn/ui is not the base design system and is not a required dependency. Tailwind is not part of the accepted styling foundation.

Before any row changes to installed/approved, complete the normal cost/license/engineering gate above and update third-party notices when redistribution requires it.


## Approved JS/TS foundation toolchain — 2026-09-21

### Node.js 24.21.0 LTS

- **Role:** local/CI JavaScript runtime; not an application runtime dependency shipped by the repository in this phase.
- **Version policy:** Node 24.x only for the current workspace; CI pins 24.21.0.
- **Cost:** free; no hosted/metered service.
- **License:** permissive Node.js license plus bundled third-party notices.
- **Authoritative license source:** https://github.com/nodejs/node/blob/v24.21.0/LICENSE
- **Decision:** approved for development/CI. No product redistribution obligation is introduced by this phase.

### pnpm 11.27.1

- **Role:** workspace/package manager.
- **Why this version:** latest maintained v11 release at review time; pinned deliberately rather than taking a fresh major implicitly.
- **Cost:** free; no paid account/service.
- **License:** MIT.
- **Authoritative release/license sources:** https://github.com/pnpm/pnpm/releases/tag/v11.27.1 and https://github.com/pnpm/pnpm/blob/v11.27.1/LICENSE
- **Runtime distribution:** not shipped as part of Prompt V'gine application output.
- **Decision:** approved.

### TypeScript 7.0.2

- **Role:** compile/typecheck strict application/domain packages.
- **Cost:** free; no hosted/metered service.
- **License:** Apache-2.0.
- **Authoritative package/release license sources:** https://www.npmjs.com/package/typescript/v/7.0.2 and https://github.com/microsoft/typescript-go/blob/typescript/v7.0.2/LICENSE
- **Runtime distribution:** compiler/toolchain only in this phase; generated JavaScript does not embed the TypeScript compiler.
- **Decision:** approved.

No React, Vite, Tauri, Motion, Radix, Zustand or TanStack package is installed by the compiler-foundation slice.
