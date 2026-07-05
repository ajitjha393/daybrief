# Changelog

## 0.1.0 — 2026-07-05

Initial release: the personal morning brief.

- **Azure DevOps provider** — active PRs with reviewer votes (az-cli or PAT
  auth, BOM-safe parsing), latest run per pipeline
- **Jira provider** — your open issues via JQL, blocked detection from
  status/label conventions
- **Bitbucket provider** — open PRs (list-payload fidelity; reviewer detail
  in v0.2)
- **Lanes** — needs-your-review (oldest first), your PRs with waiting-on,
  your tickets (blocked first), pipelines (failures first)
- **Live dashboard** — React 19 + SSE, light/dark, provider health in the
  header, last-good data survives provider blips
- **`--mock`** — full UI on demo data, zero credentials
- Strict TypeScript throughout, zod-validated boundaries,
  `no-explicit-any` as a lint error, vitest suite, CI matrix
