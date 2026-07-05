import type { Lanes } from '../shared/types.js'
import { ageDays } from '../shared/normalize.js'

// The standup draft, structured the way a PO/scrum master actually consumes
// it: Done → Doing → PRs → Reviews → Blockers. Sections appear only when
// they have content — an always-present empty Blockers line trains people
// to stop reading.

export function buildBrief(lanes: Lanes, now: number = Date.now()): string {
  const lines: string[] = []

  if (lanes.myMerged.length > 0) {
    const items = lanes.myMerged
      .slice(0, 4)
      .map((p) => `${p.key} → ${p.targetBranch ?? '?'} (merged ${relDays(p.closedAt, now)})`)
    lines.push(`Done: ${items.join(', ')}${lanes.myMerged.length > 4 ? ` +${lanes.myMerged.length - 4} more` : ''}`)
  }

  const active = lanes.myIssues.filter((i) => !i.blocked)
  if (active.length > 0) {
    lines.push(`Doing: ${active.slice(0, 4).map((i) => `${i.key} (${i.status})`).join(', ')}${active.length > 4 ? ` +${active.length - 4} more` : ''}`)
  }

  if (lanes.myPulls.length > 0) {
    const ready = lanes.myPulls.filter(
      (p) => !p.isDraft && !p.mergeBlocked && p.waitingOn.length === 0 && p.reviewers.some((r) => r.vote === 'approved' || r.vote === 'suggested'),
    )
    const waiting = lanes.myPulls.filter((p) => p.waitingOn.length > 0)
    const bits: string[] = [`${lanes.myPulls.length} in flight`]
    if (ready.length > 0) bits.push(`${ready.map((p) => p.key).join(', ')} ready to merge`)
    if (waiting.length > 0) bits.push(`waiting on ${[...new Set(waiting.flatMap((p) => p.waitingOn))].join(', ')}`)
    lines.push(`PRs: ${bits.join(' — ')}`)
  }

  if (lanes.needsMyReview.length > 0) {
    const oldest = lanes.needsMyReview[0]
    const age = oldest !== undefined ? ageDays(oldest.createdAt, now) : null
    lines.push(`Reviews owed: ${lanes.needsMyReview.length}${age !== null && age >= 1 ? ` (oldest ${Math.round(age)}d)` : ''}`)
  }

  const blockers: string[] = []
  for (const i of lanes.myIssues.filter((x) => x.blocked)) blockers.push(`${i.key} blocked (${i.status})`)
  for (const p of lanes.myPulls.filter((x) => x.mergeBlocked)) blockers.push(`${p.key} has merge conflicts`)
  if (blockers.length > 0) lines.push(`Blockers: ${blockers.join('; ')}`)

  return lines.join('\n')
}

function relDays(ts: number | null, now: number): string {
  const days = ageDays(ts, now)
  if (days === null) return 'recently'
  if (days < 1) return 'today'
  return `${Math.round(days)}d ago`
}
