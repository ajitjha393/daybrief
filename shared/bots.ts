import type { Pull } from './types.js'

// Automation PRs deserve a corral, not a place in your review queue.
// Detection is by author (service accounts, [bot] suffixes) with a title
// fallback for services that raise PRs under a shared account.
const BOT_AUTHOR = /snyk|dependabot|renovate|greenkeeper|whitesource|mend|\[bot\]|_bot$|^bot_/i
const BOT_TITLE = /^\[snyk\]|^fix: upgrade .* to|^chore\(deps\)|^build\(deps\)|security upgrade/i

export function isBotPull(pull: Pull): boolean {
  return BOT_AUTHOR.test(pull.author.name) || BOT_AUTHOR.test(pull.author.id ?? '') || BOT_TITLE.test(pull.title)
}
