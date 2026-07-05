import { describe, expect, it } from 'vitest'
import { buildDigest, digestDue } from '../server/digest.js'
import { computeLanes } from '../server/lanes.js'
import { computeTeam } from '../server/teamlanes.js'
import { buildBrief } from '../server/brief.js'
import { ciFromStatuses } from '../server/providers/ado/pulls.js'
import { reviewersFromParticipants } from '../server/providers/bitbucket/pulls.js'
import { mockConfig, mockResults } from '../server/mock.js'
import type { StateSnapshot } from '../shared/types.js'

const NOW = Date.parse('2026-07-06T09:05:00')

function snapshot(): StateSnapshot {
  const results = [mockResults(NOW)]
  const lanes = computeLanes(mockConfig, results, NOW)
  return {
    generatedAt: NOW,
    me: { name: 'Alice Chen' },
    lanes,
    team: computeTeam(mockConfig, results),
    brief: buildBrief(lanes, NOW),
    providers: [],
  }
}

describe('digest', () => {
  it('covers PRs, reviews pending, red pipelines, blocked and bot backlog', () => {
    const text = buildDigest(snapshot(), mockConfig, NOW)
    expect(text).toContain('open PRs')
    expect(text).toContain('Reviews pending with:')
    expect(text).toContain('pipeline')
    expect(text).toContain('Blocked')
    expect(text).toContain('automated PR')
  })

  it('says all-quiet instead of an empty scare list', () => {
    const s = snapshot()
    s.team = { stalePulls: [], people: [], blockedIssues: [] }
    s.lanes = { ...s.lanes, runs: [], botPulls: [] }
    expect(buildDigest(s, mockConfig, NOW)).toContain('All quiet')
  })

  it('fires once per day after the configured time', () => {
    const nineOhFive = Date.parse('2026-07-06T09:05:00')
    const first = digestDue('09:00', null, nineOhFive)
    expect(first.due).toBe(true)
    expect(digestDue('09:00', first.dayKey, nineOhFive + 60_000).due).toBe(false)
    expect(digestDue('09:00', first.dayKey, nineOhFive + 86_400_000).due).toBe(true)
    expect(digestDue('09:00', null, Date.parse('2026-07-06T08:00:00')).due).toBe(false)
  })
})

describe('v0.4 provider mappings', () => {
  it('ado ci: latest state per context; any failure wins', () => {
    expect(ciFromStatuses([])).toBe('none')
    expect(ciFromStatuses([{ state: 'succeeded', context: { name: 'build' } }])).toBe('ok')
    expect(ciFromStatuses([
      { state: 'failed', context: { name: 'build' } },
      { state: 'succeeded', context: { name: 'build' } }, // later entry supersedes
    ])).toBe('ok')
    expect(ciFromStatuses([
      { state: 'succeeded', context: { name: 'build' } },
      { state: 'pending', context: { name: 'lint' } },
    ])).toBe('running')
    expect(ciFromStatuses([
      { state: 'succeeded', context: { name: 'build' } },
      { state: 'error', context: { name: 'lint' } },
    ])).toBe('failed')
  })

  it('bitbucket participants: only reviewers, approval and change-requests map', () => {
    const reviewers = reviewersFromParticipants([
      { role: 'REVIEWER', approved: true, state: 'approved', user: { display_name: 'Ben', nickname: 'ben' } },
      { role: 'REVIEWER', approved: false, state: 'changes_requested', user: { display_name: 'Priya' } },
      { role: 'REVIEWER', approved: false, state: null, user: { display_name: 'Marco' } },
      { role: 'PARTICIPANT', approved: true, state: 'approved', user: { display_name: 'Not A Reviewer' } },
    ])
    expect(reviewers.map((r) => r.vote)).toEqual(['approved', 'rejected', 'none'])
  })
})
