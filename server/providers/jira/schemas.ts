import { z } from 'zod'

export const JiraStatusSchema = z.object({
  name: z.string().default('Unknown'),
  statusCategory: z.object({ key: z.enum(['new', 'indeterminate', 'done']).catch('new') }).optional(),
})

export const JiraIssueSchema = z.object({
  key: z.string(),
  fields: z.object({
    summary: z.string().default('(no summary)'),
    status: JiraStatusSchema.optional(),
    assignee: z
      .object({ emailAddress: z.string().optional(), displayName: z.string().optional() })
      .nullable()
      .default(null),
    priority: z.object({ name: z.string() }).nullable().default(null),
    updated: z.string().optional(),
    labels: z.array(z.string()).default([]),
  }),
})

export const JiraSearchSchema = z.object({
  issues: z.array(JiraIssueSchema).default([]),
})

export type JiraIssue = z.infer<typeof JiraIssueSchema>
