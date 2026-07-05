import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

// daybrief.json holds structure (orgs, projects, who's who); secrets live in
// environment variables only, referenced by name. A config file you can
// commit to a team repo without a security review is the point.

export async function loadConfig(path = 'daybrief.json') {
  let raw
  try {
    raw = await readFile(resolve(path), 'utf8')
  } catch {
    return { error: `no config found at ${path} — run \`daybrief init\` to create one` }
  }
  let cfg
  try {
    cfg = JSON.parse(raw)
  } catch (e) {
    return { error: `${path} is not valid JSON: ${e.message}` }
  }
  const problems = validate(cfg)
  if (problems.length) return { error: `config problems:\n  - ${problems.join('\n  - ')}` }
  return { config: withDefaults(cfg) }
}

export function validate(cfg) {
  const problems = []
  if (!cfg.me || !cfg.me.name) problems.push('me.name is required')
  const hasProvider = cfg.ado || cfg.jira || cfg.bitbucket
  if (!hasProvider) problems.push('configure at least one of: ado, jira, bitbucket')
  if (cfg.ado) {
    if (!cfg.ado.org) problems.push('ado.org is required')
    if (!Array.isArray(cfg.ado.projects) || cfg.ado.projects.length === 0) problems.push('ado.projects must be a non-empty array')
    if (cfg.ado.auth && !['az', 'pat'].includes(cfg.ado.auth)) problems.push("ado.auth must be 'az' or 'pat'")
  }
  if (cfg.jira && !cfg.jira.site) problems.push('jira.site is required')
  if (cfg.bitbucket && !cfg.bitbucket.workspace) problems.push('bitbucket.workspace is required')
  return problems
}

export function withDefaults(cfg) {
  return {
    pollSeconds: 90,
    people: [],
    ...cfg,
    me: { ado: null, jira: null, bitbucket: null, ...cfg.me },
    ado: cfg.ado ? { auth: 'az', repos: [], ...cfg.ado } : null,
    jira: cfg.jira ? { emailEnv: 'JIRA_EMAIL', tokenEnv: 'JIRA_API_TOKEN', jql: null, ...cfg.jira } : null,
    bitbucket: cfg.bitbucket ? { userEnv: 'BITBUCKET_USER', tokenEnv: 'BITBUCKET_APP_PASSWORD', repos: [], ...cfg.bitbucket } : null,
  }
}
