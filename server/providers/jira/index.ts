import type { Provider } from '../contract.js'
import { fetchIssues } from './issues.js'

export const jira: Provider = {
  id: 'jira',
  label: 'Jira',
  enabled: (config) => config.jira !== null,
  fetch: async (config) => {
    if (config.jira === null) return { pulls: [], mergedPulls: [], runs: [], issues: [] }
    const mine = await fetchIssues(config.jira)
    if (config.jira.teamJql === null) return { pulls: [], mergedPulls: [], runs: [], issues: mine }
    // Team query merges in; dedupe by key with the personal fetch winning.
    const team = await fetchIssues({ ...config.jira, jql: config.jira.teamJql })
    const seen = new Set(mine.map((i) => i.key))
    return { pulls: [], mergedPulls: [], runs: [], issues: [...mine, ...team.filter((i) => !seen.has(i.key))] }
  },
}
