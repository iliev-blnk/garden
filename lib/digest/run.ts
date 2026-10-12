import { execFile } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { basename, join } from 'node:path'
import { promisify } from 'node:util'
import { type ApplyResult, applyEdits, noteIndex } from '../content/apply.ts'
import { type Edit, parseNote, splitFrontmatter } from '../content/note.ts'
import type { commitAndPush } from '../git.ts'
import type { notify } from '../notify.ts'
import type { Runner } from './claude.ts'
import { buildPayload, type DigestEdit, parseEdits, RULES } from './prompt.ts'
import { type DigestState, loadState, saveState } from './state.ts'
import { condense, findChanged, isWorkSession, readTranscript } from './transcripts.ts'

const run = promisify(execFile)

export type DigestOptions = {
  root: string
  projectsDir: string
  stateFile: string
  skipDirs: string[]
  workDirs: string[]
  denylist: string[]
  runner: Runner
  build: () => Promise<void>
  push: typeof commitAndPush
  notify: typeof notify
  now?: Date
  dryRun?: boolean
  fullTextBudget?: number
  /** At most this many changed chats per run (backfill batches). */
  limit?: number
  /** Transcripts to leave alone in this run (backfill: ones that already failed). */
  exclude?: Set<string>
  log?: (line: string) => void
}

export const FULL_TEXT_BUDGET = 120_000

export function localDate(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Chisinau' }).format(now)
}

/** Notes shown in full, most recently tended first, until the character budget runs out. */
export function fullTextNotes(root: string, budget = FULL_TEXT_BUDGET): { slug: string; text: string }[] {
  const dir = join(root, 'notes')
  if (!existsSync(dir)) return []
  const notes = readdirSync(dir)
    .filter((n) => n.endsWith('.md'))
    .map((n) => {
      const text = readFileSync(join(dir, n), 'utf8')
      return { slug: n.slice(0, -3), text, tended: parseNote(text).meta.tended }
    })
    .sort((a, b) => b.tended.localeCompare(a.tended))
  const out: { slug: string; text: string }[] = []
  let used = 0
  for (const n of notes) {
    if (used + n.text.length > budget) continue
    used += n.text.length
    out.push({ slug: n.slug, text: n.text })
  }
  return out
}

/** Turns appends into whole-file edits and refuses rewrites of notes Claude never saw in full. */
function resolveEdits(root: string, edits: DigestEdit[], shown: Set<string>, today: string) {
  const ready: Edit[] = []
  const skipped: ApplyResult['skipped'] = []
  for (const e of edits) {
    const target = join(root, e.path)
    const slug = basename(e.path, '.md')
    if ('content' in e) {
      if (e.path.startsWith('notes/') && existsSync(target) && !shown.has(slug)) {
        skipped.push({ path: e.path, reason: 'unseen' })
      } else ready.push(e)
      continue
    }
    if (!existsSync(target)) {
      skipped.push({ path: e.path, reason: 'missing' })
      continue
    }
    const old = readFileSync(target, 'utf8')
    const parts = splitFrontmatter(old)
    if (!parts) {
      skipped.push({ path: e.path, reason: 'frontmatter' })
      continue
    }
    const yaml = parts.yaml.replace(/^tended:.*$/m, `tended: ${today}`)
    ready.push({
      path: e.path,
      content: `---\n${yaml}\n---\n${parts.body.trimEnd()}\n\n${e.append.trim()}\n`,
    })
  }
  return { ready, skipped }
}

async function restore(root: string, paths: string[]) {
  for (const p of paths) {
    try {
      await run('git', ['cat-file', '-e', `HEAD:${p}`], { cwd: root })
      await run('git', ['checkout', 'HEAD', '--', p], { cwd: root })
    } catch {
      rmSync(join(root, p), { force: true })
    }
  }
}

/** One thing to digest: a chat (or the new part of one) or a memory file. */
export type Source = { key: string; label: string; chunks: string[]; end: number; work: boolean }
export type DigestResult = {
  notes: number
  skipped: number
  sources: number
  failed: string[]
  keys: string[]
}

export async function digest(o: DigestOptions): Promise<DigestResult> {
  if (!o.workDirs.length)
    throw new Error('GARDEN_WORK_DIRS is not set; refusing to digest without a work filter')
  const changed = findChanged(o.projectsDir, loadState(o.stateFile), o.skipDirs)
    .filter((c) => !o.exclude?.has(c.path))
    .slice(0, o.limit ?? Number.POSITIVE_INFINITY)
  const sources = changed.map((c): Source => {
    const { entries, end } = readTranscript(c.path, c.from)
    const work = isWorkSession(entries, o.workDirs)
    return { key: c.path, label: basename(c.path), chunks: work ? [] : condense(entries), end, work }
  })
  return processSources(o, sources)
}

/** Ask Claude about each source, apply, build, push; only then remember the sources as digested. */
export async function processSources(o: DigestOptions, sources: Source[]): Promise<DigestResult> {
  const log = o.log ?? ((line: string) => process.stdout.write(`${line}\n`))
  const today = localDate(o.now ?? new Date())
  const done: Record<string, number> = {}
  const failed: string[] = []
  const applied = new Set<string>()
  const skipped: ApplyResult['skipped'] = []
  const problems: string[] = []
  const streamFile = join(o.root, 'stream', `${today}.md`)

  for (const source of sources) {
    let ok = true
    for (const chunk of source.work ? [] : source.chunks) {
      const fullText = fullTextNotes(o.root, o.fullTextBudget)
      const payload = buildPayload({
        chunk,
        index: noteIndex(o.root),
        fullText,
        stream: existsSync(streamFile) ? readFileSync(streamFile, 'utf8') : '',
        today,
      })
      let edits: DigestEdit[]
      try {
        edits = parseEdits(await o.runner(RULES, payload))
      } catch (err) {
        problems.push(`${source.label}: ${(err as Error).message}`)
        ok = false
        break
      }
      if (o.dryRun) {
        for (const e of edits) log(`--- ${e.path}\n${'content' in e ? e.content : `(append)\n${e.append}`}`)
        continue
      }
      const resolved = resolveEdits(o.root, edits, new Set(fullText.map((n) => n.slug)), today)
      const result = applyEdits(o.root, resolved.ready, o.denylist)
      for (const p of result.applied) applied.add(p)
      skipped.push(...resolved.skipped, ...result.skipped)
    }
    if (ok) done[source.key] = source.end
    else failed.push(source.key)
  }

  const summary = {
    skipped: skipped.length,
    sources: sources.length,
    failed,
    keys: sources.map((s) => s.key),
  }
  if (o.dryRun) return { notes: 0, ...summary, skipped: 0 }

  const paths = [...applied]
  if (paths.length) {
    try {
      await o.build()
    } catch (err) {
      await restore(o.root, paths)
      await o.notify(`garden: digest build failed, nothing published: ${(err as Error).message}`)
      throw err
    }
    try {
      await o.push(o.root, paths, `Digest ${today}: ${paths.length} notes`)
    } catch (err) {
      await o.notify(`garden: digest push failed: ${(err as Error).message}`)
      throw err
    }
  }

  const state: DigestState = loadState(o.stateFile)
  for (const [key, end] of Object.entries(done)) state[key] = { size: end, digestedAt: today }
  saveState(o.stateFile, state)

  const lines = [
    ...skipped.map((s) => `skipped ${s.path} (${s.reason})`),
    ...problems.map((p) => `failed ${p}`),
  ]
  if (lines.length) await o.notify(`garden: ${lines.join('\n')}`)
  return { notes: paths.length, ...summary }
}
