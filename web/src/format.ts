const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

/** Compact relative age: 12m, 5h, 3d. Null in → em dash out. */
export function ago(ts: number | null, now: number = Date.now()): string {
  if (ts === null) return '—'
  const delta = Math.max(0, now - ts)
  if (delta < HOUR) return `${Math.max(1, Math.round(delta / MIN))}m`
  if (delta < DAY) return `${Math.round(delta / HOUR)}h`
  return `${Math.round(delta / DAY)}d`
}

/** Age severity for review pressure: fresh → aging → stale. */
export function ageLevel(ts: number | null, now: number = Date.now()): 'fresh' | 'aging' | 'stale' {
  if (ts === null) return 'fresh'
  const days = (now - ts) / DAY
  if (days >= 3) return 'stale'
  if (days >= 1) return 'aging'
  return 'fresh'
}

export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}
