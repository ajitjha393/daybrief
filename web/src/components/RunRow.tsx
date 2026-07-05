import type { Run } from '../../../shared/types'
import { ago } from '../format'

const STATUS_TEXT: Record<Run['status'], string> = {
  ok: '● ok',
  failed: '● failed',
  running: '◐ running',
  none: '○ —',
}

export function RunRow({ run }: { run: Run }) {
  return (
    <div className="run">
      <span className={`status ${run.status}`}>{STATUS_TEXT[run.status]}</span>
      <a className="pipeline" href={run.url} target="_blank" rel="noreferrer">
        {run.pipeline}
      </a>
      <span className="branch">{run.branch}</span>
      <span className="when">{run.status === 'running' ? 'now' : ago(run.finishedAt)}</span>
    </div>
  )
}
