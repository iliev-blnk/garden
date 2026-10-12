import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join } from 'node:path'
import { scanImage } from './image.ts'
import { type Finding, scanText } from './scanner.ts'

export type PathFindings = { path: string; findings: Finding[] }

const IMAGE = new Set(['.webp', '.jpg', '.jpeg', '.png'])

export function expandPaths(paths: string[]): string[] {
  const out: string[] = []
  for (const p of paths) {
    if (!existsSync(p)) continue
    if (statSync(p).isDirectory()) out.push(...expandPaths(readdirSync(p).map((n) => join(p, n))))
    else out.push(p)
  }
  return out
}

async function scanContent(path: string, buf: Buffer, denylist: string[]): Promise<Finding[]> {
  if (IMAGE.has(extname(path).toLowerCase())) return scanImage(buf)
  return scanText(buf.toString('utf8'), denylist)
}

export async function scanPaths(paths: string[], denylist: string[]): Promise<PathFindings[]> {
  const out: PathFindings[] = []
  for (const path of paths) {
    const findings = await scanContent(path, readFileSync(path), denylist)
    if (findings.length) out.push({ path, findings })
  }
  return out
}

/** Scans the index (what is about to be committed), so an unstaged clean-up can't hide a staged leak. */
export async function scanStaged(repo: string, denylist: string[]): Promise<PathFindings[]> {
  const names = execFileSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z'], {
    cwd: repo,
  })
    .toString()
    .split('\0')
    .filter(Boolean)
  const out: PathFindings[] = []
  for (const path of names) {
    const buf = execFileSync('git', ['show', `:${path}`], { cwd: repo, maxBuffer: 64 * 1024 * 1024 })
    const findings = await scanContent(path, buf, denylist)
    if (findings.length) out.push({ path, findings })
  }
  return out
}
