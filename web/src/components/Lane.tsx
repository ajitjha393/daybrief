import type { ReactNode } from 'react'

interface LaneProps {
  title: string
  /** Muted clarifier, e.g. "assigned to you". */
  sub?: string
  count: number
  hot?: boolean
  /** Span the full grid width. */
  full?: boolean
  emptyText: string
  children: ReactNode
}

export function Lane({ title, sub, count, hot = false, full = false, emptyText, children }: LaneProps) {
  return (
    <section className={full ? 'lane full' : 'lane'}>
      <h2>
        {title}
        {sub !== undefined && <span className="lane-sub">{sub}</span>}
        <span className={count > 0 && hot ? 'count hot' : 'count'}>{count}</span>
      </h2>
      {count === 0 ? <p className="empty">{emptyText}</p> : children}
    </section>
  )
}
