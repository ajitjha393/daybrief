import type { Issue } from '../../../shared/types'
import { ago } from '../format'

export function IssueCard({ issue }: { issue: Issue }) {
  return (
    <article className="card">
      <div className="title">
        <a href={issue.url} target="_blank" rel="noreferrer">
          {issue.summary}
        </a>
      </div>
      <div className="sub">
        <span className="repo">{issue.key}</span>
        <span className={issue.blocked ? 'badge bad' : 'badge'}>{issue.status}</span>
        {issue.priority !== null && <span>{issue.priority}</span>}
        <span>updated {ago(issue.updatedAt)} ago</span>
      </div>
    </article>
  )
}
