import { describe, expect, it } from 'vitest'
import { AdoPullSchema, AdoBuildSchema } from '../server/providers/ado/schemas.js'
import { normalizePull as adoPull } from '../server/providers/ado/pulls.js'
import { normalizeRun } from '../server/providers/ado/runs.js'
import { JiraIssueSchema } from '../server/providers/jira/schemas.js'
import { normalizeIssue } from '../server/providers/jira/issues.js'
import { BbPullSchema } from '../server/providers/bitbucket/schemas.js'
import { normalizePull as bbPull } from '../server/providers/bitbucket/pulls.js'

describe('ado normalization', () => {
  it('maps votes, drops group reviewers, flags merge conflicts', () => {
    const raw = AdoPullSchema.parse({
      pullRequestId: 42,
      title: 'Fix things',
      repository: { name: 'Web.App' },
      createdBy: { displayName: 'Priya Nair', uniqueName: 'priya@acme.dev' },
      creationDate: '2026-07-01T10:00:00Z',
      mergeStatus: 'conflicts',
      reviewers: [
        { displayName: 'Alice Chen', uniqueName: 'alice@acme.dev', vote: 0, isRequired: true },
        { displayName: 'Fleet Team', isContainer: true, vote: 0 },
        { displayName: 'Ben Okafor', uniqueName: 'ben@acme.dev', vote: 10 },
        { displayName: 'Marco Ruiz', uniqueName: 'marco@acme.dev', vote: -5 },
      ],
    })
    const pull = adoPull(raw, 'acme', 'Fleet')
    expect(pull.key).toBe('Web.App!42')
    expect(pull.mergeBlocked).toBe(true)
    expect(pull.reviewers.map((r) => r.vote)).toEqual(['none', 'approved', 'waiting'])
    expect(pull.url).toContain('/Fleet/_git/Web.App/pullrequest/42')
  })

  it('maps build status: inProgress beats result; partiallySucceeded is a failure', () => {
    const running = normalizeRun(AdoBuildSchema.parse({ id: 1, status: 'inProgress', sourceBranch: 'refs/heads/develop' }))
    expect(running.status).toBe('running')
    expect(running.branch).toBe('develop')
    const partial = normalizeRun(AdoBuildSchema.parse({ id: 2, status: 'completed', result: 'partiallySucceeded' }))
    expect(partial.status).toBe('failed')
    const canceled = normalizeRun(AdoBuildSchema.parse({ id: 3, status: 'completed', result: 'canceled' }))
    expect(canceled.status).toBe('none')
  })
})

describe('jira normalization', () => {
  const base = {
    key: 'FLT-1',
    fields: {
      summary: 'Do the thing',
      status: { name: 'In Progress', statusCategory: { key: 'indeterminate' } },
      assignee: { emailAddress: 'alice@acme.dev', displayName: 'Alice Chen' },
      priority: { name: 'High' },
      updated: '2026-07-04T12:00:00Z',
      labels: [] as string[],
    },
  }

  it('builds a browse url and carries category + assignee identity', () => {
    const issue = normalizeIssue(JiraIssueSchema.parse(base), 'acme.atlassian.net')
    expect(issue.url).toBe('https://acme.atlassian.net/browse/FLT-1')
    expect(issue.statusCategory).toBe('indeterminate')
    expect(issue.assignee).toBe('alice@acme.dev')
    expect(issue.blocked).toBe(false)
  })

  it('detects blocked from status name or label', () => {
    const byStatus = normalizeIssue(
      JiraIssueSchema.parse({ ...base, fields: { ...base.fields, status: { name: 'Blocked', statusCategory: { key: 'indeterminate' } } } }),
      's',
    )
    expect(byStatus.blocked).toBe(true)
    const byLabel = normalizeIssue(
      JiraIssueSchema.parse({ ...base, fields: { ...base.fields, labels: ['Blocked'] } }),
      's',
    )
    expect(byLabel.blocked).toBe(true)
  })

  it('unknown status categories degrade to new instead of crashing', () => {
    const weird = JiraIssueSchema.parse({
      ...base,
      fields: { ...base.fields, status: { name: 'Odd', statusCategory: { key: 'something-else' } } },
    })
    expect(normalizeIssue(weird, 's').statusCategory).toBe('new')
  })
})

describe('bitbucket normalization', () => {
  it('list payload knowns are mapped; unknowables stay honest defaults', () => {
    const raw = BbPullSchema.parse({
      id: 7,
      title: 'Retry uploads',
      author: { display_name: 'Ben Okafor', nickname: 'benok' },
      created_on: '2026-07-02T08:00:00Z',
      updated_on: '2026-07-03T08:00:00Z',
      links: { html: { href: 'https://bitbucket.org/acme/mobile/pull-requests/7' } },
    })
    const pull = bbPull(raw, 'acme', 'mobile')
    expect(pull.key).toBe('mobile!7')
    expect(pull.author.id).toBe('benok')
    expect(pull.reviewers).toEqual([])
    expect(pull.mergeBlocked).toBe(false)
  })
})
