// The domain model every provider maps into and the web app renders.
// Fields a source can't know are null — the UI says "unknown" honestly.

export type Vote = 'approved' | 'suggested' | 'none' | 'waiting' | 'rejected'

export type RunStatus = 'ok' | 'failed' | 'running' | 'none'

export type PullSource = 'ado' | 'bitbucket'

export interface Person {
  name: string
  id: string | null
}

export interface Reviewer extends Person {
  vote: Vote
  required: boolean
}

export interface Pull {
  source: PullSource
  id: number
  /** Human-readable handle, e.g. "Web.App!123" */
  key: string
  title: string
  url: string
  repo: string
  author: Person
  createdAt: number | null
  updatedAt: number | null
  /** When the PR completed/merged — null while open. */
  closedAt: number | null
  isDraft: boolean
  mergeBlocked: boolean
  /** Branch the PR merges into (e.g. develop, release/2.5) — null when unknown. */
  targetBranch: string | null
  reviewers: Reviewer[]
  /** Team/group reviewers (ADO containers like SG_Developers) — you might be inside one. */
  groupReviewers: { name: string; vote: Vote }[]
  ci: RunStatus
}

export interface Run {
  source: PullSource
  id: number
  pipeline: string
  status: RunStatus
  branch: string
  finishedAt: number | null
  url: string
}

export type StatusCategory = 'new' | 'indeterminate' | 'done'

export interface Issue {
  source: 'jira'
  key: string
  summary: string
  status: string
  statusCategory: StatusCategory
  /** Identity used for matching (email), when the site exposes it. */
  assignee: string | null
  assigneeName: string | null
  priority: string | null
  url: string
  updatedAt: number | null
  blocked: boolean
}

export interface ProviderResult {
  pulls: Pull[]
  /** Recently completed PRs (for shipped-lists); open PRs stay in `pulls`. */
  mergedPulls: Pull[]
  runs: Run[]
  issues: Issue[]
}

export interface ProviderStatus {
  id: string
  label: string
  ok: boolean
  error: string | null
  fetchedAt: number | null
  tookMs: number | null
}

/** A pull of mine, annotated with who it's waiting on. */
export interface OwnPull extends Pull {
  waitingOn: string[]
}

/** A pull needing my eyes — via a direct assignment, or via a group I'm likely in. */
export interface ReviewPull extends Pull {
  via: string | null
}

export interface Lanes {
  needsMyReview: ReviewPull[]
  myPulls: OwnPull[]
  myIssues: Issue[]
  /** My PRs merged in the last 7 days — the "shipped" list. */
  myMerged: Pull[]
  /** Open PRs from bots (Snyk, Dependabot, Renovate) — corralled, not mixed in. */
  botPulls: Pull[]
  runs: Run[]
}

/** One row of the team pulse — counts only, deliberately no rankings. */
export interface PersonPulse {
  name: string
  openPulls: number
  reviewsOwed: number
  openIssues: number
  blockedIssues: number
}

export interface TeamState {
  /** Every open non-draft PR, oldest first — the wall of shame-free pressure. */
  stalePulls: Pull[]
  people: PersonPulse[]
  blockedIssues: Issue[]
}

export interface StateSnapshot {
  generatedAt: number
  me: { name: string }
  lanes: Lanes
  team: TeamState
  /** Copy-pasteable standup draft; blockers included only when real. */
  brief: string
  release: {
    branches: { name: string; repo: string; openPulls: number; open: { key: string; title: string; url: string; ticket: string | null }[]; mergedRecently: number; pipeline: Run | null }[]
    unreleased: { key: string; ticket: string | null; title: string; url: string; targetBranch: string | null; closedAt: number | null }[]
  }
  providers: ProviderStatus[]
}
