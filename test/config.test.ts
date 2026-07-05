import { describe, expect, it } from 'vitest'
import { ConfigSchema } from '../server/config.js'

describe('config schema', () => {
  it('applies defaults: poll interval, az auth, env var names', () => {
    const parsed = ConfigSchema.parse({
      me: { name: 'Alice' },
      ado: { org: 'acme', projects: ['Fleet'] },
    })
    expect(parsed.pollSeconds).toBe(90)
    expect(parsed.ado?.auth).toBe('az')
    expect(parsed.ado?.repos).toEqual([])
    expect(parsed.jira).toBeNull()
  })

  it('requires at least one provider block', () => {
    const result = ConfigSchema.safeParse({ me: { name: 'Alice' } })
    expect(result.success).toBe(false)
  })

  it('rejects unknown auth modes with a pointed error', () => {
    const result = ConfigSchema.safeParse({
      me: { name: 'Alice' },
      ado: { org: 'acme', projects: ['Fleet'], auth: 'password' },
    })
    expect(result.success).toBe(false)
  })

  it('bounds the poll interval so nobody hammers their org APIs', () => {
    const result = ConfigSchema.safeParse({
      me: { name: 'Alice' },
      ado: { org: 'acme', projects: ['Fleet'] },
      pollSeconds: 1,
    })
    expect(result.success).toBe(false)
  })
})
