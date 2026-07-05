import type { Issue } from '../../../shared/types.js'
import { ms } from '../../../shared/normalize.js'
import type { JiraConfig } from '../../config.js'
import { jiraGet } from './api.js'
import { JiraSearchSchema, type JiraIssue } from './schemas.js'

// Config-provided JQL wins; the default is a sane personal view. "Blocked"
// is convention-driven in Jira — a blocked-ish status name or label is the
// honest cross-team heuristic without site-specific custom fields.
const DEFAULT_JQL = 'assignee = currentUser() AND statusCategory != Done ORDER BY updated DESC'

const FIELDS = 'summary,status,assignee,priority,updated,labels'

export async function fetchIssues(cfg: JiraConfig): Promise<Issue[]> {
  const jql = cfg.jql ?? DEFAULT_JQL
  const data = await jiraGet(
    cfg,
    `/rest/api/3/search/jql?jql=${encodeURIComponent(jql)}&fields=${FIELDS}&maxResults=100`,
    JiraSearchSchema,
  )
  return data.issues.map((raw) => normalizeIssue(raw, cfg.site))
}

export function normalizeIssue(raw: JiraIssue, site: string): Issue {
  const statusName = raw.fields.status?.name ?? 'Unknown'
  const blockedByStatus = /block|imped/i.test(statusName)
  const blockedByLabel = raw.fields.labels.some((l) => /^blocked$/i.test(l))
  return {
    source: 'jira',
    key: raw.key,
    summary: raw.fields.summary,
    status: statusName,
    statusCategory: raw.fields.status?.statusCategory?.key ?? 'new',
    assignee: raw.fields.assignee?.emailAddress ?? null,
    assigneeName: raw.fields.assignee?.displayName ?? null,
    priority: raw.fields.priority?.name ?? null,
    url: `https://${site}/browse/${raw.key}`,
    updatedAt: ms(raw.fields.updated),
    blocked: blockedByStatus || blockedByLabel,
  }
}
