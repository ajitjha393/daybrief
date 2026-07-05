import type { OwnPull, Pull } from '../../../shared/types'
import { ago, ageLevel } from '../format'

const VOTE_LABEL: Record<Pull['reviewers'][number]['vote'], string> = {
  approved: '✓',
  suggested: '✓~',
  none: '·',
  waiting: '↺',
  rejected: '✕',
}

export function PullCard({ pull }: { pull: Pull }) {
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
        {pull.isDraft && <span className="badge">draft</span>}
        {pull.mergeBlocked && <span className="badge bad">merge conflict</span>}
      </div>
    </article>
  )
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
