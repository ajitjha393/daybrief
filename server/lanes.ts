import type { Issue, Lanes, OwnPull, Person, Pull, PullSource, ProviderResult, Run, RunStatus } from '../shared/types.js'
import { isPerson } from '../shared/normalize.js'
import type { Config } from './config.js'

// The product's actual logic: turning merged provider results into the four
// personal lanes. Everything else is plumbing.

function matchesMe(config: Config, person: Person, source: PullSource): boolean {
  const identity = source === 'ado' ? config.me.ado : config.me.bitbucket
  return isPerson(identity, person.id) || isPerson(config.me.name, person.name)
}

const byOldestFirst = (a: Pull, b: Pull): number => (a.createdAt ?? Number.MAX_SAFE_INTEGER) - (b.createdAt ?? Number.MAX_SAFE_INTEGER)

const RUN_ORDER: Record<RunStatus, number> = { failed: 0, running: 1, ok: 2, none: 3 }

export function computeLanes(config: Config, results: ProviderResult[]): Lanes {
  const pulls = results.flatMap((r) => r.pulls)
  const runs = results.flatMap((r) => r.runs)
  const issues = results.flatMap((r) => r.issues)

  const mine = (p: Pull): boolean => matchesMe(config, p.author, p.source)

  // Oldest first — age is the pressure that makes review debt visible.
  const needsMyReview = pulls
    .filter((p) => !p.isDraft && !mine(p))
    .filter((p) => p.reviewers.some((r) => matchesMe(config, r, p.source) && r.vote === 'none'))
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

  return { needsMyReview, myPulls, myIssues, runs: sortedRuns }
}
