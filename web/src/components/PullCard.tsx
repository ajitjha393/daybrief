import type { OwnPull, Pull, ReviewPull } from '../../../shared/types'
import { ago, ageLevel } from '../format'

const VOTE_LABEL: Record<Pull['reviewers'][number]['vote'], string> = {
  approved: '✓',
  suggested: '✓~',
  none: '·',
  waiting: '↺',
  rejected: '✕',
}

export function PullCard({ pull }: { pull: Pull | ReviewPull }) {
  const via = 'via' in pull ? pull.via : null
  return (
    <article className="card">
      <div className="title">
        <a href={pull.url} target="_blank" rel="noreferrer">
          {pull.title}
        </a>
      </div>
      <div className="sub">
        <span className="repo">{pull.key}</span>
        <span className={`age ${ageLevel(pull.createdAt)}`}>{ago(pull.createdAt)}</span>
        <span>{pull.author.name}</span>
        {pull.targetBranch !== null && <span>→ {pull.targetBranch}</span>}
        {via !== null && <span className="badge warn">via {via}</span>}
        {pull.isDraft && <span className="badge">draft</span>}
        {pull.mergeBlocked && <span className="badge bad">merge conflict</span>}
        <CiBadge ci={pull.ci} />
      </div>
    </article>
  )
}

function CiBadge({ ci }: { ci: Pull['ci'] }) {
  if (ci === 'failed') return <span className="badge bad">CI failed</span>
  if (ci === 'running') return <span className="badge warn">CI running</span>
  if (ci === 'ok') return <span className="badge good">CI ✓</span>
  return null
}

export function OwnPullCard({ pull }: { pull: OwnPull }) {
  const approved = pull.reviewers.filter((r) => r.vote === 'approved' || r.vote === 'suggested')
  const ready = !pull.isDraft && pull.waitingOn.length === 0 && approved.length > 0 && !pull.mergeBlocked
  return (
    <article className="card">
      <div className="title">
        <a href={pull.url} target="_blank" rel="noreferrer">
          {pull.title}
        </a>
      </div>
      <div className="sub">
        <span className="repo">{pull.key}</span>
        <span className={`age ${ageLevel(pull.createdAt)}`}>{ago(pull.createdAt)}</span>
        {pull.targetBranch !== null && <span>→ {pull.targetBranch}</span>}
        {pull.isDraft && <span className="badge">draft</span>}
        {pull.mergeBlocked && <span className="badge bad">merge conflict</span>}
        {ready && <span className="badge good">ready to merge</span>}
        <CiBadge ci={pull.ci} />
      </div>
      {(pull.waitingOn.length > 0 || approved.length > 0) && (
        <div className="chips">
          {pull.waitingOn.map((name) => (
            <span key={name} className="chip">
              waiting on {name}
            </span>
          ))}
          {approved.map((r) => (
            <span key={r.name} className="chip approved">
              {VOTE_LABEL[r.vote]} {r.name}
            </span>
          ))}
        </div>
      )}
    </article>
  )
}
