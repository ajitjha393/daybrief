// Normalized shapes every provider maps into. Fields a source can't know are
// null — the UI renders "unknown" honestly rather than guessing.
//
// Pull: {
//   source: 'ado' | 'bitbucket',
//   id, key,            // key is human: 'Web.App!123'
//   title, url, repo,
//   author: { name, id },
//   createdAt, updatedAt,   // epoch ms
//   isDraft, mergeBlocked,  // conflicts / failed merge check
//   reviewers: [{ name, id, vote }],  // vote: 'approved'|'suggested'|'none'|'waiting'|'rejected'
//   ci: 'ok' | 'failed' | 'running' | 'none',
// }
// Run: { source, id, pipeline, status: 'ok'|'failed'|'running', branch, finishedAt, url }
// Issue: { source: 'jira', key, summary, status, statusCategory, assignee, priority, url, updatedAt, flagged }

export const DAY_MS = 86400000

export function ageDays(ts, now = Date.now()) {
  if (!ts) return null
  return Math.max(0, Math.round((now - ts) * 10 / DAY_MS) / 10)
}

export function ms(iso) {
  const t = Date.parse(iso)
  return Number.isFinite(t) ? t : null
}

// ADO reviewer votes: 10 approved, 5 approved-with-suggestions,
// 0 none, -5 waiting on author, -10 rejected.
export function adoVote(vote) {
  if (vote >= 10) return 'approved'
  if (vote >= 5) return 'suggested'
  if (vote <= -10) return 'rejected'
  if (vote <= -5) return 'waiting'
  return 'none'
}

export function pullKey(repo, id) {
  return `${repo}!${id}`
}

// Case-insensitive identity match against a config identity (email or username).
export function isPerson(identity, candidate) {
  if (!identity || !candidate) return false
  return String(identity).toLowerCase() === String(candidate).toLowerCase()
}
