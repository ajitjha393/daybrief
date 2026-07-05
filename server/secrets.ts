import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { z } from 'zod'
import type { BitbucketConfig, JiraConfig } from './config.js'

// Optional daybrief.secrets.json — for machines where env vars are a chore.
// Resolution order everywhere: env var first, secrets file second, so CI and
// power users keep env behavior. The file is gitignored by the starter
// .gitignore and must never be committed; daybrief.json stays secret-free.

const SecretsSchema = z.object({
  ado: z.object({ pat: z.string().min(1) }).nullable().default(null),
  jira: z.object({ email: z.string().min(1), token: z.string().min(1) }).nullable().default(null),
  bitbucket: z.object({ user: z.string().min(1), appPassword: z.string().min(1) }).nullable().default(null),
})

export type Secrets = z.infer<typeof SecretsSchema>

const EMPTY: Secrets = { ado: null, jira: null, bitbucket: null }
let current: Secrets = EMPTY

export async function loadSecrets(path = 'daybrief.secrets.json'): Promise<{ found: boolean; error?: string }> {
  let raw: string
  try {
    raw = await readFile(resolve(path), 'utf8')
  } catch {
    current = EMPTY
    return { found: false }
  }
  try {
    current = SecretsSchema.parse(JSON.parse(raw))
    return { found: true }
  } catch (e) {
    current = EMPTY
    return { found: true, error: `${path} is invalid: ${e instanceof Error ? e.message : String(e)}` }
  }
}

/** Test seam and programmatic use. */
export function setSecrets(secrets: Secrets): void {
  current = secrets
}

export function adoPat(): string | null {
  return process.env['ADO_PAT'] ?? current.ado?.pat ?? null
}

export function jiraCredentials(cfg: JiraConfig): { email: string; token: string } {
  const email = process.env[cfg.emailEnv] ?? current.jira?.email
  const token = process.env[cfg.tokenEnv] ?? current.jira?.token
  if (!email || !token) {
    throw new Error(
      `jira needs ${cfg.emailEnv}/${cfg.tokenEnv} env vars, or daybrief.secrets.json with {"jira":{"email":"…","token":"…"}} (an Atlassian API token, not your password)`,
    )
  }
  return { email, token }
}

export function bitbucketCredentials(cfg: BitbucketConfig): { user: string; token: string } {
  const user = process.env[cfg.userEnv] ?? current.bitbucket?.user
  const token = process.env[cfg.tokenEnv] ?? current.bitbucket?.appPassword
  if (!user || !token) {
    throw new Error(
      `bitbucket needs ${cfg.userEnv}/${cfg.tokenEnv} env vars, or daybrief.secrets.json with {"bitbucket":{"user":"…","appPassword":"…"}}`,
    )
  }
  return { user, token }
}
