# Template Guide

This repository is a reusable project starter, not an application framework.

## Create a project

1. Create a new repository from this template.
2. Replace the project placeholders in `README.md` and `PROJECT.md`.
3. Follow `docs/BOOTSTRAP.md`.
4. Select the repository mode in `docs/REPOSITORY_VISIBILITY.md`.
5. Select an appropriate license strategy using `docs/LICENSING.md`.
6. Initialize `STATUS.md` and `docs/HANDOVER.md` with the project's actual starting state.
7. Decide the versioning/release model in `PROJECT.md`. Keep `CHANGELOG.md` for long-lived, versioned, released, or user-facing projects; remove/mark it not-applicable only for genuinely disposable or unversioned work.
8. Run `python scripts/repo_audit.py`.
9. Start development using the resume order in `AGENTS.md`.

## Keep or delete?

Keep:

- `AGENTS.md`
- `PROJECT.md`
- `STATUS.md`
- `CHANGELOG.md` when changelog tracking is enabled
- `docs/HANDOVER.md`
- `SECURITY.md`
- `CONTRIBUTING.md`
- relevant documents under `docs/`
- `scripts/repo_audit.py`

Delete project-irrelevant template material only when it has no future operational value.

## Principle

The template supplies engineering guardrails, not unnecessary ceremony. Durable project intent belongs in `PROJECT.md`; current operational truth belongs in `STATUS.md` and `docs/HANDOVER.md`; meaningful release/product history belongs in `CHANGELOG.md`. Raw conversation history belongs in none of them.
