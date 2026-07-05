import type { Provider } from '../contract.js'
import { fetchPulls } from './pulls.js'

export const bitbucket: Provider = {
  id: 'bitbucket',
  label: 'Bitbucket',
  enabled: (config) => config.bitbucket !== null,
  fetch: async (config) => {
    if (config.bitbucket === null) return { pulls: [], runs: [], issues: [] }
    return { pulls: await fetchPulls(config.bitbucket), runs: [], issues: [] }
  },
}
