import { useState } from 'react'
import { useSnapshot } from './useSnapshot'
import { Header } from './components/Header'
import { Lane } from './components/Lane'
import { OwnPullCard, PullCard } from './components/PullCard'
import { IssueCard } from './components/IssueCard'
import { RunRow } from './components/RunRow'
import { plural } from './format'

export function App() {
  const { snapshot, connected } = useSnapshot()
  const [showQuiet, setShowQuiet] = useState(false)

  if (snapshot === null) {
    return (
      <div className="wrap">
        <header className="top">
          <div className="logo">
            <span className="mark">◆</span> daybrief
          </div>
        </header>
        <p style={{ color: 'var(--muted)' }}>first poll running…</p>
      </div>
    )
  }

  const { lanes, me, providers, generatedAt } = snapshot
  const failing = lanes.runs.filter((r) => r.status === 'failed')

  return (
    <div className="wrap">
      <Header me={me.name} generatedAt={generatedAt} connected={connected} providers={providers} />

      <main className="lanes">
        <Lane
          title="Needs your review"
          count={lanes.needsMyReview.length}
          hot
          emptyText="Nothing waiting on you. Enjoy the coffee."
        >
          {lanes.needsMyReview.map((pull) => (
            <PullCard key={`${pull.source}-${pull.key}`} pull={pull} />
          ))}
        </Lane>

        <Lane
          title="Your PRs in flight"
          count={lanes.myPulls.length}
          emptyText="Nothing of yours is open."
        >
          {lanes.myPulls.map((pull) => (
            <OwnPullCard key={`${pull.source}-${pull.key}`} pull={pull} />
          ))}
        </Lane>

        <Lane
          title="Your tickets"
          count={lanes.myIssues.length}
          emptyText="No open tickets assigned to you."
        >
          {lanes.myIssues.map((issue) => (
            <IssueCard key={issue.key} issue={issue} />
          ))}
        </Lane>
      </main>

      <section className="runs">
        <h2>
          Pipelines{' '}
          {failing.length > 0
            ? `— ${plural(failing.length, 'failure')} ${failing.length === 1 ? 'needs' : 'need'} eyes`
            : '— all quiet'}
        </h2>
        {/* Failures and in-flight runs are the news; the green wall collapses. */}
        {lanes.runs
          .filter((r) => r.status === 'failed' || r.status === 'running')
          .map((run) => (
            <RunRow key={`${run.source}-${run.id}`} run={run} />
          ))}
        {(() => {
          const quiet = lanes.runs.filter((r) => r.status === 'ok' || r.status === 'none')
          if (quiet.length === 0) return null
          if (!showQuiet) {
            return (
              <button type="button" className="quiet-toggle" onClick={() => setShowQuiet(true)}>
                + {plural(quiet.length, 'quiet pipeline')} (all green or idle)
              </button>
            )
          }
          return (
            <>
              {quiet.map((run) => (
                <RunRow key={`${run.source}-${run.id}`} run={run} />
              ))}
              <button type="button" className="quiet-toggle" onClick={() => setShowQuiet(false)}>
                − hide quiet pipelines
              </button>
            </>
          )
        })()}
      </section>

      <footer>daybrief · read-only by design · state assembled locally from your own access</footer>
    </div>
  )
}
