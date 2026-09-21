# Engineering Playbook

## Purpose

This playbook turns the principles in `AGENTS.md` into an execution pattern optimized for a solo developer or small team working quickly with AI assistance.

## Default work cycle

Use one coherent loop:

**Understand → decide → implement → test → verify → document → finish**

Do not split that loop into separate approval points unless a decision is materially risky or expensive to reverse.

### 1. Understand

Identify:

- the actual user-visible problem;
- relevant code/data paths;
- constraints already documented;
- measurable success criteria;
- security, privacy, licensing, and cost implications.

Do not broaden scope unless the existing architecture makes a nearby change necessary.

### 2. Decide

For routine reversible choices, make the decision and proceed.

Spend more analysis on:

- persistent data formats;
- public APIs;
- irreversible migrations;
- core architecture;
- security boundaries;
- licensing;
- external services;
- dependency families that will be hard to remove.

Document important decisions, not every thought.

### 3. Implement

Prefer:

- focused diffs;
- existing project conventions;
- standard primitives;
- explicit error handling at system boundaries;
- simple data flow;
- deletion of obsolete code when replacement is complete.

Avoid leaving parallel old/new paths without a reason.

### 4. Test

Select checks by risk instead of ritual.

| Change | Minimum useful checks |
|---|---|
| Pure logic | focused unit tests + relevant suite |
| UI behavior | component/integration check + manual smoke path where useful |
| Database/query | correctness + representative data + query/performance check |
| Migration | forward migration + representative existing data + failure/retry behavior |
| Packaging | clean build/package + launch/smoke |
| Security-sensitive | negative-path tests + input/permission boundary checks |
| Performance-sensitive | before/after benchmark using comparable data |

Run independent checks together when the tooling supports it.

### 5. Verify

Confirm the result against the success criterion, not merely against test execution.

Examples:

- latency target was actually measured;
- UI flow works end to end;
- database output is correct;
- published artifacts contain no private path;
- clean installation works without local undeclared state.

### 6. Document

Update only documentation affected by the change.

Good documentation captures facts future work depends on:

- commands;
- invariants;
- architecture;
- data contracts;
- licensing decisions;
- performance baselines;
- migration notes;
- known limitations;
- meaningful release/user-facing changes in `CHANGELOG.md` when the project uses one.

Documentation should preserve the durable engineering consequence, not the conversation that produced it. Do not paste chat transcripts or sensitive/off-topic conversation content into repository artifacts.

### 7. Finish

Remove temporary debug code, dead files, abandoned experiments, and sensitive local artifacts before considering the slice complete.

Then leave the repository resumable:

- update `STATUS.md` with the actual current phase, objective, verification, blocker, next action, and meaningful "do not redo" context;
- update `docs/HANDOVER.md` when implementation state, important files, decisions, risks, verification, or next work changed;
- ensure a new agent/user can continue without prior chat history;
- update `CHANGELOG.md` when the work materially changes user-visible behavior, compatibility, migrations, security, data/provenance, or a release;
- do not duplicate durable decision rationale that already belongs in `docs/DECISIONS.md` or another authoritative domain document;
- leave no raw/sensitive conversation content in source, docs, logs, fixtures, reports, commits, or generated artifacts.

A work chunk is not finished if its continuation documents materially contradict the code/tests.

## Reversibility rule

Use decision effort proportional to reversal cost.

### Cheap to reverse

Examples: internal helper name, local UI spacing, small implementation detail.

**Action:** choose a good default and continue.

### Moderately expensive

Examples: dependency choice, internal data representation, medium refactor.

**Action:** compare the strongest options briefly, choose, implement, verify.

### Expensive or irreversible

Examples: public API, persistent schema consumed externally, project license, redistribution rights, destructive migration.

**Action:** perform explicit analysis and record the rationale before locking it in.

## State-of-the-art without scope explosion

"Modern" does not mean "maximally complex."

Prefer mature current approaches that improve the product within scope. Reject technology whose operational burden is larger than the problem it solves.

A local desktop product may correctly use a single process and SQLite. A small service may correctly be one deployable unit. Do not introduce microservices, orchestration, queues, caches, or distributed state without a demonstrated requirement.

## Build vs. reuse decision

A reusable component is favored when it:

- solves the actual problem well;
- is genuinely zero-cost for intended use;
- has a compatible license;
- is sufficiently maintained;
- has acceptable dependency weight;
- reduces total complexity.

An in-house implementation is favored when:

- the external license is incompatible or unclear;
- production use becomes paid;
- integration is larger than implementation;
- only a small stable subset is needed;
- performance/control requirements demand it;
- the component is strategic product logic;
- external lock-in is material.

Record only non-obvious decisions.

## Tool selection

Prefer tools that are:

- free and usable without recurring payment;
- open-source when practical;
- portable;
- scriptable/reproducible;
- established enough for the risk involved.

Do not make a project depend on a proprietary paid editor, paid build system, paid API, or paid cloud service.

## Communication style for AI-assisted development

Progress reports should emphasize:

- what changed;
- what was found;
- what was measured;
- what remains;
- material risks/decisions.

Avoid narrating trivial internal steps. Surface blockers and important findings early.
