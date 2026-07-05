import type { Provider } from './providers/contract.js'
import type { ProviderResult } from '../shared/types.js'
import type { Config } from './config.js'

// Demo data for `daybrief --mock`: the dashboard, screenshots and UI dev all
// work with zero credentials. Times are relative so the demo always looks
// alive. Shapes are the same normalized types real providers produce.

const H = 3_600_000
const D = 24 * H

export const mockConfig: Config = {
  me: { name: 'Alice Chen', ado: 'alice@acme.dev', jira: 'alice@acme.dev', bitbucket: 'alice-chen' },
  pollSeconds: 90,
  digest: null,
  ado: { org: 'acme', projects: ['Fleet'], repos: [], excludePipelines: [], groupReviewRepos: [], auth: 'az' },
  // Custom JQL in the demo so the identity-filtering path stays exercised.
  jira: { site: 'acme.atlassian.net', jql: 'project = FLT', teamJql: null, includeStatuses: [], emailEnv: 'JIRA_EMAIL', tokenEnv: 'JIRA_API_TOKEN' },
  bitbucket: null,
  people: [
    { name: 'Alice Chen', ado: 'alice@acme.dev', jira: 'alice@acme.dev', bitbucket: 'alice-chen' },
    { name: 'Ben Okafor', ado: 'ben@acme.dev', jira: 'ben@acme.dev', bitbucket: null },
    { name: 'Priya Nair', ado: 'priya@acme.dev', jira: 'priya@acme.dev', bitbucket: null },
    { name: 'Marco Ruiz', ado: 'marco@acme.dev', jira: 'marco@acme.dev', bitbucket: null },
  ],
}

