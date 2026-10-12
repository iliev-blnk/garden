import { existsSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { buildPayload, parseEdits, RULES } from '../lib/digest/prompt.ts'
import { type DigestOptions, digest } from '../lib/digest/run.ts'
import { loadState } from '../lib/digest/state.ts'
import { commitAndPush } from '../lib/git.ts'
import { notify } from '../lib/notify.ts'
import { claudeLine, userLine, writeChat } from './helpers/chats.ts'
import { git, remoteAndClone } from './helpers/git.ts'

const note = (title: string, body = 'I am building this.') =>
  `---\ntitle: ${title}\ntopics: [projects]\nstage: seedling\nplanted: 2026-10-12\ntended: 2026-10-12\nsummary: ${title} in one line.\n---\n\n${body}\n`
const envelope = (result: string) => JSON.stringify({ type: 'result', is_error: false, result })
const edits = (...e: { path: string; content: string }[]) => envelope(JSON.stringify({ edits: e }))

function setup(runnerOutputs: string[]) {
  const { remote, clone } = remoteAndClone()
  const projects = mkdtempSync(join(tmpdir(), 'projects-'))
  const stateFile = join(mkdtempSync(join(tmpdir(), 'state-')), 'digest.json')
  const outputs = [...runnerOutputs]
  const runner = vi.fn(async () => outputs.shift() ?? edits())
  const notifyFn = vi.fn(async (_: string) => {})
  const build = vi.fn(async () => {})
  const log = vi.fn((_: string) => {})
  const opts: DigestOptions = {
    root: clone,
    projectsDir: projects,
    stateFile,
    skipDirs: [],
    workDirs: ['/home/me/work'],
    denylist: [],
    runner,
    build,
    push: commitAndPush,
    notify: notifyFn,
    now: new Date('2026-10-12T19:00:00Z'),
    log,
  }
  return { remote, clone, projects, stateFile, runner, notifyFn, build, log, opts }
}

describe('digest', () => {
  it('applies the edits, pushes one commit and saves where it read up to', async () => {
    const s = setup([
      edits(
        { path: 'notes/hoodie.md', content: note('hoodie') },
        { path: 'notes/pins.md', content: note('pins') },
      ),
    ])
    const chat = writeChat(s.projects, 'a', [
      userLine('lets design the hoodie'),
      claudeLine('Three directions.'),
    ])
    const res = await digest(s.opts)
    expect(res).toEqual({ notes: 2, skipped: 0 })
    expect(git(s.remote, 'log', '--format=%s', '-1', 'main')).toBe('Digest 2026-10-12: 2 notes')
    expect(git(s.remote, 'ls-tree', '--name-only', '-r', 'main')).toContain('notes/hoodie.md')
    expect(loadState(s.stateFile)[chat].size).toBe(readFileSync(chat).length)
    expect(s.notifyFn).not.toHaveBeenCalled()
  })

  it('gives Claude the rules, the note index and the condensed chat', async () => {
    const s = setup([edits()])
    writeChat(s.projects, 'a', [userLine('an idea about bread'), claudeLine('Nice.')])
    await digest(s.opts)
    const [system, payload] = s.runner.mock.calls[0] as unknown as [string, string]
    expect(system).toBe(RULES)
    expect(payload).toContain('User: an idea about bread')
    expect(payload).toContain('Today: 2026-10-12')
  })

  it('never sends a work session to Claude, but marks it digested', async () => {
    const s = setup([])
    const chat = writeChat(s.projects, 'w', [
      userLine('fix the bug', '/home/me/work/portal'),
      claudeLine('ok', '/home/me/work/portal'),
    ])
    await digest(s.opts)
    expect(s.runner).not.toHaveBeenCalled()
    expect(loadState(s.stateFile)[chat]).toBeDefined()
  })

  it('refuses to run without work directories configured', async () => {
    const s = setup([])
    await expect(digest({ ...s.opts, workDirs: [] })).rejects.toThrow(/GARDEN_WORK_DIRS/)
  })

  it.each([
    ['prose', envelope('Sure! Here are the notes')],
    ['truncated JSON', envelope('{"edits":')],
    ['an object without edits', envelope('{}')],
    ['an error envelope', JSON.stringify({ type: 'result', is_error: true, result: 'overloaded' })],
  ])('treats %s as a failed chunk: chat not marked, one ping', async (_, out) => {
    const s = setup([out])
    const chat = writeChat(s.projects, 'a', [userLine('hello')])
    await digest(s.opts)
    expect(loadState(s.stateFile)[chat]).toBeUndefined()
    expect(s.notifyFn).toHaveBeenCalledTimes(1)
    expect(s.notifyFn.mock.calls[0][0]).toMatch(/^garden: /)
  })

  it('accepts JSON wrapped in a code fence', async () => {
    const s = setup([
      envelope(
        `\`\`\`json\n${JSON.stringify({ edits: [{ path: 'notes/x.md', content: note('x') }] })}\n\`\`\``,
      ),
    ])
    writeChat(s.projects, 'a', [userLine('hello')])
    expect((await digest(s.opts)).notes).toBe(1)
  })

  it('reports skipped edits in one ping and still publishes the rest', async () => {
    const email = ['a', 'b.co'].join('@')
    const s = setup([
      edits(
        { path: 'notes/leak.md', content: note('leak', `mail ${email}`) },
        { path: 'notes/ok.md', content: note('ok') },
      ),
    ])
    const chat = writeChat(s.projects, 'a', [userLine('hello')])
    const res = await digest(s.opts)
    expect(res).toEqual({ notes: 1, skipped: 1 })
    expect(s.notifyFn).toHaveBeenCalledTimes(1)
    expect(s.notifyFn.mock.calls[0][0]).toContain('skipped notes/leak.md (scan:email)')
    expect(s.notifyFn.mock.calls[0][0]).not.toContain(email)
    expect(loadState(s.stateFile)[chat]).toBeDefined()
  })

  it('pushes nothing, keeps the state and restores the files when the build fails', async () => {
    const s = setup([edits({ path: 'notes/x.md', content: note('x') })])
    const chat = writeChat(s.projects, 'a', [userLine('hello')])
    s.build.mockRejectedValueOnce(new Error('broken wikilink'))
    await expect(digest(s.opts)).rejects.toThrow('broken wikilink')
    expect(git(s.remote, 'log', '--format=%s', '-1', 'main')).toBe('init')
    expect(loadState(s.stateFile)[chat]).toBeUndefined()
    expect(existsSync(join(s.clone, 'notes/x.md'))).toBe(false)
    expect(s.notifyFn).toHaveBeenCalledWith(expect.stringContaining('broken wikilink'))
  })

  it('does not build or push when nothing applied', async () => {
    const s = setup([edits()])
    const chat = writeChat(s.projects, 'a', [userLine('hello')])
    await digest(s.opts)
    expect(s.build).not.toHaveBeenCalled()
    expect(loadState(s.stateFile)[chat]).toBeDefined()
  })

  it('lets a later chunk see notes an earlier chat created', async () => {
    const s = setup([edits({ path: 'notes/first.md', content: note('first') }), edits()])
    writeChat(s.projects, 'a', [userLine('one')])
    writeChat(s.projects, 'b', [userLine('two')])
    await digest(s.opts)
    expect((s.runner.mock.calls[1] as unknown as [string, string])[1]).toContain('first — first')
  })

  it('appends to a note it was only shown in the index, keeping the old body and bumping tended', async () => {
    const s = setup([
      edits({ path: 'notes/old.md', content: note('old', 'Original thinking.') }),
      envelope(JSON.stringify({ edits: [{ path: 'notes/old.md', append: 'A new thought from today.' }] })),
    ])
    writeChat(s.projects, 'a', [userLine('one')])
    await digest(s.opts)
    writeChat(s.projects, 'b', [userLine('two')])
    await digest({ ...s.opts, now: new Date('2026-10-14T19:00:00Z') })
    const text = readFileSync(join(s.clone, 'notes/old.md'), 'utf8')
    expect(text).toContain('Original thinking.')
    expect(text).toContain('A new thought from today.')
    expect(text).toContain('tended: 2026-10-14')
  })

  it('shows the full text of notes within the budget', async () => {
    const s = setup([
      edits({ path: 'notes/first.md', content: note('first', 'Body of the first note.') }),
      edits(),
    ])
    writeChat(s.projects, 'a', [userLine('one')])
    writeChat(s.projects, 'b', [userLine('two')])
    await digest(s.opts)
    expect((s.runner.mock.calls[1] as unknown as [string, string])[1]).toContain('Body of the first note.')
  })

  it('refuses to rewrite a note it was not shown in full', async () => {
    const big = 'x'.repeat(200)
    const s = setup([
      edits({ path: 'notes/a.md', content: note('a', big) }),
      edits({ path: 'notes/a.md', content: note('a', 'y'.repeat(200)) }),
    ])
    writeChat(s.projects, 'one', [userLine('one')])
    await digest(s.opts)
    writeChat(s.projects, 'two', [userLine('two')])
    const res = await digest({ ...s.opts, fullTextBudget: 10 })
    expect(res.skipped).toBe(1)
    expect(s.notifyFn.mock.calls.at(-1)?.[0]).toContain('skipped notes/a.md (unseen)')
    expect(readFileSync(join(s.clone, 'notes/a.md'), 'utf8')).toContain(big)
  })

  it('in dry-run mode logs the edits and writes nothing', async () => {
    const s = setup([edits({ path: 'notes/x.md', content: note('x') })])
    writeChat(s.projects, 'a', [userLine('hello')])
    await digest({ ...s.opts, dryRun: true })
    expect(s.log.mock.calls.map((c) => c[0]).join('\n')).toContain('notes/x.md')
    expect(existsSync(join(s.clone, 'notes/x.md'))).toBe(false)
    expect(existsSync(s.stateFile)).toBe(false)
    expect(s.build).not.toHaveBeenCalled()
  })
})

describe('parseEdits', () => {
  it('reads edits from the result envelope', () => {
    expect(parseEdits(edits({ path: 'notes/a.md', content: 'x' }))).toEqual([
      { path: 'notes/a.md', content: 'x' },
    ])
  })
  it('accepts append edits', () => {
    expect(parseEdits(envelope('{"edits":[{"path":"notes/a.md","append":"more"}]}'))).toEqual([
      { path: 'notes/a.md', append: 'more' },
    ])
  })
  it('rejects edits with the wrong shape', () => {
    expect(() => parseEdits(envelope('{"edits":[{"path":1}]}'))).toThrow()
  })
})

describe('buildPayload', () => {
  it('lists the note index, today and the stream before the chat', () => {
    const p = buildPayload({
      chunk: 'User: hi',
      index: [{ slug: 'a', title: 'A', topics: ['ideas'], summary: 'S' }],
      fullText: [],
      stream: '## 09:00\n\nthought',
      today: '2026-10-12',
    })
    expect(p.indexOf('Today: 2026-10-12')).toBeLessThan(p.indexOf('a — A [ideas]: S'))
    expect(p.indexOf('thought')).toBeLessThan(p.indexOf('User: hi'))
  })
})

describe('notify', () => {
  it('posts to the bot when configured', async () => {
    const fetchFn = vi.fn(async () => new Response('{}'))
    await notify('hello', { GARDEN_BOT_TOKEN: 't', GARDEN_CHAT_ID: '42' }, fetchFn)
    expect(fetchFn).toHaveBeenCalledWith(
      'https://api.telegram.org/bott/sendMessage',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(JSON.parse((fetchFn.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)).toEqual(
      { chat_id: '42', text: 'hello' },
    )
  })
  it('does nothing without a token', async () => {
    const fetchFn = vi.fn()
    await notify('hello', {}, fetchFn)
    expect(fetchFn).not.toHaveBeenCalled()
  })
})
