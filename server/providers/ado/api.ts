import type { z } from 'zod'
import type { AdoConfig } from '../../config.js'
import { authHeader } from './auth.js'

// ADO REST responses can arrive with a UTF-8 BOM, which plain JSON.parse
// rejects — strip it before parsing. (Found the hard way.)
export async function adoGet<T extends z.ZodType>(cfg: AdoConfig, path: string, schema: T): Promise<z.infer<T>> {
  const url = `https://dev.azure.com/${cfg.org}/${path}`
  const res = await fetch(url, { headers: await authHeader(cfg), signal: AbortSignal.timeout(20_000) })
  if (res.status === 401 || res.status === 403) {
    throw new Error(`ADO auth rejected (${res.status}) — token expired? run \`az login\``)
  }
  if (!res.ok) throw new Error(`ADO ${res.status} on ${path}`)
  const text = await res.text()
  const parsed: unknown = JSON.parse(text.replace(/^﻿/, ''))
  return schema.parse(parsed)
}
