import type { Issue, PersonPulse, Pull, ProviderResult, TeamState } from '../shared/types.js'
import { isPerson } from '../shared/normalize.js'
import type { Config } from './config.js'

// The team radiator: shared state that needs action, never rankings.
// People come from config.people when provided; otherwise they're derived
// from the data itself (PR authors + issue assignees), so the view works
// before anyone curates a roster.

const STALE_WALL_LIMIT = 40

export function computeTeam(config: Config, results: ProviderResult[]): TeamState {
  const pulls = results.flatMap((r) => r.pulls)
  const issues = results.flatMap((r) => r.issues)

  const openPulls = pulls.filter((p) => !p.isDraft)
  const stalePulls = [...openPulls]
    .sort((a, b) => (a.createdAt ?? Number.MAX_SAFE_INTEGER) - (b.createdAt ?? Number.MAX_SAFE_INTEGER))
    .slice(0, STALE_WALL_LIMIT)

  const roster: { name: string; ids: (string | null)[] }[] =
    config.people.length > 0
      ? config.people.map((p) => ({ name: p.name, ids: [p.ado, p.jira, p.bitbucket] }))
      : deriveRoster(openPulls, issues)

  const people: PersonPulse[] = roster
    .map(({ name, ids }) => {
      const isThem = (candidateId: string | null, candidateName: string | null): boolean =>
        ids.some((id) => isPerson(id, candidateId)) || isPerson(name, candidateName)
      const authored = openPulls.filter((p) => isThem(p.author.id, p.author.name))
      const reviewsOwed = openPulls.filter((p) =>
        p.reviewers.some((r) => r.vote === 'none' && isThem(r.id, r.name)),
      )
      const theirIssues = issues.filter(
        (i) => (isThem(i.assignee, i.assigneeName)) && i.statusCategory !== 'done',
      )
      return {
        name,
        openPulls: authored.length,
        reviewsOwed: reviewsOwed.length,
        openIssues: theirIssues.length,
        blockedIssues: theirIssues.filter((i) => i.blocked).length,
      }
    })
    .filter((p) => p.openPulls + p.reviewsOwed + p.openIssues > 0)
    .sort((a, b) => a.name.localeCompare(b.name))

  const blockedIssues = issues
    .filter((i) => i.blocked && i.statusCategory !== 'done')
    .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))

  return { stalePulls, people, blockedIssues }
}

function deriveRoster(pulls: Pull[], issues: Issue[]): { name: string; ids: (string | null)[] }[] {
  const byName = new Map<string, Set<string>>()
  const add = (name: string | null, id: string | null): void => {
    if (name === null || name === 'unknown') return
    const ids = byName.get(name) ?? new Set<string>()
    if (id !== null) ids.add(id)
    byName.set(name, ids)
  }
  for (const p of pulls) {
    add(p.author.name, p.author.id)
    for (const r of p.reviewers) add(r.name, r.id)
  }
  for (const i of issues) add(i.assigneeName, i.assignee)
  return [...byName.entries()].map(([name, ids]) => ({ name, ids: [...ids] }))
}
