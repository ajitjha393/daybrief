import type { Pull } from '../../../shared/types.js'
import { ms, pullKey } from '../../../shared/normalize.js'
import type { BitbucketConfig } from '../../config.js'
import { bbGet } from './api.js'
import { BbPullListSchema, type BbPull } from './schemas.js'

// The Bitbucket PR *list* payload doesn't include reviewers or merge
// checks — those need one call per PR (v0.2). We show what one page of
// list data honestly knows: reviewers empty, mergeBlocked false.
export async function fetchPulls(cfg: BitbucketConfig): Promise<Pull[]> {
  const out: Pull[] = []
  for (const repo of cfg.repos) {
    const data = await bbGet(
      cfg,
      `/repositories/${encodeURIComponent(cfg.workspace)}/${encodeURIComponent(repo)}/pullrequests?state=OPEN&pagelen=50`,
      BbPullListSchema,
    )
    for (const raw of data.values) out.push(normalizePull(raw, cfg.workspace, repo))
  }
  return out
}

export function normalizePull(raw: BbPull, workspace: string, repo: string): Pull {
  return {
    source: 'bitbucket',
    id: raw.id,
    key: pullKey(repo, raw.id),
    title: raw.title,
    url: raw.links?.html?.href ?? `https://bitbucket.org/${workspace}/${repo}/pull-requests/${raw.id}`,
    repo,
    author: {
      name: raw.author?.display_name ?? 'unknown',
      id: raw.author?.nickname ?? null,
    },
    createdAt: ms(raw.created_on),
    updatedAt: ms(raw.updated_on),
    closedAt: null,
    isDraft: false,
    mergeBlocked: false,
    targetBranch: raw.destination?.branch?.name ?? null,
    reviewers: [],
    groupReviewers: [],
    ci: 'none',
  }
}
