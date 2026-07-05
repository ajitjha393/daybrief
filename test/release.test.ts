import { describe, expect, it } from 'vitest'
import { computeRelease, ticketOf } from '../server/release.js'
import { mockResults } from '../server/mock.js'

const NOW = Date.parse('2026-07-06T09:00:00Z')

describe('release radar', () => {
  const radar = computeRelease([mockResults(NOW)], NOW)

  it('finds release branches from open and merged PR targets, with their pipeline', () => {
    expect(radar.branches.map((b) => [b.name, b.repo])).toEqual([['release/3.2', 'fleet-api']])
    expect(radar.branches[0]?.open.map((o) => o.ticket)).toEqual(['FLT-788'])
    expect(radar.branches[0]?.openPulls).toBe(1)
    expect(radar.branches[0]?.pipeline?.status).toBe('running')
  })

  it('flags keyed mainline merges that appear in no release PR', () => {
    expect(radar.unreleased.map((u) => u.ticket)).toEqual(['FLT-795'])
  })

  it('tickets covered by a release PR are not flagged; unkeyed merges are never guessed', () => {
    // FLT-788 targets release/3.2 (open) — covered. fleet-api!4796 has no key — skipped.
    expect(radar.unreleased.some((u) => u.ticket === 'FLT-788')).toBe(false)
    expect(radar.unreleased.some((u) => u.key === 'fleet-api!4796')).toBe(false)
  })

  it('goes quiet entirely for teams without release branches', () => {
    const results = mockResults(NOW)
    results.pulls = results.pulls.map((p) => ({ ...p, targetBranch: 'develop' }))
    results.mergedPulls = results.mergedPulls.map((p) => ({ ...p, targetBranch: 'develop' }))
    const quiet = computeRelease([results], NOW)
    expect(quiet.branches).toEqual([])
    expect(quiet.unreleased).toEqual([])
  })

  it('extracts ticket keys defensively', () => {
    const base = mockResults(NOW).pulls[0]
    if (base === undefined) throw new Error('fixture')
    expect(ticketOf({ ...base, title: '[VTRK-1557] GA4 -> GTM cherry-pick' })).toBe('VTRK-1557')
    expect(ticketOf({ ...base, title: 'no key here' })).toBeNull()
  })
})
