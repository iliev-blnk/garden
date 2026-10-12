import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export const userLine = (text: string, cwd = '/home/me') =>
  JSON.stringify({ type: 'user', cwd, message: { role: 'user', content: text } })
export const claudeLine = (text: string, cwd = '/home/me') =>
  JSON.stringify({
    type: 'assistant',
    cwd,
    message: { role: 'assistant', content: [{ type: 'text', text }] },
  })

export function writeChat(projectsDir: string, name: string, lines: string[]): string {
  const dir = join(projectsDir, '-home-me')
  mkdirSync(dir, { recursive: true })
  const path = join(dir, `${name}.jsonl`)
  writeFileSync(path, `${lines.join('\n')}\n`)
  return path
}
