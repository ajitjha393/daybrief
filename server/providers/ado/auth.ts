import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { AdoConfig } from '../../config.js'

const run = promisify(execFile)

// Two ways in, matching how enterprise ADO users actually authenticate:
// - 'az'  — shell out to the Azure CLI (no PAT to mint; works wherever
//           `az login` has happened). Tokens live ~1h; cache for 45min.
// - 'pat' — classic personal access token from the ADO_PAT env var.
const ADO_RESOURCE = '499b84ac-1321-427f-aa17-267ca6975798' // Azure DevOps first-party app id

let cache: { token: string; until: number } | null = null

export async function azToken(): Promise<string> {
  if (cache && Date.now() < cache.until) return cache.token
  const { stdout } = await run(
    'az',
    ['account', 'get-access-token', '--resource', ADO_RESOURCE, '--query', 'accessToken', '-o', 'tsv'],
    { timeout: 20_000 },
  )
  const token = stdout.trim()
  if (!token) throw new Error('az returned an empty token — run `az login`')
  cache = { token, until: Date.now() + 45 * 60 * 1000 }
  return token
}

export async function authHeader(cfg: AdoConfig): Promise<Record<string, string>> {
  if (cfg.auth === 'pat') {
    const pat = process.env['ADO_PAT']
    if (!pat) throw new Error('ado.auth is "pat" but the ADO_PAT env var is not set')
    return { Authorization: 'Basic ' + Buffer.from(':' + pat).toString('base64') }
  }
  try {
    return { Authorization: `Bearer ${await azToken()}` }
  } catch (e) {
    const why = e instanceof Error ? e.message : String(e)
    throw new Error(`azure cli auth failed (${why}) — run \`az login\`, or switch ado.auth to "pat"`)
  }
}
