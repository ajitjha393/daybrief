import type { TeamState } from '../../../shared/types'
import { Lane } from './Lane'
import { PullCard } from './PullCard'
import { IssueCard } from './IssueCard'
import { ProgressiveList } from './ProgressiveList'

// The radiator: shared state that needs action. Counts per person, never
// rankings — that line is what keeps a team screen trusted.

export function TeamView({ team }: { team: TeamState }) {
  return (
    <>
      <main className="lanes team">
        <Lane
          title="Open PRs, oldest first"
          count={team.stalePulls.length}
          hot
          emptyText="No open PRs anywhere. Ship it and go outside."
        >
          <ProgressiveList
            items={team.stalePulls}
            render={(pull) => <PullCard key={`${pull.source}-${pull.key}`} pull={pull} />}
          />
        </Lane>

        <section className="lane">
          <h2>
            Team pulse
            <span className="count">{team.people.length}</span>
          </h2>
          {team.people.length === 0 ? (
            <p className="empty">Nobody has anything in flight.</p>
          ) : (
            <div className="scroll-x">
              <table className="pulse">
                <thead>
                  <tr>
                    <th>Person</th>
                    <th>Open PRs</th>
                    <th>Reviews owed</th>
                    <th>Tickets</th>
                    <th>Blocked</th>
                  </tr>
                </thead>
                <tbody>
                  {team.people.map((p) => (
                    <tr key={p.name}>
                      <td>{p.name}</td>
                      <td>{p.openPulls || '—'}</td>
                      <td className={p.reviewsOwed >= 3 ? 'hot-cell' : undefined}>{p.reviewsOwed || '—'}</td>
                      <td>{p.openIssues || '—'}</td>
                      <td className={p.blockedIssues > 0 ? 'bad-cell' : undefined}>{p.blockedIssues || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <Lane
          title="Blocked, team-wide"
          full
          count={team.blockedIssues.length}
          emptyText="Nothing is blocked. Suspiciously smooth."
        >
          {team.blockedIssues.map((issue) => (
            <IssueCard key={issue.key} issue={issue} />
          ))}
        </Lane>
      </main>
    </>
  )
}
