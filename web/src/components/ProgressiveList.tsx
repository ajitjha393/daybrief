import { useEffect, useRef, useState, type ReactNode } from 'react'

interface ProgressiveListProps<T> {
  items: T[]
  render: (item: T) => ReactNode
  /** How many to reveal initially and per scroll-step. */
  step?: number
}

/**
 * Infinite-scroll rendering without a windowing dependency: reveal `step`
 * items, and an IntersectionObserver sentinel reveals the next batch as it
 * scrolls into view. At daybrief's list sizes (≤ a few hundred rows) this
 * keeps the DOM light without the complexity of true virtualization.
 */
export function ProgressiveList<T>({ items, render, step = 15 }: ProgressiveListProps<T>) {
  const [visible, setVisible] = useState(step)
  const sentinel = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setVisible(step)
  }, [items.length, step])

  useEffect(() => {
    const node = sentinel.current
    if (node === null || visible >= items.length) return
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) setVisible((v) => Math.min(items.length, v + step))
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [visible, items.length, step])

  return (
    <>
      {items.slice(0, visible).map(render)}
      {visible < items.length && (
        <div ref={sentinel} className="list-sentinel">
          {items.length - visible} more…
        </div>
      )}
    </>
  )
}
