import type { ProviderResult, Pull, Run } from '../shared/types.js'

// The release radar, for teams that ship by cherry-picking onto release/*
// branches: which release branches are in play, and which changes landed on
// the mainline but appear in no release PR. Correlation is by ticket key in
// PR titles ([VTRK-1557] …) — the honest, convention-based signal. Unkeyed
// PRs can't be tracked and are deliberately not guessed at.

const RELEASE_RE = /^release[/_-]/i
const MAINLINE_RE = /^(develop|main|master)$/i
const KEY_RE = /\b([A-Z][A-Z0-9]{1,9}-\d+)\b/

export interface ReleaseBranch {
  name: string
  openPulls: number
  mergedRecently: number
  pipeline: Run | null
}

export interface UnreleasedChange {
  key: string
  ticket: string | null
  title: string
  url: string
  targetBranch: string | null
  closedAt: number | null
}

export interface ReleaseRadar {
  branches: ReleaseBranch[]
  unreleased: UnreleasedChange[]
}

export function ticketOf(pull: Pull): string | null {
  return KEY_RE.exec(pull.title)?.[1] ?? null
}

export function computeRelease(results: ProviderResult[], now: number = Date.now()): ReleaseRadar {
  const open = results.flatMap((r) => r.pulls)
  const merged = results.flatMap((r) => r.mergedPulls)
  const runs = results.flatMap((r) => r.runs)
  const week = now - 7 * 86_400_000

  const releaseTargets = new Map<string, ReleaseBranch>()
  const touch = (name: string): ReleaseBranch => {
    const entry = releaseTargets.get(name) ?? { name, openPulls: 0, mergedRecently: 0, pipeline: null }
    releaseTargets.set(name, entry)
    return entry
  }
  for (const p of open) {
    if (p.targetBranch !== null && RELEASE_RE.test(p.targetBranch)) touch(p.targetBranch).openPulls += 1
  }
  for (const p of merged) {
    if (p.targetBranch !== null && RELEASE_RE.test(p.targetBranch) && (p.closedAt ?? 0) >= week) {
      touch(p.targetBranch).mergedRecently += 1
    }
  }
  for (const branch of releaseTargets.values()) {
    branch.pipeline = runs.find((r) => r.branch.toLowerCase() === branch.name.toLowerCase()) ?? null
  }
  const branches = [...releaseTargets.values()].sort((a, b) => b.name.localeCompare(a.name))

  // Tickets that reached any release/* PR (open or merged) are covered.
  const releasedTickets = new Set<string>()
  for (const p of [...open, ...merged]) {
    if (p.targetBranch !== null && RELEASE_RE.test(p.targetBranch)) {
      const t = ticketOf(p)
      if (t !== null) releasedTickets.add(t)
    }
  }

  const unreleased: UnreleasedChange[] = merged
    .filter((p) => p.targetBranch !== null && MAINLINE_RE.test(p.targetBranch) && (p.closedAt ?? 0) >= week)
    .map((p) => ({ pull: p, ticket: ticketOf(p) }))
    .filter(({ ticket }) => ticket !== null && !releasedTickets.has(ticket))
    .map(({ pull, ticket }) => ({
      key: pull.key,
      ticket,
      title: pull.title,
      url: pull.url,
      targetBranch: pull.targetBranch,
      closedAt: pull.closedAt,
    }))
    .sort((a, b) => (b.closedAt ?? 0) - (a.closedAt ?? 0))
    .slice(0, 15)

  // Only meaningful when the team actually uses release branches.
  return { branches, unreleased: branches.length > 0 ? unreleased : [] }
}
