import { describe, expect, it } from 'vitest'
import { computeLanes } from '../server/lanes.js'
import { mockConfig, mockResults } from '../server/mock.js'
import type { Pull } from '../shared/types.js'

const NOW = Date.parse('2026-07-05T09:00:00Z')

describe('computeLanes', () => {
  const lanes = computeLanes(mockConfig, [mockResults(NOW)])

  it('needs-my-review: only PRs where my vote is still none, no drafts, not my own', () => {
    const keys = lanes.needsMyReview.map((p) => p.key)
    expect(keys).toEqual(['fleet-web!4821', 'fleet-api!4830', 'fleet-web!4833'])
  })

  it('needs-my-review sorts oldest first — age is the pressure', () => {
    const ages = lanes.needsMyReview.map((p) => p.createdAt ?? 0)
    expect([...ages].sort((a, b) => a - b)).toEqual(ages)
  })

  it('my PRs carry a waitingOn list of reviewers who have not voted', () => {
    const telemetry = lanes.myPulls.find((p) => p.key === 'fleet-web!4809')
    expect(telemetry?.waitingOn).toEqual(['Ben Okafor', 'Marco Ruiz'])
    const idempotency = lanes.myPulls.find((p) => p.key === 'fleet-api!4828')
    expect(idempotency?.waitingOn).toEqual([])
  })

  it('my tickets: only mine, not done, blocked floats to the top', () => {
    expect(lanes.myIssues.map((i) => i.key)).toEqual(['FLT-812', 'FLT-801', 'FLT-820', 'FLT-826'])
    expect(lanes.myIssues[0]?.blocked).toBe(true)
    expect(lanes.myIssues.some((i) => i.assigneeName === 'Ben Okafor')).toBe(false)
  })

  it('runs: failed first, then running, then ok', () => {
    expect(lanes.runs.map((r) => r.status).slice(0, 2)).toEqual(['failed', 'running'])
  })

  it('identity matching is by id first, name as fallback, case-insensitive', () => {
    const config = { ...mockConfig, me: { ...mockConfig.me, ado: 'ALICE@ACME.DEV' } }
    const byId = computeLanes(config, [mockResults(NOW)])
    expect(byId.needsMyReview.length).toBe(3)
    const nameOnly = {
      ...mockConfig,
      me: { name: 'Alice Chen', ado: null, jira: null, bitbucket: null },
    }
    const byName = computeLanes(nameOnly, [mockResults(NOW)])
    expect(byName.myPulls.length).toBe(3)
  })

  it('default (personal) JQL trusts every issue as mine — Atlassian may hide emails', () => {
    const cfg = {
      ...mockConfig,
      me: { name: 'Someone Else Entirely', ado: null, jira: null, bitbucket: null },
      jira: { ...(mockConfig.jira ?? { site: 's', emailEnv: 'E', tokenEnv: 'T', includeStatuses: [] }), jql: null },
    }
    const out = computeLanes(cfg, [mockResults(NOW)])
    expect(out.myIssues.length).toBe(5) // all issues, Ben's included — the JQL scoped them
  })

  it('includeStatuses keeps named done-category statuses on the board', () => {
    const issue = {
      source: 'jira' as const, key: 'FLT-900', summary: 'Ship it', status: 'Pending Deployment',
      statusCategory: 'done' as const, assignee: 'alice@acme.dev', assigneeName: 'Alice Chen',
      priority: null, url: 'u', updatedAt: NOW, blocked: false,
    }
    const base = { pulls: [], runs: [], issues: [issue] }
    const without = computeLanes(mockConfig, [base])
    expect(without.myIssues).toEqual([])
    const cfg = {
      ...mockConfig,
      jira: { ...(mockConfig.jira ?? { site: 's', emailEnv: 'E', tokenEnv: 'T', jql: null }), includeStatuses: ['pending deployment'] },
    }
    const withKeep = computeLanes(cfg, [base])
    expect(withKeep.myIssues.map((i) => i.key)).toEqual(['FLT-900'])
  })

  it('a rejected/approved vote means the PR no longer needs my review', () => {
    const pull: Pull = {
      source: 'ado', id: 1, key: 'r!1', title: 't', url: 'u', repo: 'r',
      author: { name: 'Ben Okafor', id: 'ben@acme.dev' },
      createdAt: NOW, updatedAt: null, isDraft: false, mergeBlocked: false, targetBranch: null,
      reviewers: [{ name: 'Alice Chen', id: 'alice@acme.dev', vote: 'approved', required: true }],
      ci: 'none',
    }
    const out = computeLanes(mockConfig, [{ pulls: [pull], runs: [], issues: [] }])
    expect(out.needsMyReview).toEqual([])
  })
})
