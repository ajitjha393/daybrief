import type { z } from 'zod'
import type { JiraConfig } from '../../config.js'
import { jiraCredentials } from '../../secrets.js'

export async function jiraGet<T extends z.ZodType>(cfg: JiraConfig, path: string, schema: T): Promise<z.infer<T>> {
  const { email, token } = jiraCredentials(cfg)
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
