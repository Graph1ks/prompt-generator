# Project Bootstrap & Repository Settings

Use this immediately after creating a repository from this template.

Repository files are copied by the template, but repository-host settings must be configured and then verified separately.

A project is **not bootstrap-complete** until both the files and the repository settings match `PROJECT.md`.

## 1. Fill project decisions first

Complete at minimum in `PROJECT.md`:

- product name and purpose;
- repository visibility;
- collaboration mode;
- external pull-request policy;
- Issues policy;
- fork policy, or mark it not-applicable when the account/repository type does not expose a separate control;
- distribution/deployment model;
- code license strategy;
- data/model/assets licensing where relevant;
- contributor model;
- security/privacy assumptions;
- QA commands.

Do not configure GitHub from guesses. Configure it from the recorded project decisions.

## 2. Required GitHub settings

### PRIVATE — owner-controlled

Recommended default:

- Visibility: Private
- Access: owner only unless collaboration is required
- Pull requests: collaborators/internal only
- Issues: enabled when useful as an owner/collaborator inbox
- Projects: disabled unless actively used
- Discussions: disabled unless private collaboration needs them
- Wiki: disabled
- Pages: disabled unless required
- Forking: disable only where the repository/account type exposes that control and it is unnecessary; otherwise record `not-applicable`

### PUBLIC — owner-controlled source

Recommended default:

- Visibility: Public
- External code contributions: not accepted
- Pull requests: collaborators-only where GitHub permits it; otherwise disabled
- Issues: enabled by default for public bug/user feedback
- Projects: disabled unless actively used
- Discussions: enabled when the project is community/user-facing; otherwise disabled
- Wiki: disabled
- Pages: disabled unless required
- Project license/terms: explicitly selected
- Security reporting path: configured before public production release

### PUBLIC — community

Recommended default:

- Visibility: Public
- Pull requests: enabled
- Issues: enabled unless intentionally disabled
- Projects: disabled unless actively used
- Discussions: enabled when community Q&A/feedback is useful
- Contribution policy: complete
- Contributor-rights model: complete
- Security reporting path: configured
- License/NOTICE requirements: complete

## 3. Template repository setting

For the repository that acts as the reusable source template itself, enable:

**GitHub → Settings → General → Template repository**

This is a repository-admin setting. It is not created merely by adding template files.

## 4. Verification rule

After a human changes repository settings, verify them.

Preferred order:

1. If the current AI/tooling has authenticated read access to repository metadata, re-read the settings and compare them against `PROJECT.md`.
2. If authenticated verification is unavailable, the human must check the settings in GitHub and record the result below.
3. Never report bootstrap as complete when a required setting has not been verified.

### Verification record

**Verified on:** YYYY-MM-DD  
**Verified by:** human / authenticated tooling  
**Repository visibility matches PROJECT.md:** yes / no  
**Pull-request policy matches PROJECT.md:** yes / no  
**Issues policy matches PROJECT.md:** yes / no  
**Projects setting matches PROJECT.md:** yes / no  
**Fork policy matches PROJECT.md:** yes / no / not-applicable (for example when no separate setting is exposed)  
**Discussions/Wiki/Pages match PROJECT.md:** yes / no / not-applicable  
**Template repository setting (template repo only):** enabled / disabled / not-applicable  
**License/terms state matches PROJECT.md:** yes / no  
**Security reporting path ready for public production:** yes / no / not-applicable

Any `no` keeps bootstrap incomplete.

Enabled Issues/Discussions are input channels only. Their presence does not authorize an AI agent to scan, triage, respond to, or implement community requests without an explicit user trigger.

## 5. Zero-cost constraint

Do not enable a paid GitHub feature merely to satisfy a generic best practice.

If branch protection, rulesets, or another control requires a paid plan for the chosen repository visibility, do not buy a plan for this template. Use the strongest free controls available and keep the workflow owner-controlled.

## 6. Initialize continuity docs

Before real implementation work begins:

- fill `STATUS.md` with the actual initial phase/objective/state/next action;
- fill `docs/HANDOVER.md` with enough project-specific context to resume work;
- remove template placeholders from both files in generated projects.

After every meaningful work chunk, keep both current.

## 7. First local audit

After filling project files, run:

```bash
python scripts/repo_audit.py
```

Before the first public release or PRIVATE → PUBLIC transition, also run:

```bash
python scripts/repo_audit.py --history
```

For the source template itself, intentional template placeholders can be allowed:

```bash
python scripts/repo_audit.py --template-mode
```

The audit uses only the Python standard library and Git. It reports categories/locations without printing detected secret values.

Fix findings before publication or explicitly document why a finding is a safe intentional exception.
