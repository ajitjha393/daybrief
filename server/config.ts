import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { z } from 'zod'

// daybrief.json holds structure (orgs, projects, who's who); secrets live in
// environment variables only, referenced here by NAME. A config file you can
// commit to a team repo without a security review is the point.

const MeSchema = z.object({
  name: z.string().min(1),
  ado: z.string().nullable().default(null),
  jira: z.string().nullable().default(null),
  bitbucket: z.string().nullable().default(null),
})

const AdoSchema = z.object({
  org: z.string().min(1),
  projects: z.array(z.string().min(1)).min(1),
  repos: z.array(z.string()).default([]),
  auth: z.enum(['az', 'pat']).default('az'),
})

const JiraSchema = z.object({
  site: z.string().min(1),
  jql: z.string().nullable().default(null),
  emailEnv: z.string().default('JIRA_EMAIL'),
  tokenEnv: z.string().default('JIRA_API_TOKEN'),
})

const BitbucketSchema = z.object({
  workspace: z.string().min(1),
  repos: z.array(z.string()).default([]),
  userEnv: z.string().default('BITBUCKET_USER'),
  tokenEnv: z.string().default('BITBUCKET_APP_PASSWORD'),
})

const PersonSchema = z.object({
  name: z.string().min(1),
  ado: z.string().nullable().default(null),
  jira: z.string().nullable().default(null),
  bitbucket: z.string().nullable().default(null),
})

export const ConfigSchema = z
  .object({
    me: MeSchema,
    pollSeconds: z.number().int().min(15).max(3600).default(90),
    ado: AdoSchema.nullable().default(null),
    jira: JiraSchema.nullable().default(null),
    bitbucket: BitbucketSchema.nullable().default(null),
    people: z.array(PersonSchema).default([]),
  })
  .refine((c) => c.ado !== null || c.jira !== null || c.bitbucket !== null, {
    message: 'configure at least one of: ado, jira, bitbucket',
  })

export type Config = z.infer<typeof ConfigSchema>
export type AdoConfig = NonNullable<Config['ado']>
export type JiraConfig = NonNullable<Config['jira']>
export type BitbucketConfig = NonNullable<Config['bitbucket']>

export type ConfigResult = { ok: true; config: Config } | { ok: false; error: string }

export async function loadConfig(path = 'daybrief.json'): Promise<ConfigResult> {
  let raw: string
  try {
    raw = await readFile(resolve(path), 'utf8')
  } catch {
    return { ok: false, error: `no config found at ${path} — run \`daybrief init\` to create one` }
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (e) {
    return { ok: false, error: `${path} is not valid JSON: ${e instanceof Error ? e.message : String(e)}` }
  }
  const result = ConfigSchema.safeParse(parsed)
  if (!result.success) {
    const problems = result.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
    return { ok: false, error: `config problems:\n  - ${problems.join('\n  - ')}` }
  }
  return { ok: true, config: result.data }
}
