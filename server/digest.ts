import type { StateSnapshot } from '../shared/types.js'
import type { Config } from './config.js'
import { digestWebhook } from './secrets.js'

// The morning digest: daybrief for people who won't open a dashboard.
// One message into a Teams/Slack channel — team-level facts that need
// action, same no-metrics rules as the radiator.

export function buildDigest(snapshot: StateSnapshot, _config: Config, now: number = Date.now()): string {
  const { team, lanes } = snapshot
  const day = new Date(now).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  const failing = lanes.runs.filter((r) => r.status === 'failed')

  const lines: string[] = [`**☕ daybrief — ${day}**`]

  if (team.stalePulls.length > 0) {
    const oldest = team.stalePulls[0]
    const oldestDays = oldest?.createdAt != null ? Math.round((now - oldest.createdAt) / 86_400_000) : null
    lines.push(
      `• **${team.stalePulls.length} open PR${team.stalePulls.length === 1 ? '' : 's'}**${oldestDays !== null && oldestDays >= 1 ? ` — oldest ${oldestDays}d (${oldest?.key})` : ''}`,
    )
  }

  const owed = team.people.filter((p) => p.reviewsOwed > 0)
  if (owed.length > 0) {
    lines.push(`• Reviews pending with: ${owed.map((p) => `${p.name} (${p.reviewsOwed})`).join(', ')}`)
  }

  if (failing.length > 0) {
    const names = failing.slice(0, 5).map((r) => r.pipeline)
    lines.push(`• **${failing.length} pipeline${failing.length === 1 ? '' : 's'} red**: ${names.join(', ')}${failing.length > 5 ? ` +${failing.length - 5} more` : ''}`)
  }

  if (team.blockedIssues.length > 0) {
    lines.push(`• **Blocked**: ${team.blockedIssues.slice(0, 4).map((i) => `${i.key} (${i.status})`).join(', ')}`)
  }

  if (lanes.botPulls.length > 0) {
    lines.push(`• ${lanes.botPulls.length} automated PR${lanes.botPulls.length === 1 ? '' : 's'} (Snyk & friends) awaiting a decision`)
  }

  if (lines.length === 1) lines.push('• All quiet: no open PRs, no red pipelines, nothing blocked. Enjoy it.')
  return lines.join('\n')
}

export async function sendDigest(text: string, config: Config): Promise<void> {
  const url = digestWebhook(config)
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text }),
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Error(`webhook rejected the digest (${res.status})`)
}

/**
 * Fire-once-per-day gate: true when local time has passed `at` (HH:MM) and
 * nothing was sent today yet. The caller stores the returned dayKey.
 */
export function digestDue(at: string, lastSentDay: string | null, now: number = Date.now()): { due: boolean; dayKey: string } {
  const d = new Date(now)
  const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  const [h = '9', m = '0'] = at.split(':')
  const target = new Date(d)
  target.setHours(Number(h), Number(m), 0, 0)
  return { due: lastSentDay !== dayKey && d.getTime() >= target.getTime(), dayKey }
}
