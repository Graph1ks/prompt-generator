# Handover

This document contains the minimum durable context required for another competent developer or AI agent to continue the project without relying on chat history.

Update it when a meaningful work chunk changes implementation state, architecture, milestone, blockers, important files, verification, or next steps.

Do not use this as a raw work log. Keep only context that remains useful for continuation.

**Last updated:** YYYY-MM-DD  
**Last known good commit:** <commit-sha-or-tag>  
**Current phase/milestone:** <phase-or-milestone>

## Current objective

<What are we trying to complete now?>

## What was just completed

- <completed work>
- <verified result>

## Current implementation state

Describe what exists now, what is partially implemented, and what is intentionally not implemented.

## Important files / entry points

| Path | Why it matters |
|---|---|
| <path> | <purpose> |

## Decisions already made

Only include decisions that a new agent might otherwise waste time reopening.

- <decision and short rationale>

For durable architecture/licensing decisions, reference `docs/DECISIONS.md` or the relevant authoritative document instead of duplicating full rationale.

## Known problems / risks

- <known issue, edge case, technical debt, or risk>

## Next concrete work

1. <highest-priority next step>
2. <next step>
3. <next step>

## Verification

### Commands

```text
<commands used to verify the current state>
```

### Expected result

<What should pass / what benchmark or behavior should be observed?>

## Important context / traps

- <thing that looks removable but is required>
- <local-only/generated file that must not be committed>
- <migration/order dependency>
- <known false lead already investigated>

## Local / generated state

Document only project-relevant local state. Never include secrets, private absolute user paths, credentials, or unnecessary personal information.

- <relative path or sanitized description> — <why it matters>

## Resume instruction

A new agent/user should:

1. read `AGENTS.md`;
2. read `PROJECT.md`;
3. read `STATUS.md`;
4. read this file;
5. inspect the current Git state and relevant tests before changing code;
6. reconcile stale documentation against repository state/tests rather than trusting stale prose.

If this document conflicts with current code/tests, the repository and reproducible verification are authoritative. Correct this handover as part of the next work chunk.
