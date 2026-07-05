import type { Issue, Lanes, OwnPull, Person, Pull, PullSource, ProviderResult, Run, RunStatus } from '../shared/types.js'
import { DAY_MS, isPerson } from '../shared/normalize.js'
import { isBotPull } from '../shared/bots.js'
import type { Config } from './config.js'

// The product's actual logic: turning merged provider results into the four
// personal lanes. Everything else is plumbing.

function matchesMe(config: Config, person: Person, source: PullSource): boolean {
  const identity = source === 'ado' ? config.me.ado : config.me.bitbucket
  return isPerson(identity, person.id) || isPerson(config.me.name, person.name)
}

const byOldestFirst = (a: Pull, b: Pull): number => (a.createdAt ?? Number.MAX_SAFE_INTEGER) - (b.createdAt ?? Number.MAX_SAFE_INTEGER)

const RUN_ORDER: Record<RunStatus, number> = { failed: 0, running: 1, ok: 2, none: 3 }

export function computeLanes(config: Config, results: ProviderResult[], now: number = Date.now()): Lanes {
  const allOpen = results.flatMap((r) => r.pulls)
  const merged = results.flatMap((r) => r.mergedPulls)
  const runs = results.flatMap((r) => r.runs)
  const issues = results.flatMap((r) => r.issues)

  const mine = (p: Pull): boolean => matchesMe(config, p.author, p.source)

  // Automation PRs get their own corral — they never queue as your reviews.
  const botPulls = allOpen.filter(isBotPull).sort(byOldestFirst)
  const pulls = allOpen.filter((p) => !isBotPull(p))

  const myMerged = merged
    .filter((p) => mine(p) && p.closedAt !== null && now - (p.closedAt ?? 0) <= 7 * DAY_MS)
    .sort((a, b) => (b.closedAt ?? 0) - (a.closedAt ?? 0))

  // Repos I'm demonstrably active in: authoring or directly reviewing there
  // right now, plus any the config names. When a PR's only pending reviewer
  // is a GROUP (ADO's SG_* containers), membership isn't queryable without
  // Graph API scopes — activity in that repo is the honest proxy for "this
  // probably includes me".
  const activeRepos = new Set<string>(config.ado?.groupReviewRepos ?? [])
  for (const p of pulls) {
    if (mine(p) || p.reviewers.some((r) => matchesMe(config, r, p.source))) activeRepos.add(p.repo)
  }

  // Oldest first — age is the pressure that makes review debt visible.
  const needsMyReview = pulls
    .filter((p) => !p.isDraft && !mine(p))
    .map((p): { p: Pull; via: string | null } | null => {
      if (p.reviewers.some((r) => matchesMe(config, r, p.source) && r.vote === 'none')) return { p, via: null }
      const group = p.groupReviewers.find((g) => g.vote === 'none')
      if (group !== undefined && activeRepos.has(p.repo)) return { p, via: group.name }
      return null
    })
    .filter((x): x is { p: Pull; via: string | null } => x !== null)
    .map(({ p, via }) => ({ ...p, via }))
    .sort(byOldestFirst)

  const myPulls: OwnPull[] = pulls
    .filter(mine)
    .map((p) => ({
      ...p,
      waitingOn: p.reviewers.filter((r) => r.vote === 'none').map((r) => r.name),
    }))
    .sort(byOldestFirst)

  // With the default JQL (assignee = currentUser()) every issue is mine by
  // construction — no identity re-check, which matters because Atlassian
  // privacy settings routinely hide emailAddress. A custom JQL can return
  // anyone's issues, so there we match identity. Some workflows put
  // still-active states (e.g. "Pending Deployment") in the done category;
  // includeStatuses names the ones to keep anyway.
  const personalJql = config.jira !== null && config.jira.jql === null
  const keepStatus = new Set(config.jira?.includeStatuses.map((s) => s.toLowerCase()) ?? [])
  const myIssues: Issue[] = issues
    .filter((i) => personalJql || isPerson(config.me.jira, i.assignee) || isPerson(config.me.name, i.assigneeName))
    .filter((i) => i.statusCategory !== 'done' || keepStatus.has(i.status.toLowerCase()))
    .sort((a, b) => Number(b.blocked) - Number(a.blocked) || (b.updatedAt ?? 0) - (a.updatedAt ?? 0))

  const sortedRuns: Run[] = [...runs].sort(
    (a, b) => RUN_ORDER[a.status] - RUN_ORDER[b.status] || (b.finishedAt ?? 0) - (a.finishedAt ?? 0),
  )

  return { needsMyReview, myPulls, myIssues, myMerged, botPulls, runs: sortedRuns }
}
