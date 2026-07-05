import type { Run, RunStatus } from '../../../shared/types.js'
import { ms } from '../../../shared/normalize.js'
import type { AdoConfig } from '../../config.js'
import { adoGet } from './api.js'
import { AdoBuildSchema, adoListSchema, type AdoBuild } from './schemas.js'

// Latest build per pipeline definition. One page of recent builds per
// project covers every active definition; queueTime ordering means
// in-progress runs surface ahead of their previous finished run.
export async function fetchRuns(cfg: AdoConfig): Promise<Run[]> {
  const latest = new Map<string, Run>()
  const errors: string[] = []
  for (const project of cfg.projects) {
    let data
    try {
      data = await adoGet(
        cfg,
        `${encodeURIComponent(project)}/_apis/build/builds?$top=100&queryOrder=queueTimeDescending&api-version=7.1`,
        adoListSchema(AdoBuildSchema),
      )
    } catch (e) {
      errors.push(`${project}: ${e instanceof Error ? e.message : String(e)}`)
      continue
    }
    for (const raw of data.value) {
      const name = raw.definition?.name
      if (name === undefined || latest.has(name)) continue
      if (cfg.excludePipelines.some((x) => name.toLowerCase().includes(x.toLowerCase()))) continue
      latest.set(name, normalizeRun(raw))
    }
  }
  if (errors.length === cfg.projects.length) throw new Error(errors.join(' · '))
  for (const err of errors) console.error(`\x1b[2m◆ ado (runs): ${err}\x1b[0m`)
  return [...latest.values()]
}

export function normalizeRun(raw: AdoBuild): Run {
  return {
    source: 'ado',
    id: raw.id,
    pipeline: raw.definition?.name ?? 'unknown',
    status: runStatus(raw),
    branch: raw.sourceBranch.replace(/^refs\/heads\//, ''),
    finishedAt: ms(raw.finishTime),
    url: raw._links?.web?.href ?? raw.url,
  }
}

function runStatus(raw: AdoBuild): RunStatus {
  if (raw.status === 'inProgress' || raw.status === 'notStarted') return 'running'
  if (raw.result === 'succeeded') return 'ok'
  if (raw.result === 'failed' || raw.result === 'partiallySucceeded') return 'failed'
  return 'none'
}
