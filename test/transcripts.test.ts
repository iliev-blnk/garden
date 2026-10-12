import { appendFileSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { loadState, saveState } from '../lib/digest/state.ts'
import { condense, findChanged, isWorkSession, readTranscript } from '../lib/digest/transcripts.ts'

const WORK = ['/home/me/work']
const user = (content: unknown, extra: Record<string, unknown> = {}) =>
  JSON.stringify({ type: 'user', cwd: '/home/me', message: { role: 'user', content }, ...extra })
const claude = (content: unknown[], extra: Record<string, unknown> = {}) =>
  JSON.stringify({ type: 'assistant', cwd: '/home/me', message: { role: 'assistant', content }, ...extra })

const sideChat = [
  JSON.stringify({ type: 'mode', mode: 'normal' }),
  user('lets build the hoodie <system-reminder>secret context</system-reminder>'),
  claude([{ type: 'thinking', thinking: 'private reasoning' }]),
  claude([{ type: 'tool_use', name: 'Bash', input: { command: 'ls' } }]),
  user([{ type: 'tool_result', content: 'tool output here' }]),
  claude([{ type: 'text', text: 'Here are three directions.' }]),
  user('<command-name>/clear</command-name>'),
  user('Base directory for this skill: /x\n# Skill'),
  user('This session is being continued from a previous conversation that ran out of context.'),
  user('meta line', { isMeta: true }),
  user('subagent prompt', { isSidechain: true }),
  user([{ type: 'text', text: 'pick B' }]),
  JSON.stringify({ type: 'attachment', attachment: { content: 'attached' } }),
].join('\n')

const workChat = [
  user('fix the ticket', { cwd: '/home/me/work/portal' }),
  claude([{ type: 'text', text: 'done' }], { cwd: '/home/me/work/portal' }),
  user('thanks', { cwd: '/home/me' }),
].join('\n')

function file(dir: string, name: string, text: string) {
  const p = join(dir, name)
  writeFileSync(p, `${text}\n`)
  return p
}

describe('condense', () => {
  it('keeps the user and Claude text in order and nothing else', () => {
    const dir = mkdtempSync(join(tmpdir(), 'tx-'))
    const p = file(dir, 'a.jsonl', sideChat)
    const { entries } = readTranscript(p, 0)
    const [chunk, ...rest] = condense(entries)
    expect(rest).toEqual([])
    expect(chunk).toBe('User: lets build the hoodie\n\nClaude: Here are three directions.\n\nUser: pick B')
    for (const hidden of [
      'secret context',
      'private reasoning',
      'tool output',
      'ls',
      'clear',
      'Skill',
      'continued',
      'meta line',
      'subagent',
      'attached',
    ]) {
      expect(chunk).not.toContain(hidden)
    }
  })

  it('splits long chats at message boundaries into chunks of at most 240,000 characters', () => {
    const big = Array.from({ length: 6 }, (_, i) => user(`${i}`.repeat(100_000))).join('\n')
    const dir = mkdtempSync(join(tmpdir(), 'tx-'))
    const chunks = condense(readTranscript(file(dir, 'big.jsonl', big), 0).entries)
    expect(chunks.length).toBe(3)
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(240_000)
    expect(chunks.join('\n\n')).toContain('5'.repeat(100_000))
  })
})

describe('isWorkSession', () => {
  it('is true when most entries ran under a work directory', () => {
    const dir = mkdtempSync(join(tmpdir(), 'tx-'))
    expect(isWorkSession(readTranscript(file(dir, 'w.jsonl', workChat), 0).entries, WORK)).toBe(true)
  })
  it('is false for a side-project chat', () => {
    const dir = mkdtempSync(join(tmpdir(), 'tx-'))
    expect(isWorkSession(readTranscript(file(dir, 's.jsonl', sideChat), 0).entries, WORK)).toBe(false)
  })
  it('does not match a sibling directory that only shares the prefix', () => {
    const dir = mkdtempSync(join(tmpdir(), 'tx-'))
    const chat = [user('x', { cwd: '/home/me/workshop' }), user('y', { cwd: '/home/me/workshop' })].join('\n')
    expect(isWorkSession(readTranscript(file(dir, 'x.jsonl', chat), 0).entries, WORK)).toBe(false)
  })
})

describe('readTranscript', () => {
  it('stops at the last complete line and reports where it stopped', () => {
    const dir = mkdtempSync(join(tmpdir(), 'tx-'))
    const first = user('first')
    const p = join(dir, 'g.jsonl')
    writeFileSync(p, `${first}\n${user('second').slice(0, 20)}`)
    const read = readTranscript(p, 0)
    expect(read.entries.length).toBe(1)
    expect(read.end).toBe(Buffer.byteLength(`${first}\n`))
  })

  it('picks up the rest from where the last read ended', () => {
    const dir = mkdtempSync(join(tmpdir(), 'tx-'))
    const p = join(dir, 'g.jsonl')
    const second = user('second — ünïcode')
    writeFileSync(p, `${user('first')}\n${second.slice(0, 20)}`)
    const { end } = readTranscript(p, 0)
    writeFileSync(p, `${user('first')}\n${second}\n`)
    const next = readTranscript(p, end)
    expect(condense(next.entries)).toEqual(['User: second — ünïcode'])
  })
})

describe('findChanged and state', () => {
  it('returns new and grown transcripts with the offset to read from, and skips listed directories', () => {
    const projects = mkdtempSync(join(tmpdir(), 'projects-'))
    mkdirSync(join(projects, '-home-me'))
    mkdirSync(join(projects, '-home-me-DEV-garden'))
    mkdirSync(join(projects, '-home-me', 'sub'))
    const a = file(join(projects, '-home-me'), 'a.jsonl', user('a'))
    file(join(projects, '-home-me-DEV-garden'), 'own.jsonl', user('digest run'))
    file(join(projects, '-home-me', 'sub'), 'nested.jsonl', user('subagent'))
    const skip = [join(projects, '-home-me-DEV-garden')]

    expect(findChanged(projects, {}, skip)).toEqual([{ path: a, from: 0 }])

    const end = readTranscript(a, 0).end
    const state = { [a]: { size: end, digestedAt: '2026-10-12' } }
    expect(findChanged(projects, state, skip)).toEqual([])

    appendFileSync(a, `${user('more')}\n`)
    expect(findChanged(projects, state, skip)).toEqual([{ path: a, from: end }])
  })

  it('saves and loads state, starting empty', () => {
    const f = join(mkdtempSync(join(tmpdir(), 'st-')), 'nested', 'digest.json')
    expect(loadState(f)).toEqual({})
    saveState(f, { x: { size: 3, digestedAt: '2026-10-12' } })
    expect(loadState(f)).toEqual({ x: { size: 3, digestedAt: '2026-10-12' } })
  })
})
