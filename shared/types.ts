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
  isDraft: boolean
  mergeBlocked: boolean
  reviewers: Reviewer[]
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

export interface Lanes {
  needsMyReview: Pull[]
  myPulls: OwnPull[]
  myIssues: Issue[]
  runs: Run[]
}

export interface StateSnapshot {
  generatedAt: number
  me: { name: string }
  lanes: Lanes
  providers: ProviderStatus[]
}
