import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

export const DENYLIST_FILE = join(homedir(), '.config/garden/denylist.txt')

function terms(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((t) => t.trim())
    .filter((t) => t && !t.startsWith('#'))
}

export function loadDenylist(
  env: Record<string, string | undefined> = process.env,
  file = DENYLIST_FILE,
): string[] {
  if (env.GARDEN_DENYLIST) return terms(env.GARDEN_DENYLIST)
  if (env.CI) throw new Error('GARDEN_DENYLIST is empty; refusing to scan in CI without it')
  if (existsSync(file)) return terms(readFileSync(file, 'utf8'))
  process.stderr.write(
    'garden: no denylist (GARDEN_DENYLIST or ~/.config/garden/denylist.txt); scanning without it\n',
  )
  return []
}
