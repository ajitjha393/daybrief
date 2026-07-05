import type { Lanes } from '../shared/types.js'
import { ageDays } from '../shared/normalize.js'

// The standup draft: what you'd say at 9:15, assembled from the same lanes
// the board shows. Blockers appear ONLY when something is genuinely blocked —
// an empty blockers line invites people to stop reading.

export function buildBrief(lanes: Lanes): string {
  const lines: string[] = []

  const active = lanes.myIssues.filter((i) => !i.blocked)
  if (active.length > 0) {
    lines.push(`Working on: ${active.slice(0, 4).map((i) => `${i.key} (${i.status})`).join(', ')}${active.length > 4 ? ` +${active.length - 4} more` : ''}`)
  }

  if (lanes.myPulls.length > 0) {
    const ready = lanes.myPulls.filter(
      (p) => !p.isDraft && !p.mergeBlocked && p.waitingOn.length === 0 && p.reviewers.some((r) => r.vote === 'approved' || r.vote === 'suggested'),
    )
    const waiting = lanes.myPulls.filter((p) => p.waitingOn.length > 0)
    const bits: string[] = [`${lanes.myPulls.length} PR${lanes.myPulls.length === 1 ? '' : 's'} in flight`]
    if (ready.length > 0) bits.push(`${ready.map((p) => p.key).join(', ')} ready to merge`)
    if (waiting.length > 0) bits.push(`waiting on ${[...new Set(waiting.flatMap((p) => p.waitingOn))].join(', ')}`)
    lines.push(bits.join(' — '))
  }

  if (lanes.needsMyReview.length > 0) {
    const oldest = lanes.needsMyReview[0]
    const age = oldest !== undefined ? ageDays(oldest.createdAt) : null
    lines.push(`Owe ${lanes.needsMyReview.length} review${lanes.needsMyReview.length === 1 ? '' : 's'}${age !== null && age >= 1 ? ` (oldest ${Math.round(age)}d)` : ''}`)
  }

  const blockers: string[] = []
  for (const i of lanes.myIssues.filter((x) => x.blocked)) blockers.push(`${i.key} is blocked (${i.status})`)
  for (const p of lanes.myPulls.filter((x) => x.mergeBlocked)) blockers.push(`${p.key} has merge conflicts`)
  if (blockers.length > 0) lines.push(`Blockers: ${blockers.join('; ')}`)

  return lines.join('\n')
}
