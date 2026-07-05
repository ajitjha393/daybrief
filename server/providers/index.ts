import type { Provider } from './contract.js'
import { ado } from './ado/index.js'
import { jira } from './jira/index.js'
import { bitbucket } from './bitbucket/index.js'

export const providers: Provider[] = [ado, jira, bitbucket]
