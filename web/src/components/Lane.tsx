import type { ReactNode } from 'react'

interface LaneProps {
  title: string
  count: number
  hot?: boolean
  emptyText: string
  children: ReactNode
}

export function Lane({ title, count, hot = false, emptyText, children }: LaneProps) {
  return (
    <section className="lane">
      <h2>
        {title}
        <span className={count > 0 && hot ? 'count hot' : 'count'}>{count}</span>
      </h2>
      {count === 0 ? <p className="empty">{emptyText}</p> : children}
    </section>
  )
}
