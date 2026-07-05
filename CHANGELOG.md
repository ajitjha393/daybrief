# Changelog

## 0.5.0 — 2026-07-05

### Added
- **Release radar** — release/* branches in play (open PRs, merges this
  week, branch pipeline status) and keyed mainline merges that appear in
  no release PR. Ticket-key correlation from PR titles; unkeyed changes
  are never guessed at; fully quiet for trunk-only teams

## 0.4.0 — 2026-07-05

### Added
- **Morning digest** — `daybrief digest` posts the team brief to a
  Teams/Slack incoming webhook (`--dry-run` previews; the server also
  schedules it daily at `digest.at`). Covers open-PR age, who reviews are
  pending with, red pipelines, blocked work and the bot backlog
- **ADO PR-level CI** — statuses per PR (newest slice), shown as badges
  on cards: failed loud, running amber, ok quiet
- **Bitbucket reviewers** — per-PR participant detail; approvals and
  change-requests map to votes
- **Production polish** — favicon, tab-title review count, skeleton
  loading, sticky blurred header, focus-visible rings, reduced-motion

## 0.3.0 — 2026-07-05

### Added
- **Standup draft, PO/SM-grade** — Done (your PRs merged in the last 7d,
  with target branches and ages) → Doing → PRs → Reviews owed → Blockers
  (only when real)
- **Automated-PR corral** — Snyk/Dependabot/Renovate PRs get their own
  collapsed section and never queue as your reviews or on the team wall
- **Merged-PR fetch** (ADO completed status, best-effort per project)

### Fixed
- Team pulse shows one row per human — display-name and account-name
  variants merge by canonical name and identity overlap
- Team view layout: two-column grid, full-width blocked lane

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
