# Release Checklist

Use the sections that apply. Delete project-irrelevant items rather than turning the checklist into ceremony.

## Product

- [ ] Release scope is intentional.
- [ ] Critical user flows were smoke-tested.
- [ ] Known limitations are documented where users need them.
- [ ] Version/release notes are correct.
- [ ] `CHANGELOG.md` is updated when changelog tracking is enabled; entries describe meaningful changes rather than raw commit history.

## Quality

- [ ] Relevant tests pass.
- [ ] Type/lint/static checks pass where applicable.
- [ ] Production build/package succeeds from a clean state.
- [ ] Migrations were tested where applicable.
- [ ] Performance targets were measured where applicable.

## Zero-cost gate

- [ ] No new required paid software/service/API was introduced.
- [ ] "Free tier" services were not mistaken for guaranteed zero-cost production dependencies.
- [ ] Core functionality remains usable without optional paid integrations, if any exist.

## Licensing

- [ ] Project license/terms match the intended distribution model.
- [ ] New dependencies/assets/data sources were license-reviewed.
- [ ] Commercial compatibility was checked when relevant.
- [ ] Required attribution/NOTICE material is included.
- [ ] Contributor-rights requirements are satisfied.
- [ ] Shipped third-party dependencies/components are inventoryable, including relevant transitive redistribution obligations.
- [ ] Data/model/assets/documentation rights were checked separately where applicable.
- [ ] No non-commercial/research-only/field-of-use restricted material is unintentionally shipped.

## Security and privacy

- [ ] No credentials/secrets are present in tracked files or release artifacts.
- [ ] Logs/reports/examples contain no unnecessary private local paths.
- [ ] Test fixtures contain no unintended personal/production data.
- [ ] Source/docs/logs/fixtures/reports/commit messages/release artifacts contain no unnecessary raw chat transcripts, prompts, private discussions, or sensitive conversation content.
- [ ] Debug endpoints/modes are not unintentionally exposed.
- [ ] Security-sensitive configuration has safe defaults.
- [ ] `SECURITY.md` has a real reporting path; template reporting text is removed before public production release.
- [ ] Destructive persistent-data changes have an appropriate tested recovery path when applicable.

## Repository visibility / publication

- [ ] `docs/BOOTSTRAP.md` was completed for a newly created repository.
- [ ] Human-only GitHub settings were applied and then re-verified; unverified settings are not treated as complete.
- [ ] Repository visibility and collaboration mode match `PROJECT.md`.
- [ ] Pull request / Issues / Projects / Discussions / Wiki / Pages / fork settings match the selected repository mode.
- [ ] If changing PRIVATE → PUBLIC, the publication audit in `docs/REPOSITORY_VISIBILITY.md` was completed.
- [ ] Public contribution policy matches the selected contributor-rights strategy.
- [ ] Repository history and generated artifacts were checked for unintended private information before first public release.
- [ ] `python scripts/repo_audit.py --history` passes before first public release / PRIVATE → PUBLIC, or each finding has an explicit safe exception.

## Continuity / handover

- [ ] `STATUS.md` reflects the actual current phase, objective, state, last verified checks, blocker, and next concrete action.
- [ ] `docs/HANDOVER.md` reflects the actual implementation state, important files, decisions, known problems, verification, next work, and traps.
- [ ] A competent new developer/agent could resume without relying on chat history.
- [ ] Continuation-critical information is not stored only in chat.
- [ ] Durable decision rationale lives in the appropriate authoritative document rather than only in handover prose.
- [ ] Repository documentation records project facts/decisions rather than conversation history.

## Repository hygiene

- [ ] Temporary files and debug artifacts are removed.
- [ ] Public documentation uses project-relative/sanitized paths.
- [ ] Generated outputs intended for release are reproducible enough for the project.
