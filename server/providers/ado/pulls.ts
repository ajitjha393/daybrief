import type { Pull, Reviewer, RunStatus } from '../../../shared/types.js'
import { adoVote, ms, pullKey } from '../../../shared/normalize.js'
import type { AdoConfig } from '../../config.js'
import { adoGet } from './api.js'
import { AdoPrStatusSchema, AdoPullSchema, adoListSchema, type AdoPull } from './schemas.js'

const CI_ENRICH_LIMIT = 30 // newest PRs get a statuses call; one page ≈ one poll budget
const CI_PARALLEL = 6

// One call per project returns active PRs across all its repos; filter to
// the configured repo list (empty list = everything in the project).
export async function fetchPulls(cfg: AdoConfig): Promise<Pull[]> {
  const out: Pull[] = []
  const enrichable: { pull: Pull; project: string; repoId: string }[] = []
  const errors: string[] = []
  for (const project of cfg.projects) {
    let data
    try {
      data = await adoGet(
        cfg,
        `${encodeURIComponent(project)}/_apis/git/pullrequests?searchCriteria.status=active&$top=200&api-version=7.1`,
        adoListSchema(AdoPullSchema),
      )
    } catch (e) {
      // One bad project name (or a project you lost access to) must not
      // blank every other project's lanes.
      errors.push(`${project}: ${e instanceof Error ? e.message : String(e)}`)
      continue
    }
    for (const raw of data.value) {
      const repo = raw.repository?.name
      if (cfg.repos.length > 0 && (repo === undefined || !cfg.repos.includes(repo))) continue
      const pull = normalizePull(raw, cfg.org, project)
      out.push(pull)
      const repoId = raw.repository?.id
      if (repoId !== undefined) enrichable.push({ pull, project, repoId })
    }
  }
  if (errors.length === cfg.projects.length) throw new Error(errors.join(' · '))
  for (const err of errors) console.error(`\x1b[2m◆ ado (pulls): ${err}\x1b[0m`)
  await enrichCi(cfg, enrichable)
  return out
}

// PR-level CI: the statuses endpoint is one call per PR, so only the newest
// slice gets enriched — the ones people are actually looking at.
async function enrichCi(cfg: AdoConfig, all: { pull: Pull; project: string; repoId: string }[]): Promise<void> {
  const targets = [...all]
    .sort((a, b) => (b.pull.createdAt ?? 0) - (a.pull.createdAt ?? 0))
    .slice(0, CI_ENRICH_LIMIT)
  for (let i = 0; i < targets.length; i += CI_PARALLEL) {
    await Promise.all(
      targets.slice(i, i + CI_PARALLEL).map(async ({ pull, project, repoId }) => {
        try {
          const data = await adoGet(
            cfg,
            `${encodeURIComponent(project)}/_apis/git/repositories/${repoId}/pullRequests/${pull.id}/statuses?api-version=7.1`,
            adoListSchema(AdoPrStatusSchema),
          )
          pull.ci = ciFromStatuses(data.value)
        } catch {
          // statuses are additive — a failure leaves ci at 'none'
        }
      }),
    )
  }
}

/** Latest state per context wins; any failure is a failure. */
export function ciFromStatuses(statuses: { state: string; context?: { name?: string } }[]): RunStatus {
  const latest = new Map<string, string>()
  for (const s of statuses) latest.set(s.context?.name ?? '', s.state)
  const states = [...latest.values()]
  if (states.length === 0) return 'none'
  if (states.some((s) => s === 'failed' || s === 'error')) return 'failed'
  if (states.some((s) => s === 'pending' || s === 'notSet')) return 'running'
  if (states.some((s) => s === 'succeeded')) return 'ok'
  return 'none'
}

// Recently completed PRs — the raw material for "shipped" lists. One page
// per project, newest completions first; consumers filter by author/date.
export async function fetchMergedPulls(cfg: AdoConfig): Promise<Pull[]> {
  const out: Pull[] = []
  for (const project of cfg.projects) {
    let data
    try {
      data = await adoGet(
        cfg,
        `${encodeURIComponent(project)}/_apis/git/pullrequests?searchCriteria.status=completed&$top=50&api-version=7.1`,
        adoListSchema(AdoPullSchema),
      )
    } catch {
      continue // merged history is a nice-to-have; open-PR errors already report
    }
    for (const raw of data.value) {
      const repo = raw.repository?.name
      if (cfg.repos.length > 0 && (repo === undefined || !cfg.repos.includes(repo))) continue
      out.push(normalizePull(raw, cfg.org, project))
    }
  }
  return out
}

export function normalizePull(raw: AdoPull, org: string, project: string): Pull {
  const repo = raw.repository?.name ?? 'unknown'
  const reviewers: Reviewer[] = raw.reviewers
    .filter((r) => !r.isContainer)
    .map((r) => ({
      name: r.displayName ?? 'unknown',
      id: r.uniqueName ?? r.id ?? null,
      vote: adoVote(r.vote),
      required: r.isRequired,
    }))
  // Groups/teams (SG_* containers) aren't people, but they can include you —
  // kept separately so the lanes can reason about them.
  const groupReviewers = raw.reviewers
    .filter((r) => r.isContainer)
    // "[TEAM FOUNDATION]\SG_Developers" → "SG_Developers"
    .map((r) => ({ name: (r.displayName ?? 'group').split('\\').pop() ?? 'group', vote: adoVote(r.vote) }))
  return {
    source: 'ado',
    id: raw.pullRequestId,
    key: pullKey(repo, raw.pullRequestId),
    title: raw.title,
    url: `https://dev.azure.com/${org}/${encodeURIComponent(project)}/_git/${encodeURIComponent(repo)}/pullrequest/${raw.pullRequestId}`,
    repo,
    author: {
      name: raw.createdBy?.displayName ?? 'unknown',
      id: raw.createdBy?.uniqueName ?? raw.createdBy?.id ?? null,
    },
    createdAt: ms(raw.creationDate),
    updatedAt: null, // the ADO list payload doesn't carry a last-activity time
    closedAt: ms(raw.closedDate),
    isDraft: raw.isDraft,
    mergeBlocked: raw.mergeStatus === 'conflicts' || raw.mergeStatus === 'failure',
    targetBranch: raw.targetRefName !== undefined ? raw.targetRefName.replace(/^refs\/heads\//, '') : null,
    reviewers,
    groupReviewers,
    ci: 'none', // PR-level policy checks are a v0.2 call
  }
}
