import { closeSync, existsSync, openSync, readdirSync, readSync, statSync } from 'node:fs'
import { join, sep } from 'node:path'
import type { DigestState } from './state.ts'

type Block = { type: string; text?: string }
export type Entry = {
  type: string
  cwd?: string
  isMeta?: boolean
  isSidechain?: boolean
  message?: { content: string | Block[] }
}

export const CHUNK_LIMIT = 240_000

export function findChanged(
  projectsDir: string,
  state: DigestState,
  skipDirs: string[],
): { path: string; from: number }[] {
  if (!existsSync(projectsDir)) return []
  const skip = new Set(skipDirs)
  const found: { path: string; from: number; mtime: number }[] = []
  for (const dir of readdirSync(projectsDir)) {
    const full = join(projectsDir, dir)
    if (skip.has(full) || !statSync(full).isDirectory()) continue
    for (const name of readdirSync(full)) {
      if (!name.endsWith('.jsonl')) continue
      const path = join(full, name)
      const { size, mtimeMs } = statSync(path)
      const done = state[path]?.size ?? 0
      if (size === done) continue
      found.push({ path, from: size > done ? done : 0, mtime: mtimeMs })
    }
  }
  return found.sort((a, b) => a.mtime - b.mtime).map(({ path, from }) => ({ path, from }))
}

/** Reads complete lines from byte `from`; `end` is the offset just past the last complete line. */
export function readTranscript(path: string, from: number): { entries: Entry[]; end: number } {
  const size = statSync(path).size
  const buf = Buffer.alloc(Math.max(0, size - from))
  const fd = openSync(path, 'r')
  try {
    readSync(fd, buf, 0, buf.length, from)
  } finally {
    closeSync(fd)
  }
  const lastNewline = buf.lastIndexOf(0x0a)
  if (lastNewline === -1) return { entries: [], end: from }
  const entries: Entry[] = []
  for (const line of buf.subarray(0, lastNewline).toString('utf8').split('\n')) {
    if (!line.trim()) continue
    try {
      entries.push(JSON.parse(line))
    } catch {
      // a corrupt line is skipped, not fatal
    }
  }
  return { entries, end: from + lastNewline + 1 }
}

const under = (cwd: string, dir: string) => cwd === dir || cwd.startsWith(dir.endsWith(sep) ? dir : dir + sep)

export function isWorkSession(entries: Entry[], workDirs: string[]): boolean {
  const cwds = entries.map((e) => e.cwd).filter((c): c is string => typeof c === 'string')
  if (!cwds.length || !workDirs.length) return false
  const work = cwds.filter((c) => workDirs.some((d) => under(c, d))).length
  return work > cwds.length / 2
}

const HIDDEN_TAGS = /<(system-reminder|command-[\w-]+|local-command-[\w-]+)>[\s\S]*?<\/\1>/g
const DROP_PREFIXES = [
  'Base directory for this skill:',
  'This session is being continued from a previous conversation',
  '[Request interrupted by user',
]

function userText(content: string | Block[]): string {
  const raw =
    typeof content === 'string'
      ? content
      : content
          .filter((b) => b.type === 'text')
          .map((b) => b.text ?? '')
          .join('\n')
  const text = raw.replace(HIDDEN_TAGS, '').trim()
  return DROP_PREFIXES.some((p) => text.startsWith(p)) ? '' : text
}

function claudeText(content: string | Block[]): string {
  if (typeof content === 'string') return content.trim()
  return content
    .filter((b) => b.type === 'text')
    .map((b) => b.text ?? '')
    .join('\n')
    .trim()
}

export function condense(entries: Entry[]): string[] {
  const messages: string[] = []
  for (const e of entries) {
    if (e.isMeta || e.isSidechain || !e.message) continue
    if (e.type === 'user') {
      const t = userText(e.message.content)
      if (t) messages.push(`User: ${t}`)
    } else if (e.type === 'assistant') {
      const t = claudeText(e.message.content)
      if (t) messages.push(`Claude: ${t}`)
    }
  }
  const chunks: string[] = []
  let current = ''
  for (let m of messages) {
    while (m.length > CHUNK_LIMIT) {
      if (current) chunks.push(current)
      current = ''
      chunks.push(m.slice(0, CHUNK_LIMIT))
      m = m.slice(CHUNK_LIMIT)
    }
    if (current && current.length + 2 + m.length > CHUNK_LIMIT) {
      chunks.push(current)
      current = m
    } else current = current ? `${current}\n\n${m}` : m
  }
  if (current) chunks.push(current)
  return chunks
}
