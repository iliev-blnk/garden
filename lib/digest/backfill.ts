import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { type DigestOptions, digest, processSources, type Source } from './run.ts'
import { loadState } from './state.ts'

export type BackfillOptions = DigestOptions & {
  memoryDir: string
  workMemory: RegExp
  batch: number
  maxChats?: number
}

const MEMORY_LABEL =
  "Claude's working notes about one of Ilie's projects. Claude wrote these, not Ilie, so rewrite in Ilie's voice; they may mention work or private details that must stay out of the garden."

/** Project memory files worth turning into notes; `workMemory` matches file names that are about paid work. */
export function memorySources(memoryDir: string, workMemory: RegExp): string[] {
  return readdirSync(memoryDir)
    .filter((n) => n.startsWith('project_') && n.endsWith('.md') && !workMemory.test(n))
    .sort()
    .map((n) => join(memoryDir, n))
}

/** Memory notes first (once), then every transcript oldest first, `batch` chats per commit. */
export async function backfill(o: BackfillOptions): Promise<void> {
  const state = loadState(o.stateFile)
  const memory: Source[] = memorySources(o.memoryDir, o.workMemory)
    .filter((path) => state[path]?.size !== statSync(path).size)
    .map((path) => ({
      key: path,
      label: path.slice(o.memoryDir.length + 1),
      chunks: [`${MEMORY_LABEL}\n\n${readFileSync(path, 'utf8')}`],
      end: statSync(path).size,
      work: false,
    }))
  if (memory.length) await processSources(o, memory)

  // Never revisit a chat in the same run: failed ones, dry-run ones and ones whose last line is cut off.
  const seen = new Set<string>()
  let left = o.maxChats ?? Number.POSITIVE_INFINITY
  while (left > 0) {
    const res = await digest({ ...o, limit: Math.min(o.batch, left), exclude: seen })
    for (const key of res.keys) seen.add(key)
    if (!res.sources) break
    left -= res.sources
  }
}
