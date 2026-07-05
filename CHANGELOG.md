# Changelog

## 0.2.0 — 2026-07-05

### Added
- **Team view** (`#team`) — oldest-first PR wall, per-person pulse (counts,
  never rankings), blocked work team-wide; `jira.teamJql` feeds it
- **Group reviewers** — ADO `SG_*` container assignments surface in your
  review lane when the repo is in your footprint (or `groupReviewRepos`),
  marked *via group*
- **Standup draft** — copy-pasteable summary with a Blockers line only when
  something is really blocked
- **Theme toggle** — system/light/dark, persisted
- **Secrets file** — `daybrief.secrets.json` as an env-var alternative
- PR **target-branch** chips; `excludePipelines` filters;
  `includeStatuses` keeps parked states (Pending Deployment) on the board
- Quiet pipelines collapse behind a count; long lists render progressively

### Fixed
- Personal JQL results are trusted as yours (Atlassian hides emails);
  default JQL now fetches recent done-category items so includeStatuses can
  rescue them
- One bad ADO project name no longer blanks the whole provider
- Group display names lose the `[TEAM FOUNDATION]\` prefix

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
