import type { z } from 'zod'
import type { BitbucketConfig } from '../../config.js'

function credentials(cfg: BitbucketConfig): { user: string; token: string } {
  const user = process.env[cfg.userEnv]
  const token = process.env[cfg.tokenEnv]
  if (!user || !token) {
    throw new Error(`bitbucket needs ${cfg.userEnv} and ${cfg.tokenEnv} env vars (an app password, not your account password)`)
  }
  return { user, token }
}

export async function bbGet<T extends z.ZodType>(cfg: BitbucketConfig, path: string, schema: T): Promise<z.infer<T>> {
  const { user, token } = credentials(cfg)
  const res = await fetch(`https://api.bitbucket.org/2.0${path}`, {
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${user}:${token}`).toString('base64'),
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(20_000),
  })
  if (res.status === 401) throw new Error(`Bitbucket auth rejected — check ${cfg.userEnv}/${cfg.tokenEnv}`)
  if (!res.ok) throw new Error(`Bitbucket ${res.status} on ${path}`)
  const parsed: unknown = await res.json()
  return schema.parse(parsed)
}
