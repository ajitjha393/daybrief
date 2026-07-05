import type { ProviderStatus } from '../../../shared/types'
import { ago } from '../format'
import { useTheme, type Theme } from '../useTheme'

interface HeaderProps {
  me: string
  generatedAt: number
  connected: boolean
  providers: ProviderStatus[]
  view: 'all' | 'radiator'
}

const THEME_LABEL: Record<Theme, string> = { system: '◐ auto', light: '☀ light', dark: '☾ dark' }

export function Header({ me, generatedAt, connected, providers, view }: HeaderProps) {
  const { theme, cycle } = useTheme()
  return (
    <header className="top">
      <div className="logo">
        <span className="mark">◆</span> daybrief
        <small>your day, briefed</small>
      </div>
      <div className="meta">
        <nav className="nav">
          {view === 'radiator' ? (
            <a href="#">← my day</a>
          ) : (
            <a href="#team" title="team-only view for a wall screen">
              radiator ⇱
            </a>
          )}
        </nav>
        {providers.map((p) => (
          <span key={p.id} className="provider" title={p.error ?? `${p.label}: ok`}>
            <span className={`dot ${p.ok ? 'ok' : 'err'}`} />
            {p.label}
          </span>
        ))}
        <span className="provider">
          <span className={`dot ${connected ? 'ok' : 'off'}`} />
          {connected ? 'live' : 'reconnecting'}
        </span>
        <span>
          {me} · as of {ago(generatedAt)} ago
        </span>
        <button type="button" className="theme-btn" onClick={cycle} title="theme: system → light → dark">
          {THEME_LABEL[theme]}
        </button>
      </div>
    </header>
  )
}
