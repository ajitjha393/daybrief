import type { Config } from '../config.js'
import type { ProviderResult } from '../../shared/types.js'

// A provider turns one service's API into the shared domain model.
// enabled() gates on config presence; fetch() must throw with a HUMAN
// message on failure — it becomes the status line in the UI, so
// "ADO auth rejected (401) — run `az login`" beats a stack trace.

export interface Provider {
  id: string
  label: string
  enabled(config: Config): boolean
  fetch(config: Config): Promise<ProviderResult>
}
