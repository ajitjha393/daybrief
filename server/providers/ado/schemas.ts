import { z } from 'zod'

// Zod schemas for the slices of ADO payloads daybrief reads — captured from
// live API responses, not docs. Unknown extra fields pass through unread;
// missing optionals degrade to safe defaults instead of crashing the poll.

export const AdoIdentitySchema = z.object({
  displayName: z.string().optional(),
  uniqueName: z.string().optional(),
  id: z.string().optional(),
})

export const AdoReviewerSchema = AdoIdentitySchema.extend({
  vote: z.number().default(0),
  isRequired: z.boolean().default(false),
  isContainer: z.boolean().default(false),
})

export const AdoPullSchema = z.object({
  pullRequestId: z.number(),
  title: z.string().default('(untitled)'),
  repository: z.object({ name: z.string() }).optional(),
  createdBy: AdoIdentitySchema.optional(),
  creationDate: z.string().optional(),
  isDraft: z.boolean().default(false),
  mergeStatus: z.string().optional(),
  targetRefName: z.string().optional(),
  reviewers: z.array(AdoReviewerSchema).default([]),
})

export const AdoBuildSchema = z.object({
  id: z.number(),
  status: z.string().optional(),
  result: z.string().optional(),
  sourceBranch: z.string().default(''),
  finishTime: z.string().optional(),
  url: z.string().default(''),
  definition: z.object({ name: z.string() }).optional(),
  _links: z.object({ web: z.object({ href: z.string() }).optional() }).optional(),
})

export function adoListSchema<T extends z.ZodType>(item: T) {
  return z.object({ value: z.array(item).default([]) })
}

export type AdoPull = z.infer<typeof AdoPullSchema>
export type AdoBuild = z.infer<typeof AdoBuildSchema>
