import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseStreamFile, type StreamEntry } from './stream.ts'

/** Every stream entry in the repo, newest first. */
export function loadStream(root = process.cwd()): StreamEntry[] {
  const dir = join(root, 'stream')
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((n) => /^\d{4}-\d{2}-\d{2}\.md$/.test(n))
    .flatMap((n) => parseStreamFile(n.slice(0, 10), readFileSync(join(dir, n), 'utf8')))
    .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`))
}

export function shortDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  })
}
