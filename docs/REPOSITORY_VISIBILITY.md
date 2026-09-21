# Repository Visibility & Collaboration Policy

Repository visibility and collaboration mode are explicit project decisions.

A repository being public does **not** automatically mean that the project accepts outside code contributions, uses an open-source license, or follows community governance.

A repository being private does **not** make it an appropriate secret store or bypass licensing requirements.

## 1. Supported repository modes

Choose one mode in `PROJECT.md`.

After choosing it, apply and verify the repository-host settings in `docs/BOOTSTRAP.md`. Settings requiring human action are not considered complete until they have been re-checked.

### PRIVATE — owner-controlled development

Use for unreleased, proprietary, experimental, internal, or otherwise non-public work.

Default posture:

- owner-only access unless collaborators are required;
- external contribution workflow not applicable;
- private fork controls are applied only where the repository owner/account type exposes them; otherwise record the fork policy as `not-applicable`;
- Issues may remain enabled as an internal/reporting inbox when useful;
- Discussions normally remain disabled for private solo-development unless collaboration/community use exists;
- Projects/Wiki/Pages disabled unless they provide concrete value;
- the repository remains reasonably publication-safe because it may become public later.

### PUBLIC — owner-controlled source

This is the default mode for public repositories.

The source is publicly visible, but development remains controlled by the owner and explicitly authorized collaborators.

Default posture:

- outside code contributions are not accepted;
- pull requests should be restricted to collaborators where GitHub settings permit it, otherwise disabled;
- public Issues are normally enabled for bug reports, suggestions, compatibility reports, and user feedback;
- public Discussions are normally enabled when the project has users/community and benefits from Q&A, ideas, feedback, or general discussion;
- Projects/Wiki/Pages remain disabled unless intentionally used;
- the project license is selected explicitly;
- public release/privacy audit is required before first publication.

### PUBLIC — community contributions enabled

Use only when outside contributions are an intentional product/project decision.

Before enabling this mode, define:

- contribution workflow;
- review/maintainer policy;
- project license;
- contributor-rights model;
- DCO / CLA / no additional agreement / copyright assignment decision;
- testing requirements;
- dependency/license gate;
- security reporting path.

Do not enable community contributions by accident merely because the repository is public.

## 2. PUBLIC repository hard rule

Treat every committed item as potentially permanent public information.

Assume public material can be:

- cloned;
- forked;
- indexed;
- cached;
- mirrored;
- archived;
- quoted;
- retained after later deletion.

Therefore never publish:

- passwords;
- API keys;
- access tokens;
- private keys;
- credentials;
- private customer/user data;
- private database dumps;
- unnecessary personal identifiers;
- confidential internal information not required by the project;
- machine-specific private user information.

Avoid public machine-specific paths such as:

```text
C:\Users\<name>\...
/Users/<name>/...
/home/<name>/...
```

Use project-relative or sanitized forms:

```text
<repo-root>/
<user-home>/
./data/
./build/
```

Apply this to source, documentation, logs, generated reports, test fixtures, screenshots, benchmark output, examples, crash reports, and committed build artifacts.

## 3. PUBLIC owner-controlled contribution policy

The default public mode is **visible source, controlled development**.

Outside users may:

- read the source subject to the project's license;
- report bugs if Issues are enabled;
- suggest improvements if Issues are enabled;
- use or redistribute the project only according to the project's actual license.

Outside users are not automatically invited to:

- submit pull requests;
- change project architecture;
- influence roadmap decisions;
- demand feature implementation;
- become maintainers.

If unsolicited external pull requests are not accepted, state that clearly in `CONTRIBUTING.md`.

This reduces review overhead, contributor-rights complexity, license provenance risk, and roadmap drift.

## 4. Issues and Discussions

Issues and Discussions are independent from code contribution rights.

### Issues

Issues should normally remain enabled for public user-facing projects because they provide a useful inbox for:

- reproducible bug reports;
- compatibility problems;
- documentation defects;
- feature suggestions;
- user-visible regressions;
- structured product feedback.

Private projects may also keep Issues enabled when they are useful as an owner/collaborator inbox.

### Discussions

For public projects with actual users/community, Discussions are normally useful for:

- Q&A;
- ideas and exploratory proposals;
- broader feedback;
- usage questions;
- community conversation that is not yet a concrete engineering task.

For private solo-development repositories, Discussions are normally unnecessary and may remain disabled.

### Agent behavior

Enabled Issues/Discussions do **not** become an automatic AI-agent backlog.

Unless the user explicitly triggers work on them, agents must not proactively:

- scan them;
- prioritize them;
- respond to them;
- label/close them;
- convert them into roadmap commitments;
- implement requested changes.

When the user asks for Issue/Discussion work, first validate it against current repository state, tests, scope, architecture, `PROJECT.md`, and `STATUS.md`.

Classify feedback factually as applicable, for example:

- reproducible bug;
- valid enhancement/feedback;
- duplicate or already resolved;
- obsolete;
- insufficient information;
- outside current scope.

Then provide the user with the relevant engineering/product impact. Implementation requires an explicit user instruction to build/fix/implement it.

Community feedback is input, not authority over roadmap or architecture.

