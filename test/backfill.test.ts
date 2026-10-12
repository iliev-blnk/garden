import { appendFileSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { backfill, memorySources } from '../lib/digest/backfill.ts'
import type { DigestOptions } from '../lib/digest/run.ts'
import { commitAndPush } from '../lib/git.ts'
import { userLine, writeChat } from './helpers/chats.ts'
import { git, remoteAndClone } from './helpers/git.ts'

const WORK_MEMORY = /widgetco|ticket_\d+/

function memoryDir() {
  const dir = mkdtempSync(join(tmpdir(), 'memory-'))
  for (const name of [
    'project_holdshort.md',
    'project_tinserv.md',
    'project_ticket_2427_weekly.md',
    'project_widgetco.md',
    'feedback_x.md',
    'reference_y.md',
    'user_profile.md',
    'MEMORY.md',
  ]) {
    writeFileSync(join(dir, name), `---\nname: ${name}\n---\n\nAbout ${name}.\n`)
  }
  return dir
}

describe('memorySources', () => {
  it('keeps project notes and drops work, feedback, reference, user and the index', () => {
    const dir = memoryDir()
    expect(memorySources(dir, WORK_MEMORY).map((p) => p.slice(dir.length + 1))).toEqual([
      'project_holdshort.md',
      'project_tinserv.md',
    ])
  })
})

let n = 0
const note = () => {
  n++
  return JSON.stringify({
    type: 'result',
    result: JSON.stringify({
      edits: [
        {
          path: `notes/n${n}.md`,
          content: `---\ntitle: n${n}\ntopics: [ideas]\nstage: seedling\nplanted: 2026-10-12\ntended: 2026-10-12\nsummary: s\n---\n\nbody\n`,
        },
      ],
    }),
  })
}

function setup(chats: number) {
  const { remote, clone } = remoteAndClone()
  const projects = mkdtempSync(join(tmpdir(), 'projects-'))
  mkdirSync(join(projects, '-home-me'))
  for (let i = 0; i < chats; i++)
    writeChat(projects, `c${String(i).padStart(2, '0')}`, [userLine(`chat ${i}`)])
  const runner = vi.fn(async () => note())
  const build = vi.fn(async () => {})
  const opts: DigestOptions & { memoryDir: string; workMemory: RegExp; batch: number } = {
    root: clone,
    projectsDir: projects,
    stateFile: join(mkdtempSync(join(tmpdir(), 'state-')), 'digest.json'),
    skipDirs: [],
    workDirs: ['/home/me/work'],
    denylist: [],
    runner,
    build,
    push: commitAndPush,
    notify: vi.fn(async () => {}),
    now: new Date('2026-10-12T19:00:00Z'),
    log: () => {},
    memoryDir: mkdtempSync(join(tmpdir(), 'memory-empty-')),
    workMemory: WORK_MEMORY,
    batch: 10,
  }
  return { remote, clone, runner, build, opts }
}

describe('backfill', () => {
  it('digests chats in batches, one commit per batch', async () => {
    const s = setup(23)
    await backfill(s.opts)
    expect(s.runner).toHaveBeenCalledTimes(23)
    expect(git(s.remote, 'log', '--format=%s', 'main').split('\n')).toHaveLength(4)
  })

  it('resumes after a crash with only the chats that were not committed', async () => {
    const s = setup(23)
    s.build.mockResolvedValueOnce().mockResolvedValueOnce().mockRejectedValueOnce(new Error('power cut'))
    await expect(backfill(s.opts)).rejects.toThrow('power cut')
    s.runner.mockClear()
    await backfill(s.opts)
    expect(s.runner).toHaveBeenCalledTimes(3)
  })

  it('digests memory notes first, once, with a label saying Claude wrote them', async () => {
    const s = setup(1)
    s.opts.memoryDir = memoryDir()
    await backfill(s.opts)
    const payloads = s.runner.mock.calls.map((c) => (c as unknown as [string, string])[1])
    expect(payloads).toHaveLength(3)
    expect(payloads[0]).toContain("Claude's working notes")
    expect(payloads[0]).toContain('About project_holdshort.md.')
    expect(payloads[2]).toContain('User: chat 0')
    s.runner.mockClear()
    await backfill(s.opts)
    expect(s.runner).not.toHaveBeenCalled()
  })
  it('stops after maxChats chats', async () => {
    const s = setup(23)
    await backfill({ ...s.opts, maxChats: 5 })
    expect(s.runner).toHaveBeenCalledTimes(5)
  })
  it('does not loop on a transcript whose last line is cut off', async () => {
    const s = setup(0)
    const path = writeChat(join(s.opts.projectsDir), 'cut', [userLine('hello')])
    appendFileSync(path, '{"type":"user","message":')
    await backfill(s.opts)
    expect(s.runner).toHaveBeenCalledTimes(1)
  }, 10_000)
})
