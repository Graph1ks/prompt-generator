# AGENTS.md

This file defines the default operating contract for human developers and AI coding agents working in this repository.

## Mission

Build quickly, safely, and to a high engineering standard without unnecessary process, paid dependencies, license surprises, privacy leaks, or architecture beyond the project's real scope.

The target operating model is a high-performing solo-dev studio: fast iterations, strong judgment, compact QA, and production-quality results.

## 0. Resume protocol — HARD RULE

The repository must remain resumable by another competent developer or AI agent without relying on chat history.

Before starting meaningful work, read in this order:

1. `AGENTS.md`;
2. `PROJECT.md`;
3. `STATUS.md`;
4. `docs/HANDOVER.md`;
5. relevant architecture/decision/domain documentation.

Then inspect the current Git state and relevant tests before changing code.

Source-of-truth precedence when information conflicts:

1. current code/data/schema plus reproducible tests/verification;
2. `PROJECT.md` for project intent, constraints, licensing, and repository mode;
3. accepted durable decisions in `docs/DECISIONS.md` and other authoritative domain docs;
4. `STATUS.md` and `docs/HANDOVER.md` for current operational state;
5. README and other explanatory docs.

If continuity docs are stale, correct them as part of the current work. Do not blindly continue from stale prose.

No continuation-critical fact may exist only in chat history.

## 1. Execution mode: fast, coherent, complete

Default behavior:

- Work in meaningful end-to-end chunks instead of artificial micro-steps.
- Combine analysis, implementation, focused tests, verification, and documentation when they belong to the same change.
- Run independent checks in parallel when practical.
- Do not stop for confirmation on routine, reversible engineering decisions.
- Escalate decisions that are expensive to reverse, materially change product scope, create licensing obligations, expose data, or introduce meaningful security risk.
- Prefer finishing one coherent slice over leaving many partially completed slices.
- Keep explanations concise unless deeper analysis is needed for a material decision.

Do not trade correctness for speed. Gain speed by reducing ceremony, avoiding duplicated work, batching related operations, and choosing appropriately scoped solutions.

## 2. Engineering quality

Solutions must be:

- correct;
- maintainable;
- reasonably testable;
- secure for the actual threat model;
- performant enough for stated requirements;
- understandable by a future maintainer;
- current and technically defensible;
- appropriately scoped.

Avoid:

- hacks that merely make a test pass;
- unnecessary abstraction;
- speculative architecture;
- premature distributed systems;
- dependency sprawl;
- duplicated logic when a small shared abstraction is clearly warranted;
- broad rewrites when a focused change is safer;
- knowingly fragile fixes without documenting why they are temporary.

Prefer the simplest solution that would still be acceptable in a high-quality production codebase.

## 3. Zero-cost rule — HARD GATE

Do not add or recommend a required component that costs money to develop, build, test, operate, distribute, or use in the intended production path.

This includes, unless explicitly approved for a specific project:

- paid software;
- paid IDE or build requirements;
- paid APIs;
- metered APIs that can create unavoidable charges;
- subscription-only services;
- paid SaaS infrastructure;
- commercial SDKs requiring fees;
- required hosted services with usage billing;
- "free trial" dependencies whose production use is paid;
- tooling whose essential project functionality is locked behind a paid tier.

"Has a free tier" is not equivalent to zero-cost. A dependency is acceptable only when the intended project path can remain genuinely free under realistic use.

Optional integrations may only exist when the core product remains fully functional without them and they are clearly marked optional.

Before adopting a third-party solution, compare it with a reasonable self-hosted, local, standard-library, or in-house alternative.

## 4. License compatibility — HARD GATE

Every external dependency and asset must be compatible with the project's intended distribution model.

Check licenses for:

- libraries and frameworks;
- copied source code;
- datasets and corpora;
- fonts;
- icons and media;
- models and model weights;
- binaries;
- SDKs;
- templates;
- build tools when redistribution terms matter;
- code generated from third-party sources when relevant.