export function mockResults(now: number = Date.now()): ProviderResult {
  return {
    pulls: [
      {
        source: 'ado', id: 4821, key: 'fleet-web!4821',
        title: 'Route optimizer: cache distance matrix between recalcs',
        url: 'https://dev.azure.com/acme/Fleet/_git/fleet-web/pullrequest/4821',
        repo: 'fleet-web',
        author: { name: 'Ben Okafor', id: 'ben@acme.dev' },
        createdAt: now - 4.6 * D, updatedAt: null, closedAt: null, isDraft: false, mergeBlocked: false,
        targetBranch: 'develop',
        groupReviewers: [],
        reviewers: [
          { name: 'Alice Chen', id: 'alice@acme.dev', vote: 'none', required: true },
          { name: 'Priya Nair', id: 'priya@acme.dev', vote: 'approved', required: false },
        ],
        ci: 'ok',
      },
      {
        source: 'ado', id: 4830, key: 'fleet-api!4830',
        title: 'Fix timezone drift in shift-end notifications',
        url: 'https://dev.azure.com/acme/Fleet/_git/fleet-api/pullrequest/4830',
        repo: 'fleet-api',
        author: { name: 'Priya Nair', id: 'priya@acme.dev' },
        createdAt: now - 1.2 * D, updatedAt: null, closedAt: null, isDraft: false, mergeBlocked: true,
        targetBranch: 'develop',
        groupReviewers: [],
        reviewers: [{ name: 'Alice Chen', id: 'alice@acme.dev', vote: 'none', required: false }],
        ci: 'none',
      },
      {
        source: 'ado', id: 4840, key: 'fleet-api!4840',
        title: 'Rotate depot geofence radii from config',
        url: 'https://dev.azure.com/acme/Fleet/_git/fleet-api/pullrequest/4840',
        repo: 'fleet-api',
        author: { name: 'Ben Okafor', id: 'ben@acme.dev' },
        createdAt: now - 1.9 * D, updatedAt: null, closedAt: null, isDraft: false, mergeBlocked: false,
        targetBranch: 'develop',
        groupReviewers: [{ name: 'SG_Developers', vote: 'none' }],
        reviewers: [],
        ci: 'none',
      },
      {
        source: 'ado', id: 4833, key: 'fleet-web!4833',
        title: 'Dispatcher board: keyboard navigation for stop cards',
        url: 'https://dev.azure.com/acme/Fleet/_git/fleet-web/pullrequest/4833',
        repo: 'fleet-web',
        author: { name: 'Marco Ruiz', id: 'marco@acme.dev' },
        createdAt: now - 3 * H, updatedAt: null, closedAt: null, isDraft: false, mergeBlocked: false,
        targetBranch: 'develop',
        groupReviewers: [],
        reviewers: [{ name: 'Alice Chen', id: 'alice@acme.dev', vote: 'none', required: false }],
        ci: 'none',
      },
      {
        source: 'ado', id: 4809, key: 'fleet-web!4809',
        title: 'Telemetry: batch GPS pings before upload',
        url: 'https://dev.azure.com/acme/Fleet/_git/fleet-web/pullrequest/4809',
        repo: 'fleet-web',
        author: { name: 'Alice Chen', id: 'alice@acme.dev' },
        createdAt: now - 2.8 * D, updatedAt: null, closedAt: null, isDraft: false, mergeBlocked: false,
        targetBranch: 'develop',
        groupReviewers: [],
        reviewers: [
          { name: 'Ben Okafor', id: 'ben@acme.dev', vote: 'none', required: true },
          { name: 'Marco Ruiz', id: 'marco@acme.dev', vote: 'none', required: false },
        ],
        ci: 'failed',
      },
      {
        source: 'ado', id: 4828, key: 'fleet-api!4828',
        title: '[FLT-788] Add idempotency keys to order-import endpoint',
        url: 'https://dev.azure.com/acme/Fleet/_git/fleet-api/pullrequest/4828',
        repo: 'fleet-api',
        author: { name: 'Alice Chen', id: 'alice@acme.dev' },
        createdAt: now - 7 * H, updatedAt: null, closedAt: null, isDraft: false, mergeBlocked: false,
        targetBranch: 'release/3.2',
        groupReviewers: [],
        reviewers: [{ name: 'Priya Nair', id: 'priya@acme.dev', vote: 'approved', required: true }],
        ci: 'ok',
      },
      {
        source: 'ado', id: 4842, key: 'fleet-web!4842',
        title: '[Snyk] Security upgrade axios from 1.6.0 to 1.8.2',
        url: 'https://dev.azure.com/acme/Fleet/_git/fleet-web/pullrequest/4842',
        repo: 'fleet-web',
        author: { name: 'Snyk bot', id: 'snyk-bot@acme.dev' },
        createdAt: now - 6 * H, updatedAt: null, closedAt: null, isDraft: false, mergeBlocked: false,
        targetBranch: 'develop',
        groupReviewers: [{ name: 'SG_Developers', vote: 'none' }],
        reviewers: [],
        ci: 'none',
      },
      {
        source: 'ado', id: 4835, key: 'fleet-mobile!4835',
        title: 'WIP: offline signature capture spike',
        url: 'https://dev.azure.com/acme/Fleet/_git/fleet-mobile/pullrequest/4835',
        repo: 'fleet-mobile',
        author: { name: 'Alice Chen', id: 'alice@acme.dev' },
        createdAt: now - 2 * H, updatedAt: null, closedAt: null, isDraft: true, mergeBlocked: false,
        targetBranch: 'develop',
        groupReviewers: [],
        reviewers: [],
        ci: 'none',
      },
    ],
    mergedPulls: [
      {
        source: 'ado', id: 4801, key: 'fleet-web!4801',
        title: '[FLT-795] Stop-card ETA recalculation on drag',
        url: 'https://dev.azure.com/acme/Fleet/_git/fleet-web/pullrequest/4801',
        repo: 'fleet-web',
        author: { name: 'Alice Chen', id: 'alice@acme.dev' },
        createdAt: now - 3 * D, updatedAt: null, closedAt: now - 1 * D, isDraft: false, mergeBlocked: false,
        targetBranch: 'develop',
        groupReviewers: [],
        reviewers: [{ name: 'Ben Okafor', id: 'ben@acme.dev', vote: 'approved', required: true }],
        ci: 'none',
      },
      {
        source: 'ado', id: 4796, key: 'fleet-api!4796',
        title: 'Bulk depot import validation',
        url: 'https://dev.azure.com/acme/Fleet/_git/fleet-api/pullrequest/4796',
        repo: 'fleet-api',
        author: { name: 'Ben Okafor', id: 'ben@acme.dev' },
        createdAt: now - 5 * D, updatedAt: null, closedAt: now - 2 * D, isDraft: false, mergeBlocked: false,
        targetBranch: 'develop',
        groupReviewers: [],
        reviewers: [],
        ci: 'none',
      },
    ],
    runs: [
      { source: 'ado', id: 91231, pipeline: 'fleet-web · develop', status: 'failed', branch: 'develop', finishedAt: now - 2 * H, url: 'https://dev.azure.com/acme/Fleet/_build/results?buildId=91231' },
      { source: 'ado', id: 91240, pipeline: 'fleet-api · release/3.2', status: 'running', branch: 'release/3.2', finishedAt: null, url: 'https://dev.azure.com/acme/Fleet/_build/results?buildId=91240' },
      { source: 'ado', id: 91226, pipeline: 'fleet-api · develop', status: 'ok', branch: 'develop', finishedAt: now - 5 * H, url: 'https://dev.azure.com/acme/Fleet/_build/results?buildId=91226' },
      { source: 'ado', id: 91219, pipeline: 'fleet-mobile · develop', status: 'ok', branch: 'develop', finishedAt: now - 9 * H, url: 'https://dev.azure.com/acme/Fleet/_build/results?buildId=91219' },
      { source: 'ado', id: 91101, pipeline: 'nightly-e2e', status: 'ok', branch: 'develop', finishedAt: now - 11 * H, url: 'https://dev.azure.com/acme/Fleet/_build/results?buildId=91101' },
    ],
    issues: [
      { source: 'jira', key: 'FLT-812', summary: 'Dispatch board loses selection after auto-refresh', status: 'Blocked', statusCategory: 'indeterminate', assignee: 'alice@acme.dev', assigneeName: 'Alice Chen', priority: 'High', url: 'https://acme.atlassian.net/browse/FLT-812', updatedAt: now - 3 * H, blocked: true },
      { source: 'jira', key: 'FLT-801', summary: 'Route optimizer caching (spike follow-up)', status: 'In Progress', statusCategory: 'indeterminate', assignee: 'alice@acme.dev', assigneeName: 'Alice Chen', priority: 'Medium', url: 'https://acme.atlassian.net/browse/FLT-801', updatedAt: now - 6 * H, blocked: false },
      { source: 'jira', key: 'FLT-820', summary: 'Driver app: signature capture offline mode', status: 'In Progress', statusCategory: 'indeterminate', assignee: 'alice@acme.dev', assigneeName: 'Alice Chen', priority: 'Medium', url: 'https://acme.atlassian.net/browse/FLT-820', updatedAt: now - 1 * D, blocked: false },
      { source: 'jira', key: 'FLT-826', summary: 'Escalation email uses stale depot name', status: 'To Do', statusCategory: 'new', assignee: 'alice@acme.dev', assigneeName: 'Alice Chen', priority: 'Low', url: 'https://acme.atlassian.net/browse/FLT-826', updatedAt: now - 2 * D, blocked: false },
      { source: 'jira', key: 'FLT-799', summary: 'Order import: reject rows with unknown SKUs', status: 'In Review', statusCategory: 'indeterminate', assignee: 'ben@acme.dev', assigneeName: 'Ben Okafor', priority: 'Medium', url: 'https://acme.atlassian.net/browse/FLT-799', updatedAt: now - 4 * H, blocked: false },
    ],
  }
}

export const mockProvider: Provider = {
  id: 'mock',
  label: 'Demo data',
  enabled: () => true,
  fetch: async () => mockResults(),
}