## 5. Security reports

Do not use ordinary public Issues for exploitable vulnerability details.

Before a public production release, `SECURITY.md` must define the intended reporting path.

Public reports should contain only information safe to disclose publicly.

## 6. Forks and copying

For public repositories, assume the repository can be copied independently of the original repository lifecycle.

Do not publish material whose uncontrolled copying would create an unacceptable confidentiality problem.

The project license determines legal permissions. Public visibility alone does not place code in the public domain.

## 7. PUBLIC licensing gate

Before meaningful public release, explicitly determine:

- project license;
- intended commercial-use rights;
- redistribution rights;
- modification rights;
- attribution requirements;
- patent considerations;
- contributor model.

Public visibility and open-source licensing are separate decisions.

A public repository with no open-source license does not automatically grant broad reuse rights. Conversely, if the intent is true open-source distribution, choose an appropriate OSI-style license intentionally.

See `docs/LICENSING.md`.

## 8. PRIVATE repository rules

Private repositories reduce public exposure but remain subject to baseline security and licensing rules.

Still do not commit:

- credentials;
- private keys;
- access tokens;
- unnecessary personal information;
- unrelated sensitive production data.

Private repositories may contain legitimate project-confidential information when necessary, such as:

- unreleased architecture;
- internal roadmap;
- unpublished product design;
- internal benchmarking;
- commercial strategy directly relevant to development.

Store only what materially supports the project.

## 9. PRIVATE licensing rules

Private development does not bypass third-party licenses.

Dependencies, frameworks, models, fonts, datasets, code, and assets must still be compatible with the **intended final use and distribution**.

A non-commercial or research-only dependency does not become commercially suitable merely because development happens privately.

## 10. Access policy

Use least privilege appropriate to the project.

Default for a solo project:

**Owner only.**

Add collaborators intentionally and remove access when it is no longer needed.

Avoid unnecessary private forks/copies when the same development workflow can be achieved without them.

## 11. Visibility changes are release events

### PRIVATE → PUBLIC

Treat this as a publication release.

Run `python scripts/repo_audit.py --history` and complete the repository-settings verification in `docs/BOOTSTRAP.md`.

Required review:

- repository history;
- current tracked files;
- documentation;
- generated reports;
- test fixtures;
- screenshots;
- example configuration;
- committed databases;
- benchmark output;
- build artifacts;
- dependency licenses;
- datasets/assets;
- project license;
- attribution/NOTICE requirements;
- contribution model;
- GitHub repository settings.

Verify specifically:

- no secrets;
- no credentials;
- no private user/customer data;
- no unintended local usernames/paths;
- no internal-only documentation that should remain private;
- no third-party material without redistribution rights;
- no non-commercial/research-only material conflicting with intended use.

### PUBLIC → PRIVATE

Do not assume previous publication is revoked.

Existing clones, forks, mirrors, caches, and archives may remain available.

Anything once published must be treated as potentially permanent.

## 12. Recommended GitHub configuration

### PRIVATE default

- Visibility: Private
- Access: owner only unless collaboration is needed
- Pull requests: collaborators only / internal workflow only
- Issues: enabled when useful as an owner/collaborator reporting inbox
- Projects: disabled unless actively used
- Discussions: disabled unless private collaboration actually benefits from them
- Wiki: disabled
- Pages: disabled unless required
- Forks: disabled only where a separate control is exposed and unnecessary; otherwise not-applicable

### PUBLIC owner-controlled default

- Visibility: Public
- Pull requests: collaborators only where available; otherwise disabled
- External code contributions: not accepted
- Issues: enabled by default for bug reports and user feedback
- Projects: disabled unless actively used
- Discussions: enabled by default when the project is community/user-facing; otherwise disabled
- Wiki: disabled
- Pages: disabled unless required
- `SECURITY.md`: present
- `CONTRIBUTING.md`: explicit about outside contributions
- License: intentionally selected before meaningful release

### PUBLIC community default

- Visibility: Public
- Pull requests: enabled
- Issues: enabled unless there is a reason not to
- Projects: disabled unless actively used
- Discussions: enabled when community Q&A/feedback is useful
- Contribution guidelines: required
- Contributor-rights model: decided
- Dependency/license gate: required
- Security reporting process: defined
- Maintainer/review policy: defined

## 13. Project initialization fields

Record these in `PROJECT.md`:

```text
Repository visibility:
private / public

Collaboration mode:
owner-controlled / community

External pull requests:
disabled / collaborators-only / enabled

Issues:
enabled / disabled

Projects:
enabled / disabled

Discussions:
enabled / disabled

Wiki:
enabled / disabled

Pages:
enabled / disabled / not-applicable

Fork policy:
disabled / allowed / not-applicable

Note: public repositories must be treated as copyable/forkable. Private fork controls depend on repository ownership/account capabilities; do not invent a setting that the UI does not expose.

Distribution model:
open-source / proprietary / commercial / dual-license /
source-available / internal / undecided

Project license:
<license / proprietary / undecided>

External contributions:
accepted / not accepted / undecided

Contributor model:
none / DCO / CLA / copyright assignment / undecided
```

When undecided, default to the more restrictive option until the decision is made.
