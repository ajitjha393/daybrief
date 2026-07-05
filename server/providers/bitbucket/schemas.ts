import { z } from 'zod'

export const BbPullSchema = z.object({
  id: z.number(),
  title: z.string().default('(untitled)'),
  author: z
    .object({ display_name: z.string().optional(), nickname: z.string().optional() })
    .optional(),
  created_on: z.string().optional(),
  updated_on: z.string().optional(),
  links: z.object({ html: z.object({ href: z.string() }).optional() }).optional(),
  destination: z.object({ branch: z.object({ name: z.string() }).optional() }).optional(),
})

export const BbPullListSchema = z.object({
  values: z.array(BbPullSchema).default([]),
})

export type BbPull = z.infer<typeof BbPullSchema>
