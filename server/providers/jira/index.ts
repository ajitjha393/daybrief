import type { Provider } from '../contract.js'
import { fetchIssues } from './issues.js'

export const jira: Provider = {
  id: 'jira',
  label: 'Jira',
  enabled: (config) => config.jira !== null,
  fetch: async (config) => {
    if (config.jira === null) return { pulls: [], runs: [], issues: [] }
    return { pulls: [], runs: [], issues: await fetchIssues(config.jira) }
  },
}
