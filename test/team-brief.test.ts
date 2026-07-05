import { describe, expect, it } from 'vitest'
import { computeLanes } from '../server/lanes.js'
import { computeTeam } from '../server/teamlanes.js'
import { buildBrief } from '../server/brief.js'
import { mockConfig, mockResults } from '../server/mock.js'

const NOW = Date.parse('2026-07-05T09:00:00Z')

describe('group reviewers', () => {
  it('a pending group review surfaces when I am active in that repo, marked via', () => {
    const lanes = computeLanes(mockConfig, [mockResults(NOW)])
    const viaGroup = lanes.needsMyReview.find((p) => p.key === 'fleet-api!4840')
    expect(viaGroup?.via).toBe('SG_Developers')
    // direct assignments carry no via
    expect(lanes.needsMyReview.find((p) => p.key === 'fleet-web!4821')?.via).toBeNull()
  })

  it('group PRs in repos I have no footprint in stay out of my lane', () => {
    const results = mockResults(NOW)
    const stranger = results.pulls.find((p) => p.key === 'fleet-api!4840')
    if (stranger === undefined) throw new Error('fixture missing')
    const lonely = { pulls: [{ ...stranger, repo: 'somebody-elses-service', key: 'somebody-elses-service!1' }], runs: [], issues: [] }
    const lanes = computeLanes(mockConfig, [lonely])
    expect(lanes.needsMyReview).toEqual([])
  })

  it('config groupReviewRepos forces a repo into scope', () => {
    const results = mockResults(NOW)
    const stranger = results.pulls.find((p) => p.key === 'fleet-api!4840')
    if (stranger === undefined) throw new Error('fixture missing')
    const lonely = { pulls: [{ ...stranger, repo: 'edge-service', key: 'edge-service!1' }], runs: [], issues: [] }
    const cfg = { ...mockConfig, ado: { ...(mockConfig.ado ?? { org: 'x', projects: ['y'], repos: [], excludePipelines: [], auth: 'az' as const }), groupReviewRepos: ['edge-service'] } }
    const lanes = computeLanes(cfg, [lonely])
    expect(lanes.needsMyReview.map((p) => p.via)).toEqual(['SG_Developers'])
  })
})

describe('team radiator', () => {
  const team = computeTeam(mockConfig, [mockResults(NOW)])

  it('stale wall is every open non-draft PR, oldest first', () => {
    expect(team.stalePulls[0]?.key).toBe('fleet-web!4821')
    expect(team.stalePulls.some((p) => p.isDraft)).toBe(false)
  })

  it('team pulse counts per person without ranking', () => {
    const alice = team.people.find((p) => p.name === 'Alice Chen')
    expect(alice?.openPulls).toBe(2) // drafts excluded
    expect(alice?.reviewsOwed).toBe(3)
    const ben = team.people.find((p) => p.name === 'Ben Okafor')
    expect(ben?.reviewsOwed).toBe(1)
    // sorted by name, not by any metric
    expect(team.people.map((p) => p.name)).toEqual([...team.people.map((p) => p.name)].sort())
  })

  it('blocked issues float team-wide', () => {
    expect(team.blockedIssues.map((i) => i.key)).toEqual(['FLT-812'])
  })
})

describe('standup brief', () => {
  it('summarizes work, PRs and owed reviews, blockers only when real', () => {
    const lanes = computeLanes(mockConfig, [mockResults(NOW)])
    const brief = buildBrief(lanes)
    expect(brief).toContain('Working on:')
    expect(brief).toContain('ready to merge')
    expect(brief).toMatch(/Owe \d+ reviews/)
    expect(brief).toContain('Blockers: FLT-812 is blocked')
  })

  it('no blockers line when nothing is blocked', () => {
    const results = mockResults(NOW)
    results.issues = results.issues.filter((i) => !i.blocked)
    const brief = buildBrief(computeLanes(mockConfig, [results]))
    expect(brief).not.toContain('Blockers:')
  })
})
