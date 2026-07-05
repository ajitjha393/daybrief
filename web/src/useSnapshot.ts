import { useEffect, useState } from 'react'
import type { StateSnapshot } from '../../shared/types'

export interface SnapshotState {
  snapshot: StateSnapshot | null
  connected: boolean
}

/**
 * Fast first paint from /api/state, then live updates over SSE.
 * EventSource reconnects on its own; `connected` drives the header dot.
 */
export function useSnapshot(): SnapshotState {
  const [snapshot, setSnapshot] = useState<StateSnapshot | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    let disposed = false

    void fetch('/api/state')
      .then(async (res) => (res.ok ? ((await res.json()) as StateSnapshot) : null))
      .then((s) => {
        if (!disposed && s !== null) setSnapshot(s)
      })
      .catch(() => undefined)

    const source = new EventSource('/api/events')
    source.onopen = () => setConnected(true)
    source.onerror = () => setConnected(false)
    source.onmessage = (event) => {
      try {
        setSnapshot(JSON.parse(event.data as string) as StateSnapshot)
      } catch {
        // malformed frame — keep the last good snapshot
      }
    }
    return () => {
      disposed = true
      source.close()
    }
  }, [])

  return { snapshot, connected }
}
