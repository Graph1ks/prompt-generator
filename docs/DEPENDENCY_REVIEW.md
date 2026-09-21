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
| Vite | web dev/build | accepted | not installed |
| pnpm | JS/TS workspace/package manager | accepted | not installed |
| Tauri 2 | desktop shell / shared native packaging path | accepted | not installed |
| Motion for React | layout/presence/gesture/spring motion | accepted candidate | not installed |
| Radix primitives | selected accessibility/interaction primitives | selective candidate | not installed |
| Zustand | lightweight application/UI state | preferred candidate | not installed |
| TanStack Virtual | large-list virtualization | preferred candidate | not installed |

shadcn/ui is not the base design system and is not a required dependency. Tailwind is not part of the accepted styling foundation.

Before any row changes to installed/approved, complete the normal cost/license/engineering gate above and update third-party notices when redistribution requires it.
