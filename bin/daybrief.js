#!/usr/bin/env node
// Thin launcher — the real CLI is compiled TypeScript in dist/.
import('../dist/server/cli.js').catch((e) => {
  console.error('daybrief: compiled server missing (run `npm run build`) —', e instanceof Error ? e.message : e)
  process.exit(1)
})
