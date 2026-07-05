import type { ProviderResult, ProviderStatus, StateSnapshot } from '../shared/types.js'
import type { Config } from './config.js'
import type { Provider } from './providers/contract.js'
import { computeLanes } from './lanes.js'

type Listener = (snapshot: StateSnapshot) => void

export interface PollerOptions {
  config: Config
  providers: Provider[]
  intervalMs: number
}

// One poll = every enabled provider fetched in parallel, each independently
// timed and caught. A failing provider reports its error in the status strip
// while its LAST GOOD data stays on the board — a Jira blip shouldn't blank
// your PR lanes at 9am.
export class Poller {
  private readonly listeners = new Set<Listener>()
  private readonly lastGood = new Map<string, ProviderResult>()
  private readonly statuses = new Map<string, ProviderStatus>()
  private snapshot: StateSnapshot | null = null
  private timer: NodeJS.Timeout | null = null

  constructor(private readonly opts: PollerOptions) {}

  current(): StateSnapshot | null {
    return this.snapshot
  }

  onState(fn: Listener): () => void {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  async refresh(): Promise<StateSnapshot> {
    const enabled = this.opts.providers.filter((p) => p.enabled(this.opts.config))
    await Promise.all(
      enabled.map(async (p) => {
        const started = Date.now()
        try {
          const result = await p.fetch(this.opts.config)
          this.lastGood.set(p.id, result)
          this.statuses.set(p.id, { id: p.id, label: p.label, ok: true, error: null, fetchedAt: Date.now(), tookMs: Date.now() - started })
        } catch (e) {
          const prev = this.statuses.get(p.id)
          this.statuses.set(p.id, {
            id: p.id,
            label: p.label,
            ok: false,
            error: e instanceof Error ? e.message : String(e),
            fetchedAt: prev?.fetchedAt ?? null,
            tookMs: null,
          })
        }
      }),
    )
    const results = [...this.lastGood.values()]
    this.snapshot = {
      generatedAt: Date.now(),
      me: { name: this.opts.config.me.name },
      lanes: computeLanes(this.opts.config, results),
      providers: [...this.statuses.values()],
    }
    for (const fn of this.listeners) fn(this.snapshot)
    return this.snapshot
  }

  start(): void {
    if (this.timer) return
    this.timer = setInterval(() => {
      void this.refresh()
    }, this.opts.intervalMs)
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }
}
