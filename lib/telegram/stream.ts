import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { localDate, localTime } from '../time.ts'
import type { EntryAction } from './parse.ts'

const MEDIA = /!\[\]\(\.\.\/(media\/[^)]+)\)/

/** An entry starts with a line that is exactly "## HH:MM". */
const ENTRY_START = /^(?=## \d\d:\d\d$)/m

function blocks(text: string): string[] {
  return text
    .split(ENTRY_START)
    .map((b) => b.trim())
    .filter(Boolean)
}

const write = (file: string, bs: string[]) => writeFileSync(file, `${bs.join('\n\n')}\n`)

/** Adds one entry to stream/<Chișinău date>.md, keeping blocks in time order; returns the repo-relative path. */
export function appendEntry(root: string, a: EntryAction, photoPath?: string, camera?: string): string {
  const path = `stream/${localDate(a.at)}.md`
  const file = join(root, path)
  const lines = [`## ${localTime(a.at)}`]
  if (a.topic) lines.push(`topic: ${a.topic}`)
  const parts = [lines.join('\n')]
  // A text line that looks like an entry heading would split the entry; a leading space defuses it.
  if (a.text) parts.push(a.text.replace(/^(## \d\d:\d\d)$/gm, ' $1'))
  if (photoPath) parts.push(`![](../${photoPath})${camera ? `\n*${camera}*` : ''}`)
  const block = parts.join('\n\n')

  mkdirSync(join(root, 'stream'), { recursive: true })
  const existing = existsSync(file) ? blocks(readFileSync(file, 'utf8')) : []
  const all = [...existing, block]
  // Stable sort on the "## HH:MM" heading keeps same-minute entries in arrival order.
  all.sort((x, y) => x.slice(3, 8).localeCompare(y.slice(3, 8)))
  write(file, all)
  return path
}

/** Removes the newest entry (last block of the newest day file). */
export function undoLast(root: string): { path: string; removedMedia?: string } | null {
  const dir = join(root, 'stream')
  if (!existsSync(dir)) return null
  const day = readdirSync(dir)
    .filter((n) => /^\d{4}-\d{2}-\d{2}\.md$/.test(n))
    .sort()
    .at(-1)
  if (!day) return null
  const path = `stream/${day}`
  const file = join(root, path)
  const bs = blocks(readFileSync(file, 'utf8'))
  const last = bs.pop()
  const media = last ? MEDIA.exec(last)?.[1] : undefined
  if (bs.length) write(file, bs)
  else rmSync(file)
  return media ? { path, removedMedia: media } : { path }
}
