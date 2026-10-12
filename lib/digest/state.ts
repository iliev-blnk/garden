import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

/** For each transcript, the byte offset up to which it has been digested. */
export type DigestState = Record<string, { size: number; digestedAt: string }>

export const STATE_FILE = join(homedir(), '.local/state/garden/digest.json')

export function loadState(file = STATE_FILE): DigestState {
  return existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {}
}

export function saveState(file: string, state: DigestState): void {
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, `${JSON.stringify(state, null, 2)}\n`)
}
