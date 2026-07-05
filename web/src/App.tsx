import { useEffect, useState } from 'react'
import { useSnapshot } from './useSnapshot'
import { Header } from './components/Header'
import { Lane } from './components/Lane'
import { OwnPullCard, PullCard } from './components/PullCard'
import { IssueCard } from './components/IssueCard'
import { RunRow } from './components/RunRow'
import { TeamView } from './components/TeamView'
import { ProgressiveList } from './components/ProgressiveList'
import { plural } from './format'

// One page shows everything — you, then the team. '#team' is radiator mode:
// team-only, for the wall screen.
type View = 'all' | 'radiator'

function currentView(): View {
  return location.hash === '#team' ? 'radiator' : 'all'
}

export function App() {
  const { snapshot, connected } = useSnapshot()
  const [showQuiet, setShowQuiet] = useState(false)
  const [view, setView] = useState<View>(currentView)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const onHash = (): void => setView(currentView())
    addEventListener('hashchange', onHash)
    return () => removeEventListener('hashchange', onHash)
  }, [])

  // The browser tab is a status light: pending reviews show in the title.
  useEffect(() => {
    const n = snapshot?.lanes.needsMyReview.length ?? 0
    document.title = n > 0 ? `(${n}) daybrief` : 'daybrief'
  }, [snapshot])

  if (snapshot === null) {
    return (
      <div className="wrap">
        <header className="top">
          <div className="logo">
            <span className="mark">◆</span> daybrief
            <small>first poll running…</small>
          </div>
        </header>
        <main className="lanes" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <section key={i} className="lane">
              <div className="skeleton skeleton-title" />
              <div className="skeleton skeleton-card" />
              <div className="skeleton skeleton-card" />
              <div className="skeleton skeleton-card" style={{ opacity: 0.6 }} />
            </section>
          ))}
        </main>
      </div>
    )
  }

  const { lanes, team, me, providers, generatedAt, brief } = snapshot
  const failing = lanes.runs.filter((r) => r.status === 'failed')
  const quiet = lanes.runs.filter((r) => r.status === 'ok' || r.status === 'none')
  const loud = lanes.runs.filter((r) => r.status === 'failed' || r.status === 'running')

  return (
    <div className="wrap">
      <Header me={me.name} generatedAt={generatedAt} connected={connected} providers={providers} view={view} />

      {view === 'radiator' ? (
        <TeamView team={team} />
      ) : (
        <>
          <main className="lanes">
            <Lane
              title="Needs your review"
              sub="assigned to you, or a group that likely includes you"
              count={lanes.needsMyReview.length}
              hot
              emptyText="Nothing waiting on you. Enjoy the coffee."
            >
              <ProgressiveList
                items={lanes.needsMyReview}
                render={(pull) => <PullCard key={`${pull.source}-${pull.key}`} pull={pull} />}
              />
            </Lane>

            <Lane
              title="Your PRs in flight"
              sub="created by you, not merged yet"
              count={lanes.myPulls.length}
              emptyText="Nothing of yours is open."
            >
              <ProgressiveList
                items={lanes.myPulls}
                render={(pull) => <OwnPullCard key={`${pull.source}-${pull.key}`} pull={pull} />}
              />
            </Lane>

            <Lane
              title="Your tickets"
              sub="assigned to you"
              count={lanes.myIssues.length}
              emptyText="No open tickets assigned to you."
            >
              <ProgressiveList
                items={lanes.myIssues}
                render={(issue) => <IssueCard key={issue.key} issue={issue} />}
              />
            </Lane>
          </main>

          <section className="runs">
            <h2>
              Pipelines{' '}
              {failing.length > 0
                ? `— ${plural(failing.length, 'failure')} ${failing.length === 1 ? 'needs' : 'need'} eyes`
                : '— all quiet'}
            </h2>
            {loud.map((run) => (
              <RunRow key={`${run.source}-${run.id}`} run={run} />
            ))}
            {quiet.length > 0 && !showQuiet && (
              <button type="button" className="quiet-toggle" onClick={() => setShowQuiet(true)}>
                + {plural(quiet.length, 'quiet pipeline')} (all green or idle)
              </button>
            )}
            {quiet.length > 0 && showQuiet && (
              <>
                <ProgressiveList items={quiet} render={(run) => <RunRow key={`${run.source}-${run.id}`} run={run} />} />
                <button type="button" className="quiet-toggle" onClick={() => setShowQuiet(false)}>
                  − hide quiet pipelines
                </button>
              </>
            )}
          </section>

          {lanes.botPulls.length > 0 && (
            <section className="runs">
              <h2>
                Automated PRs
                <span className="lane-sub">Snyk, Dependabot & friends — kept out of your review queue</span>
                <span className="count">{lanes.botPulls.length}</span>
              </h2>
              <ProgressiveList
                items={lanes.botPulls}
                step={6}
                render={(pull) => <PullCard key={`${pull.source}-${pull.key}`} pull={pull} />}
              />
            </section>
          )}

          <div className="section-head">
            <h2>Team</h2>
            <span className="lane-sub">everyone's state that needs action — counts, never rankings</span>
          </div>
          <TeamView team={team} />

          {brief.length > 0 && (
            <section className="runs brief">
              <h2>
                Standup, drafted
                <button
                  type="button"
                  className="copy-btn"
                  onClick={() => {
                    void navigator.clipboard.writeText(brief).then(() => {
                      setCopied(true)
                      setTimeout(() => setCopied(false), 1500)
                    })
                  }}
                >
                  {copied ? 'copied ✓' : 'copy'}
                </button>
              </h2>
              <pre>{brief}</pre>
            </section>
          )}
        </>
      )}

      <footer>daybrief · read-only by design · state assembled locally from your own access</footer>
    </div>
  )
}
