import { afterEach, describe, expect, it, vi } from 'vitest'
import { adoPat, jiraCredentials, setSecrets } from '../server/secrets.js'
import type { JiraConfig } from '../server/config.js'

const cfg: JiraConfig = { site: 's.atlassian.net', jql: null, emailEnv: 'DB_TEST_EMAIL', tokenEnv: 'DB_TEST_TOKEN' }

afterEach(() => {
  vi.unstubAllEnvs()
  setSecrets({ ado: null, jira: null, bitbucket: null, webhook: null })
})

describe('secret resolution', () => {
  it('falls back to the secrets file when env vars are absent', () => {
    setSecrets({ ado: null, jira: { email: 'file@x.dev', token: 'file-token' }, bitbucket: null, webhook: null })
    expect(jiraCredentials(cfg)).toEqual({ email: 'file@x.dev', token: 'file-token' })
  })

  it('env vars win over the secrets file', () => {
    setSecrets({ ado: null, jira: { email: 'file@x.dev', token: 'file-token' }, bitbucket: null, webhook: null })
    vi.stubEnv('DB_TEST_EMAIL', 'env@x.dev')
    vi.stubEnv('DB_TEST_TOKEN', 'env-token')
    expect(jiraCredentials(cfg)).toEqual({ email: 'env@x.dev', token: 'env-token' })
  })

  it('the missing-credentials error names both mechanisms', () => {
    expect(() => jiraCredentials(cfg)).toThrowError(/DB_TEST_EMAIL.*daybrief\.secrets\.json/s)
  })

  it('adoPat is null (not empty string) when nothing provides it', () => {
    expect(adoPat()).toBeNull()
    setSecrets({ ado: { pat: 'p' }, jira: null, bitbucket: null, webhook: null })
    expect(adoPat()).toBe('p')
  })
})
