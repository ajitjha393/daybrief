import type { Provider } from '../contract.js'
import { fetchMergedPulls, fetchPulls } from './pulls.js'
import { fetchRuns } from './runs.js'

export const ado: Provider = {
  id: 'ado',
  label: 'Azure DevOps',
  enabled: (config) => config.ado !== null,
  fetch: async (config) => {
    if (config.ado === null) return { pulls: [], mergedPulls: [], runs: [], issues: [] }
    const [pulls, mergedPulls, runs] = await Promise.all([
      fetchPulls(config.ado),
      fetchMergedPulls(config.ado),
      fetchRuns(config.ado),
    ])
    return { pulls, mergedPulls, runs, issues: [] }
  },
}
