import type { z } from 'zod'
import type { JiraConfig } from '../../config.js'

function credentials(cfg: JiraConfig): { email: string; token: string } {
  const email = process.env[cfg.emailEnv]
  const token = process.env[cfg.tokenEnv]
  if (!email || !token) {
    throw new Error(`jira needs ${cfg.emailEnv} and ${cfg.tokenEnv} env vars (an Atlassian API token, not your password)`)
  }
  return { email, token }
}

export async function jiraGet<T extends z.ZodType>(cfg: JiraConfig, path: string, schema: T): Promise<z.infer<T>> {
  const { email, token } = credentials(cfg)
  const res = await fetch(`https://${cfg.site}${path}`, {
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${email}:${token}`).toString('base64'),
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(20_000),
  })
  if (res.status === 401) throw new Error(`Jira auth rejected — check ${cfg.emailEnv}/${cfg.tokenEnv}`)
  if (!res.ok) throw new Error(`Jira ${res.status} on ${path}`)
  const parsed: unknown = await res.json()
  return schema.parse(parsed)
}
