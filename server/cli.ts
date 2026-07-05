import { copyFile, access } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { loadConfig, type Config } from './config.js'
import { loadSecrets } from './secrets.js'
import { providers } from './providers/index.js'
import { mockConfig, mockProvider } from './mock.js'
import { Poller } from './poller.js'
import { startHttp } from './http.js'
import { buildDigest, digestDue, sendDigest } from './digest.js'

const args = process.argv.slice(2)
const flag = (name: string): boolean => args.includes(`--${name}`)
const opt = (name: string, fallback: string): string => {
  const i = args.indexOf(`--${name}`)
  const value = i >= 0 ? args[i + 1] : undefined
  return value !== undefined && !value.startsWith('--') ? value : fallback
}
const log = (msg: string): void => console.error(`\x1b[2m◆\x1b[0m ${msg}`)

if (flag('help') || flag('h')) {
  console.log(`daybrief — your day, briefed. Read-only morning dashboard for ADO + Jira + Bitbucket.

Usage:
  daybrief init             write a starter daybrief.json next to you
  daybrief [options]        start the dashboard
  daybrief digest           poll once and post the team digest to your webhook
                            (--dry-run prints instead of posting; cron-friendly)

Options:
  --config <path>   config file (default: ./daybrief.json)
  --port <n>        preferred port (default: 4400)
  --mock            demo data, zero credentials — try the UI instantly
  --no-open         don't auto-open the browser

Secrets come from env vars named in the config; nothing is ever written back
to ADO/Jira/Bitbucket — daybrief is read-only by design.`)
  process.exit(0)
}

if (args[0] === 'init') {
  await runInit()
} else if (args[0] === 'digest') {
  await runDigest()
} else {
  await runServe()
}

// One-shot digest: poll once, post to the channel webhook (cron-friendly).
async function runDigest(): Promise<void> {
  const config = await loadRealConfig()
  const poller = new Poller({ config, providers, intervalMs: 3_600_000 })
  const snapshot = await poller.refresh()
  const text = buildDigest(snapshot, config)
  if (flag('dry-run')) {
    console.log(text)
    return
  }
  await sendDigest(text, config)
  log('digest posted')
}

async function loadRealConfig(): Promise<Config> {
  const loaded = await loadConfig(opt('config', 'daybrief.json'))
  if (!loaded.ok) {
    console.error(loaded.error)
    process.exit(1)
  }
  const secrets = await loadSecrets(opt('secrets', 'daybrief.secrets.json'))
  if (secrets.error !== undefined) {
    console.error(secrets.error)
    process.exit(1)
  }
  if (secrets.found) log('secrets: daybrief.secrets.json loaded (env vars still win)')
  return loaded.config
}

async function runInit(): Promise<void> {
  const target = 'daybrief.json'
  try {
    await access(target)
    console.error(`${target} already exists — not touching it`)
    process.exit(1)
  } catch {
    // good: it doesn't exist yet
  }
  const example = fileURLToPath(new URL('../../daybrief.example.json', import.meta.url))
  await copyFile(example, target)
  console.log(`wrote ${target} — fill in your org, projects and identities, then run \`daybrief\``)
}

async function runServe(): Promise<void> {
  const mock = flag('mock')
  const config = mock ? mockConfig : await loadRealConfig()

  console.error(`\x1b[1m◆ daybrief\x1b[0m${mock ? ' — demo data' : ''}`)
  const poller = new Poller({
    config,
    providers: mock ? [mockProvider] : providers,
    intervalMs: config.pollSeconds * 1000,
  })

  const first = await poller.refresh()
  for (const p of first.providers) {
    log(p.ok ? `${p.label}: ok (${p.tookMs}ms)` : `${p.label}: ${p.error ?? 'failed'}`)
  }
  const { needsMyReview, myPulls, myIssues, runs } = first.lanes
  log(`${needsMyReview.length} need your review · ${myPulls.length} of yours in flight · ${myIssues.length} tickets · ${runs.filter((r) => r.status === 'failed').length} red pipelines`)

  poller.start()

  // Scheduled digest: once per day at config.digest.at, checked every half-minute.
  if (config.digest !== null) {
    let lastSentDay: string | null = null
    const digestCfg = config.digest
    setInterval(() => {
      const { due, dayKey } = digestDue(digestCfg.at, lastSentDay)
      if (!due) return
      lastSentDay = dayKey
      const snapshot = poller.current()
      if (snapshot === null) return
      sendDigest(buildDigest(snapshot, config), config)
        .then(() => log(`digest posted (${digestCfg.at})`))
        .catch((e: unknown) => log(`digest failed: ${e instanceof Error ? e.message : String(e)}`))
    }, 30_000)
    log(`digest scheduled daily at ${digestCfg.at} (run \`daybrief digest --dry-run\` to preview)`)
  }

  const { url } = await startHttp(poller, Number(opt('port', '4400')))
  log(`dashboard → \x1b[1m${url}\x1b[0m  (ctrl-c to stop)`)
  if (!flag('no-open')) openBrowser(url)
}

function openBrowser(url: string): void {
  const [cmd, cmdArgs] =
    process.platform === 'darwin'
      ? ['open', [url]]
      : process.platform === 'win32'
        ? ['cmd', ['/c', 'start', url]]
        : ['xdg-open', [url]]
  execFile(cmd, cmdArgs, () => undefined)
}
