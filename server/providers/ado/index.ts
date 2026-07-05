import type { Provider } from '../contract.js'
import { fetchPulls } from './pulls.js'
import { fetchRuns } from './runs.js'

export const ado: Provider = {
  id: 'ado',
  label: 'Azure DevOps',
  enabled: (config) => config.ado !== null,
  fetch: async (config) => {
    if (config.ado === null) return { pulls: [], runs: [], issues: [] }
    const [pulls, runs] = await Promise.all([fetchPulls(config.ado), fetchRuns(config.ado)])
    return { pulls, runs, issues: [] }
  },
}