Never assume that "public on GitHub", "free to download", or "free for non-commercial use" means commercially usable.

Do not conflate **commercial** with **proprietary**. Commercial activity can occur under open-source licenses; the important questions are whether the product is open or closed, how it is deployed/distributed, and what downstream obligations are acceptable.

For closed-source/proprietary distributed products, permissive dependencies such as MIT, BSD-family, ISC, or Apache-2.0 are often the lowest-friction choices when technically suitable. Treat copyleft, source-available, non-commercial, field-of-use, custom, or unclear licenses as explicit review items.

For open-source projects, choose the project's own license deliberately rather than defaulting automatically.

Use `docs/LICENSING.md` for project-license selection, dependency review, CLA/DCO guidance, and escalation rules.

## 5. Build vs. reuse

When a mature free solution exists, evaluate it before building from scratch.

Evaluate:

1. technical fit;
2. zero-cost status;
3. license compatibility;
4. maintenance activity and ecosystem health;
5. security posture;
6. dependency weight;
7. performance;
8. portability and lock-in;
9. integration complexity;
10. cost of owning an in-house implementation.

Use the existing solution when it is clearly better overall. Build in-house when licensing, cost, performance, scope, reliability, dependency weight, strategic differentiation, or long-term ownership makes that the better engineering decision.

Do not reinvent commodity infrastructure for pride. Do not import a large dependency to save a trivial amount of code.

## 6. Security and privacy baseline

Never commit, publish, paste into public artifacts, or intentionally log:

- passwords;
- API keys;
- access tokens;
- private keys;
- session secrets;
- personal access tokens;
- connection strings containing credentials;
- private customer/user data;
- unnecessary internal identifiers;
- private machine-specific information.

Do not expose local user paths such as:

- `C:\\Users\\<name>\\...`
- `/Users/<name>/...`
- `/home/<name>/...`

Public logs, fixtures, reports, documentation, screenshots, example commands, crash dumps, and generated artifacts must use sanitized placeholders or project-relative paths whenever possible.

Use environment variables or ignored local configuration for secrets. Add only sanitized examples such as `.env.example`.

Security should be proportional to the threat model. Avoid both negligence and enterprise-security theater that adds large complexity without meaningful risk reduction.

### Conversation-to-repository hygiene — HARD RULE

Persist **decisions and engineering facts, not conversations**.

User/AI conversations are not project artifacts by default. Do not copy or retain raw chat transcripts, prompts, private discussions, or unrelated conversational content in source code, documentation, logs, fixtures, reports, commit messages, Issues, generated artifacts, or release packages.

In particular, do not persist conversation material merely because it was discussed when it contains sensitive, private, exploitative, abusive, potentially unlawful, harmful, or otherwise inappropriate subject matter that is not necessary for the legitimate technical project state.

When a conversation produces a valid project decision, retain only the minimum durable consequence, for example an architecture choice, accepted requirement, verified finding, or sanitized test condition. Do not preserve the surrounding conversation.

Security research, abuse-prevention testing, red-team fixtures, or other sensitive material may be retained only when it is genuinely required by the project, appropriate to retain, minimized to the necessary technical facts, and sanitized of real credentials, personal data, private conversation content, and unnecessary operational detail.

The same rule applies to local/generated logs: do not intentionally create durable logs of conversation content unless the product itself explicitly requires such storage and the data-handling/privacy design has been approved.

See `SECURITY.md`.

## 7. Data handling

Before adding a dataset or external data source, record:

- source;
- license/terms;
- commercial-use status;
- redistribution status;
- attribution requirements;
- privacy implications;
- update/refresh method;
- whether derived data inherits restrictions.

Do not import data merely because it is publicly accessible.

Do not use private production data as test fixtures unless explicitly sanitized and approved.

## 8. QA strategy

Use risk-based QA.

For each meaningful change:

