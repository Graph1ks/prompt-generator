# Security Policy

## Security posture

This template targets a practical, risk-proportionate security baseline for solo developers and small teams.

The goal is strong everyday engineering hygiene without unnecessary enterprise complexity.

## Never commit or publish

- passwords;
- API keys;
- OAuth/client secrets;
- personal access tokens;
- private keys or certificates containing private material;
- production connection strings with credentials;
- real customer/user private data;
- session cookies/tokens;
- private database dumps;
- unredacted crash dumps containing sensitive data.

If a secret is committed, assume exposure and rotate/revoke it. Removing it from the latest commit alone is not sufficient.

## Local paths and personal identifiers

Public artifacts should not expose machine-specific paths or unnecessary personal identifiers.

Avoid publishing paths such as:

```text
C:\Users\real-user\project
/Users/real-user/project
/home/real-user/project
```

Use:

```text
<repo-root>/
<user-home>/
./data/
```

Apply this to documentation, logs, test snapshots, generated reports, benchmark output, screenshots, exceptions, and support bundles.

## Configuration

- Keep secrets in environment variables or ignored local secret stores/configuration.
- Commit only sanitized examples such as `.env.example`.
- Fail clearly when required secret configuration is absent.
- Do not print secrets during startup or error reporting.

## Dependencies

Before adoption:

- confirm license compatibility;
- confirm zero-cost production use;
- avoid abandoned/high-risk packages when a reasonable alternative exists;
- keep dependency count proportionate to value;
- use ecosystem lockfiles when applicable.

Security updates should be evaluated based on exploitability and project exposure, not ignored solely because the application is small.

## Input and boundary handling

Validate data at trust boundaries, including:

- network requests;
- file imports;
- command-line input used in shell/process calls;
- archive extraction;
- database queries;
- plugin/extensions;
- deserialization;
- external data feeds.

Use parameterized database queries and safe process invocation APIs.

## Filesystem safety

- Normalize and validate externally supplied paths where relevant.
- Prevent unintended traversal outside allowed roots.
- Avoid destructive recursive operations without explicit target validation.
- Treat archive extraction paths as untrusted.

## Network exposure

Do not expose a service publicly when local-only binding satisfies the product.

When network access is required, document:

- bind interface;
- authentication model;
- trusted/untrusted clients;
- TLS expectations;
- data transmitted.

## Reporting a vulnerability

**TEMPLATE BLOCKER:** Before a public production release, replace this section with the project's actual private reporting channel or an explicitly chosen GitHub private-vulnerability-reporting workflow where available.

Do not claim the public security setup is complete while this template text remains.

Do not ask reporters to post exploitable security issues publicly before a fix is available.
