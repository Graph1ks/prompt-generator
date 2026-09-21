# Contribution Policy

This document defines whether and how outside contributions are accepted.

## Before starting

Read:

- `AGENTS.md`
- `PROJECT.md`
- `SECURITY.md`
- `docs/LICENSING.md`

Project-specific rules in `PROJECT.md` override generic template defaults when they are explicit.

## Is this project accepting outside code contributions?

Check `PROJECT.md`.

The default public mode for repositories created from this template is **owner-controlled source**. In that mode, outside code contributions are not accepted unless the project explicitly opts in.

If `PROJECT.md` says:

- **owner-controlled**: do not open unsolicited pull requests; Issues may still be used for bug reports or suggestions when enabled;
- **community**: outside contributions are accepted under the documented review and contributor-rights rules.

Public visibility alone is not an invitation to contribute code.

Issues and Discussions may still be available for bug reports, suggestions, Q&A, and feedback. Their presence does not guarantee implementation, roadmap priority, or maintainer response.

See `docs/REPOSITORY_VISIBILITY.md`.

## Engineering expectations

Keep changes focused and production-quality.

A contribution should normally:

- solve a concrete problem;
- follow existing architecture unless the change intentionally improves it;
- include relevant tests;
- avoid unrelated rewrites;
- introduce no secret/private-path leakage;
- introduce no paid required dependency;
- introduce no license-incompatible dependency or asset;
- update affected documentation.

## Dependencies

Do not add a dependency solely for convenience without checking:

- whether the current stack already solves the problem;
- production cost;
- license;
- transitive impact;
- maintenance health;
- size/complexity.

Include the reasoning in the pull request when the dependency is non-trivial.

## Contributor rights

The project's contribution mechanism is defined in `PROJECT.md`.

If it is still marked undecided, the project owner should decide whether no additional mechanism, DCO, CLA, or another contributor-rights model is appropriate before actively soliciting substantial outside contributions.

## Security issues

Do not publish exploitable vulnerability details in a public issue. Follow `SECURITY.md`.