- test the changed behavior;
- test likely regressions;
- run type/lint/static checks that materially apply;
- run build/package checks when packaging is affected;
- benchmark when performance is a requirement;
- verify migrations when persistent data changes;
- verify failure behavior for security-sensitive or destructive paths.

Batch compatible checks. Do not rerun expensive unrelated suites after every tiny edit unless the project requires it.

A bug fix should normally include a regression test when practical.

For destructive persistent-data changes, verify a recovery path appropriate to the project: backup/restore, rollback, reversible migration, or a documented reason why recovery is unnecessary. Do not add enterprise-grade recovery machinery to projects that do not persist user data.

## 9. Performance

Do not optimize blindly.

When performance matters:

1. define the target;
2. measure the baseline;
3. identify the actual bottleneck;
4. change the smallest high-leverage part;
5. benchmark again;
6. verify correctness did not regress.

Prefer algorithmic/data-layout/query improvements over cosmetic micro-optimizations.

## 10. Dependency policy

Before adding a dependency, ask:

- Can the existing stack already do this cleanly?
- Is the dependency free for the complete intended use?
- Is its license compatible?
- Is it actively maintained enough for our risk level?
- Is the dependency size/complexity justified?
- Does it introduce transitive licensing or security concerns?
- Is removal/migration reasonably possible?

Pin or lock dependencies according to the ecosystem's standard practice.

## 11. Repository visibility and hygiene

Repository visibility and collaboration mode must be selected explicitly in `PROJECT.md`.

Default modes:

- **PRIVATE — owner-controlled development**
- **PUBLIC — owner-controlled source** (default public mode)
- **PUBLIC — community contributions enabled** (explicit opt-in only)

A public repository does not automatically accept outside pull requests and does not automatically imply an open-source license. A private repository does not bypass security or license requirements.

After creating a repository from this template, follow `docs/BOOTSTRAP.md`. Repository-host settings that require human action must be listed, applied, and verified. If authenticated tooling can read the settings, re-check them directly; otherwise require a human verification record. Never claim bootstrap is complete while required settings remain unverified.

Before changing a repository from private to public, perform the publication audit in `docs/REPOSITORY_VISIBILITY.md`.

For public owner-controlled projects, default to collaborator-only pull requests where the platform supports it, otherwise disable pull requests.

Issues and Discussions are **community input channels, not automatic agent work queues**.

Default agent behavior:

- do not proactively scan, triage, prioritize, reply to, label, close, or implement Issues/Discussions merely because they exist;
- do not treat community requests as roadmap commitments or priority overrides;
- act on Issues/Discussions only when the user explicitly asks for analysis, triage, feedback, a response, or implementation;
- when triggered, verify the report/request against current code, `PROJECT.md`, `STATUS.md`, architecture, tests, and scope before acting;
- distinguish reproducible bugs, valid suggestions, duplicates/obsolete reports, unclear reports, and out-of-scope requests;
- report the engineering/product impact factually to the user;
- implement only when the user's instruction includes or subsequently authorizes implementation;
- after implementation, update tests and continuity docs as normal.

Security reports are handled through `SECURITY.md`; do not encourage exploitable vulnerability details in public Issues/Discussions.

See `docs/REPOSITORY_VISIBILITY.md` for the full policy.

Keep public repositories free of:

- secrets;
- generated private data;
- machine-specific absolute paths;
- database dumps not intended for publication;
- local caches;
- editor state;
- unnecessary binaries;
- debug output;
- personal identifiers not required by the project.

Prefer reproducible project-relative commands and paths.

## 12. Documentation and continuity

Documentation must make the project understandable **and resumable**.

Maintain two current-state documents:

- `STATUS.md` — short operational truth: current phase, objective, state, last verified checks, blocker, next concrete action, and work that must not be redone.
- `docs/HANDOVER.md` — durable continuation context: what was completed, implementation state, important files, decisions already made, known problems, verification, next work, and traps.

