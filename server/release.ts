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
  /** The repo this release train lives in — the same branch name can exist in many. */
  repo: string
  openPulls: number
  /** The open PRs themselves (newest first, capped) — clickable context. */
  open: { key: string; title: string; url: string; ticket: string | null }[]
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
  const touch = (name: string, repo: string): ReleaseBranch => {
    const id = `${repo}\u0000${name}`
    const entry = releaseTargets.get(id) ?? { name, repo, openPulls: 0, open: [], mergedRecently: 0, pipeline: null }
    releaseTargets.set(id, entry)
    return entry
  }
  for (const p of open) {
    if (p.targetBranch !== null && RELEASE_RE.test(p.targetBranch)) {
      const entry = touch(p.targetBranch, p.repo)
      entry.openPulls += 1
      if (entry.open.length < 5) entry.open.push({ key: p.key, title: p.title, url: p.url, ticket: ticketOf(p) })
    }
  }
  for (const p of merged) {
    if (p.targetBranch !== null && RELEASE_RE.test(p.targetBranch) && (p.closedAt ?? 0) >= week) {
      touch(p.targetBranch, p.repo).mergedRecently += 1
    }
  }
  for (const branch of releaseTargets.values()) {
    const onBranch = runs.filter((r) => r.branch.toLowerCase() === branch.name.toLowerCase())
    // Prefer the pipeline that names the repo; fall back to any run on the branch.
    branch.pipeline =
      onBranch.find((r) => r.pipeline.toLowerCase().includes(branch.repo.toLowerCase())) ?? onBranch[0] ?? null
  }
  // Newest release first (numeric-aware so 7.12 outranks 7.5), then by repo.
  const branches = [...releaseTargets.values()].sort(
    (a, b) =>
      b.name.localeCompare(a.name, undefined, { numeric: true, sensitivity: 'base' }) ||
      a.repo.localeCompare(b.repo),
  )

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
