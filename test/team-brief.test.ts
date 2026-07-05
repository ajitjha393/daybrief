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
    const lonely = { pulls: [{ ...stranger, repo: 'somebody-elses-service', key: 'somebody-elses-service!1' }], mergedPulls: [], runs: [], issues: [] }
    const lanes = computeLanes(mockConfig, [lonely])
    expect(lanes.needsMyReview).toEqual([])
  })

  it('config groupReviewRepos forces a repo into scope', () => {
    const results = mockResults(NOW)
    const stranger = results.pulls.find((p) => p.key === 'fleet-api!4840')
    if (stranger === undefined) throw new Error('fixture missing')
    const lonely = { pulls: [{ ...stranger, repo: 'edge-service', key: 'edge-service!1' }], mergedPulls: [], runs: [], issues: [] }
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
    expect(brief).toContain('Doing:')
    expect(brief).toContain('Done: fleet-web!4801')
    expect(brief).toContain('ready to merge')
    expect(brief).toMatch(/Reviews owed: \d+/)
    expect(brief).toContain('Blockers: FLT-812 blocked')
  })

  it('no blockers line when nothing is blocked', () => {
    const results = mockResults(NOW)
    results.issues = results.issues.filter((i) => !i.blocked)
    const brief = buildBrief(computeLanes(mockConfig, [results]))
    expect(brief).not.toContain('Blockers:')
  })
})

describe('bots and shipped', () => {
  it('bot PRs are corralled, never in review lanes or the team wall', () => {
    const lanes = computeLanes(mockConfig, [mockResults(NOW)])
    expect(lanes.botPulls.map((p) => p.key)).toEqual(['fleet-web!4842', 'fleet-web!4844'])
    expect(lanes.needsMyReview.some((p) => p.key === 'fleet-web!4842')).toBe(false)
    const team = computeTeam(mockConfig, [mockResults(NOW)])
    expect(team.stalePulls.some((p) => p.key === 'fleet-web!4842')).toBe(false)
  })

  it('myMerged lists my PRs merged in the last 7 days, newest first', () => {
    const lanes = computeLanes(mockConfig, [mockResults(NOW)], NOW)
    expect(lanes.myMerged.map((p) => p.key)).toEqual(['fleet-web!4801'])
  })

  it('roster dedupes display-name and account-name variants of one human', () => {
    const results = mockResults(NOW)
    const clone = JSON.parse(JSON.stringify(results.pulls[0])) as typeof results.pulls[0]
    clone.id = 9999; clone.key = 'fleet-web!9999'
    clone.author = { name: 'ben.okafor', id: 'ben@acme.dev' }
    const cfg = { ...mockConfig, people: [] }
    const team = computeTeam(cfg, [{ ...results, pulls: [...results.pulls, clone] }])
    const bens = team.people.filter((p) => p.name.toLowerCase().includes('okafor') || p.name.toLowerCase().includes('ben'))
    expect(bens.length).toBe(1)
    expect(bens[0]?.openPulls).toBe(3)
  })
})
