import type { Pull, Reviewer } from '../../../shared/types.js'
import { adoVote, ms, pullKey } from '../../../shared/normalize.js'
import type { AdoConfig } from '../../config.js'
import { adoGet } from './api.js'
import { AdoPullSchema, adoListSchema, type AdoPull } from './schemas.js'

// One call per project returns active PRs across all its repos; filter to
// the configured repo list (empty list = everything in the project).
export async function fetchPulls(cfg: AdoConfig): Promise<Pull[]> {
  const out: Pull[] = []
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
      out.push(normalizePull(raw, cfg.org, project))
    }
  }
  if (errors.length === cfg.projects.length) throw new Error(errors.join(' · '))
  for (const err of errors) console.error(`\x1b[2m◆ ado (pulls): ${err}\x1b[0m`)
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
    isDraft: raw.isDraft,
    mergeBlocked: raw.mergeStatus === 'conflicts' || raw.mergeStatus === 'failure',
    targetBranch: raw.targetRefName !== undefined ? raw.targetRefName.replace(/^refs\/heads\//, '') : null,
    reviewers,
    groupReviewers,
    ci: 'none', // PR-level policy checks are a v0.2 call
  }
}