For long-lived, versioned, released, or user-facing projects, maintain `CHANGELOG.md` as the curated history of meaningful product/release changes. Git remains the complete technical history. Do not turn the changelog into a commit dump.

Update them whenever a meaningful work chunk changes facts another agent/user would need to continue correctly.

Rules:

- do not use either file as a verbose chronological diary;
- replace stale current-state information instead of endlessly appending history;
- keep durable rationale in `docs/DECISIONS.md` or the appropriate domain document and reference it from the handover;
- record commands/results needed to reproduce the last known good state;
- record the next concrete action precisely enough that another competent developer can begin without rediscovering the work;
- record important false leads or completed analysis under "Do not redo" / "Important context" when repeating them would waste meaningful time;
- never put secrets, credentials, private absolute user paths, unnecessary personal data, raw chats, or sensitive conversation content into continuity docs;
- update `CHANGELOG.md` when a meaningful user-visible, compatibility, migration, security, data/provenance, or release change occurred; skip trivial refactors and formatting-only work.

Document decisions that are expensive to rediscover, especially:

- architecture;
- public interfaces;
- data formats;
- migrations;
- licensing;
- unusual performance trade-offs;
- security boundaries;
- non-obvious external dependencies.

Do not create process documents merely to create process documents.

A meaningful work session is not complete if the implementation changed materially but `STATUS.md` / `docs/HANDOVER.md` still describe an obsolete state.

## 13. Project license and contribution model

At project initialization, do not merely ask for a license name. Proactively analyze the intended product/distribution model and recommend the strongest-fitting license strategy.

The recommendation should normally include:

- the preferred project license and why it fits;
- one or two credible alternatives when they materially differ;
- commercial-use and redistribution implications;
- important copyleft/patent/NOTICE considerations;
- whether external contributions change the recommendation;
- whether no contributor agreement, DCO, CLA, or copyright assignment is appropriate and why.

Explicitly determine:

- intended distribution model;
- project license;
- whether commercial use is intended;
- whether the source model is open-source, proprietary, source-available, mixed, or internal;
- whether external contributions are accepted;
- whether future relicensing or dual licensing is plausible;
- whether a CLA, DCO, copyright assignment, or no contributor agreement is appropriate.

Do not add a CLA automatically. Recommend one only when its legal/strategic benefit justifies contributor friction, especially when relicensing, dual licensing, or centralized commercial rights may matter.

Do not pretend uncertain licensing questions are settled facts. For unusual licenses, high-stakes commercial distribution, or ambiguous rights, flag the uncertainty and prefer authoritative license sources or qualified legal review.

Record the decision in `PROJECT.md` and follow `docs/LICENSING.md`.

## 14. Definition of done

A coherent change is done when applicable:

- behavior is implemented;
- relevant tests/checks pass;
- obvious regressions are checked;
- no new secret/private-path leakage is introduced;
- new dependencies pass cost and license gates;
- required repository-host settings are verified after human changes;
- destructive persistent-data changes have an appropriate recovery path when applicable;
- documentation is updated where needed;
- `STATUS.md` reflects the actual current phase/objective/state and next concrete action;
- `docs/HANDOVER.md` contains enough current context for a new agent/user to resume without chat history;
- continuation-critical decisions or verification results do not exist only in chat;
- `CHANGELOG.md` is updated when the project uses one and the change is release-/user-relevant;
- repository artifacts persist only necessary project facts, not raw or sensitive conversation content;
- generated artifacts intended for publication are sanitized;
- performance requirements are measured when relevant;
- known limitations are explicit.

## 15. Decision priority

When constraints compete, use this order unless the project explicitly overrides it:

1. security and data integrity;
2. correctness;
3. license and zero-cost compliance;
4. product quality and user impact;
5. iteration speed;
6. maintainability;
7. elegance;
8. process ceremony.

Speed should come from good engineering judgment, not from lowering the first four standards.
