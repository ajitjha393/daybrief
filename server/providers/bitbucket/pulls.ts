import type { Pull, Reviewer } from '../../../shared/types.js'
import { ms, pullKey } from '../../../shared/normalize.js'
import type { BitbucketConfig } from '../../config.js'
import { bbGet } from './api.js'
import { BbPullDetailSchema, BbPullListSchema, type BbParticipant, type BbPull } from './schemas.js'

const DETAIL_LIMIT = 25
const DETAIL_PARALLEL = 5

// The list payload doesn't include reviewers — the newest PRs get one
// detail call each for participants. Merge checks remain unknowable here.
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
  await enrichReviewers(cfg, out)
  return out
}

async function enrichReviewers(cfg: BitbucketConfig, pulls: Pull[]): Promise<void> {
  const targets = [...pulls]
    .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
    .slice(0, DETAIL_LIMIT)
  for (let i = 0; i < targets.length; i += DETAIL_PARALLEL) {
    await Promise.all(
      targets.slice(i, i + DETAIL_PARALLEL).map(async (pull) => {
        try {
          const detail = await bbGet(
            cfg,
            `/repositories/${encodeURIComponent(cfg.workspace)}/${encodeURIComponent(pull.repo)}/pullrequests/${pull.id}`,
            BbPullDetailSchema,
          )
          pull.reviewers = reviewersFromParticipants(detail.participants)
        } catch {
          // reviewer detail is additive — a failure leaves the list empty
        }
      }),
    )
  }
}

export function reviewersFromParticipants(participants: BbParticipant[]): Reviewer[] {
  return participants
    .filter((p) => p.role === 'REVIEWER')
    .map((p) => ({
      name: p.user?.display_name ?? 'unknown',
      id: p.user?.nickname ?? null,
      vote: p.approved ? 'approved' : p.state === 'changes_requested' ? 'rejected' : 'none',
      required: false,
    }))
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
