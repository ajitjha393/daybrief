import type { Issue, PersonPulse, Pull, ProviderResult, TeamState } from '../shared/types.js'
import { isPerson } from '../shared/normalize.js'
import { isBotPull } from '../shared/bots.js'
import type { Config } from './config.js'

// The team radiator: shared state that needs action, never rankings.
// People come from config.people when provided; otherwise they're derived
// from the data itself (PR authors + issue assignees), so the view works
// before anyone curates a roster.

const STALE_WALL_LIMIT = 40

export function computeTeam(config: Config, results: ProviderResult[]): TeamState {
  const pulls = results.flatMap((r) => r.pulls)
  const issues = results.flatMap((r) => r.issues)

  const openPulls = pulls.filter((p) => !p.isDraft && !isBotPull(p))
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
  // "Bishwajith Jha" (ADO display name) and "bishwajith.jha" (account name)
  // are the same human — canonicalize on letters-only lowercase, and merge
  // any entries whose identity sets overlap. Longest display name wins.
  const canon = (s: string): string => s.toLowerCase().replace(/[^a-z]/g, '')
  const entries = new Map<string, { name: string; ids: Set<string> }>()
  const add = (name: string | null, id: string | null): void => {
    if (name === null || name === 'unknown') return
    const key = canon(name)
    if (key.length === 0) return
    const entry = entries.get(key) ?? { name, ids: new Set<string>() }
    if (name.length > entry.name.length) entry.name = name
    if (id !== null) entry.ids.add(id.toLowerCase())
    entries.set(key, entry)
  }
  for (const p of pulls) {
    add(p.author.name, p.author.id)
    for (const r of p.reviewers) add(r.name, r.id)
  }
  for (const i of issues) add(i.assigneeName, i.assignee)

  // Second pass: merge entries that share an id (same account, unlike names).
  const merged: { name: string; ids: Set<string> }[] = []
  for (const entry of entries.values()) {
    const twin = merged.find((m) => [...entry.ids].some((id) => m.ids.has(id)))
    if (twin !== undefined) {
      if (entry.name.length > twin.name.length) twin.name = entry.name
      for (const id of entry.ids) twin.ids.add(id)
    } else {
      merged.push(entry)
    }
  }
  return merged.map((m) => ({ name: m.name, ids: [...m.ids] }))
}
