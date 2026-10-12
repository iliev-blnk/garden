import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { scanText } from '../scan/scanner.ts'
import { type Edit, parseNote, splitFrontmatter, type Topic } from './note.ts'

export type ApplyResult = { applied: string[]; skipped: { path: string; reason: string }[] }

const NOTE_PATH = /^notes\/[a-z0-9]+(?:-[a-z0-9]+)*\.md$/
const STREAM_PATH = /^stream\/\d{4}-\d{2}-\d{2}\.md$/
const SHRINK_LIMIT = 0.5

const bodyOf = (text: string) => splitFrontmatter(text)?.body ?? text

function reasonToSkip(root: string, edit: Edit, denylist: string[]): string | null {
  const isNote = NOTE_PATH.test(edit.path)
  if (!isNote && !STREAM_PATH.test(edit.path)) return 'path'
  if (isNote) {
    try {
      parseNote(edit.content)
    } catch {
      return 'frontmatter'
    }
  }
  const [finding] = scanText(edit.content, denylist)
  if (finding) return `scan:${finding.kind}`
  const target = join(root, edit.path)
  if (existsSync(target)) {
    const before = bodyOf(readFileSync(target, 'utf8')).trim().length
    const after = bodyOf(edit.content).trim().length
    if (after < before * SHRINK_LIMIT) return 'shrink'
  }
  return null
}

/** Create-or-replace only, inside notes/ and stream/; each edit stands or falls on its own. */
export function applyEdits(root: string, edits: Edit[], denylist: string[]): ApplyResult {
  const result: ApplyResult = { applied: [], skipped: [] }
  for (const edit of edits) {
    const reason = reasonToSkip(root, edit, denylist)
    if (reason) {
      result.skipped.push({ path: edit.path, reason })
      continue
    }
    const target = join(root, edit.path)
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, edit.content)
    result.applied.push(edit.path)
  }
  return result
}

export function noteIndex(root: string): { slug: string; title: string; topics: Topic[]; summary: string }[] {
  const dir = join(root, 'notes')
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((n) => n.endsWith('.md'))
    .sort()
    .map((n) => {
      const { meta } = parseNote(readFileSync(join(dir, n), 'utf8'))
      return { slug: n.slice(0, -3), title: meta.title, topics: meta.topics, summary: meta.summary }
    })
}
