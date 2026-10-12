import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { commitAndPush } from '../lib/git.ts'
import type { TgUpdate } from '../lib/telegram/parse.ts'
import { type TgApi, telegramRun } from '../lib/telegram/run.ts'
import { git, remoteAndClone } from './helpers/git.ts'
import { jpeg } from './helpers/images.ts'

const CHAT = '4242'
const SITE = 'https://example.github.io/garden/'
let id = 100
const update = (m: Record<string, unknown>): TgUpdate =>
  ({ update_id: ++id, message: { message_id: id, date: 1791000000, chat: { id: 4242 }, ...m } }) as TgUpdate

function fakeApi(updates: TgUpdate[], files: Record<string, Buffer> = {}) {
  const sent: string[] = []
  const offsets: number[] = []
  const api: TgApi = {
    getUpdates: vi.fn(async (offset: number) => {
      offsets.push(offset)
      return updates.filter((u) => u.update_id >= offset)
    }),
    getFile: vi.fn(async (fileId: string) => files[fileId]),
    send: vi.fn(async (text: string) => {
      sent.push(text)
    }),
  }
  return { api, sent, offsets }
}

const run = (clone: string, api: TgApi, push = commitAndPush) =>
  telegramRun({ root: clone, api, chatId: CHAT, denylist: [], push, siteUrl: SITE })

describe('telegramRun', () => {
  it('plants texts and a photo in one commit and replies after the push', async () => {
    const { remote, clone } = remoteAndClone()
    const u = [
      update({ text: 'first' }),
      update({ text: '#idea second' }),
      update({ photo: [{ file_id: 'p', width: 9, height: 9 }], caption: 'fog' }),
    ]
    const { api, sent } = fakeApi(u, { p: await jpeg({ gps: true, width: 3000, height: 2000 }) })
    expect(await run(clone, api)).toEqual({ planted: 3, refused: 0, undone: 0 })
    expect(git(remote, 'log', '--format=%s', '-1', 'main')).toBe('Telegram: 3 entries')
    const files = git(remote, 'ls-tree', '-r', '--name-only', 'main').split('\n')
    expect(files).toContain('.garden/telegram.json')
    expect(files.some((f) => /^media\/\d{4}\/\d+\.webp$/.test(f))).toBe(true)
    expect(files.some((f) => /^stream\/\d{4}-\d{2}-\d{2}\.md$/.test(f))).toBe(true)
    expect(sent).toEqual([
      `🌱 planted ${SITE}stream/`,
      `🌱 planted ${SITE}stream/`,
      `🌱 planted ${SITE}stream/`,
    ])
  })

  it('asks Telegram for updates after the stored offset next time', async () => {
    const { clone } = remoteAndClone()
    const u = [update({ text: 'one' })]
    const { api, offsets } = fakeApi(u)
    await run(clone, api)
    await run(clone, api)
    expect(offsets).toEqual([0, u[0].update_id + 1])
  })

  it('refuses a message the scanner flags and tells the user why', async () => {
    const { clone } = remoteAndClone()
    const { api, sent } = fakeApi([update({ text: `call me on ${'+373'} 69 123 456` })])
    expect(await run(clone, api)).toEqual({ planted: 0, refused: 1, undone: 0 })
    expect(sent).toEqual(['not published: looks like a phone number'])
    expect(existsSync(join(clone, 'stream'))).toBe(false)
  })

  it('sends no replies and leaves the remote offset alone when the push fails', async () => {
    const { remote, clone } = remoteAndClone()
    const { api, sent } = fakeApi([update({ text: 'hello' })])
    const push = vi.fn(async () => {
      throw new Error('network down')
    })
    await expect(run(clone, api, push)).rejects.toThrow('network down')
    expect(sent).toEqual([])
    expect(git(remote, 'ls-tree', '-r', '--name-only', 'main')).not.toContain('.garden/telegram.json')
  })

  it('replies to a sticker and moves past it', async () => {
    const { clone } = remoteAndClone()
    const sticker = update({ sticker: { file_id: 's' } })
    const { api, sent } = fakeApi([sticker])
    await run(clone, api)
    expect(sent).toEqual(['only text, links and photos'])
    expect(JSON.parse(readFileSync(join(clone, '.garden/telegram.json'), 'utf8'))).toEqual({
      offset: sticker.update_id + 1,
    })
  })

  it('undoes the last entry and deletes its photo', async () => {
    const { remote, clone } = remoteAndClone()
    const photo = update({ photo: [{ file_id: 'p', width: 9, height: 9 }], caption: 'oops' })
    const first = fakeApi([update({ text: 'keep' }), photo], { p: await jpeg() })
    await run(clone, first.api)
    const second = fakeApi([update({ text: '/undo' })])
    expect(await run(clone, second.api)).toMatchObject({ undone: 1 })
    expect(second.sent).toEqual(['undone'])
    const files = git(remote, 'ls-tree', '-r', '--name-only', 'main')
    expect(files).not.toMatch(/media\//)
  })

  it('does nothing when there are no updates', async () => {
    const { remote, clone } = remoteAndClone()
    const { api } = fakeApi([])
    expect(await run(clone, api)).toEqual({ planted: 0, refused: 0, undone: 0 })
    expect(git(remote, 'log', '--format=%s', '-1', 'main')).toBe('init')
  })
  it('keeps going past a message it cannot use, replies, and still moves the offset', async () => {
    const { remote, clone } = remoteAndClone()
    const bad = update({ document: { file_id: 'heic', mime_type: 'image/heic' } })
    const good = update({ text: 'after the bad one' })
    const { api, sent } = fakeApi([bad, good], { heic: Buffer.from('not an image') })
    expect(await run(clone, api)).toMatchObject({ planted: 1 })
    expect(sent[0]).toMatch(/^could not use that message/)
    expect(sent[1]).toMatch(/^🌱 planted/)
    expect(git(remote, 'show', 'main:.garden/telegram.json')).toContain(String(good.update_id + 1))
  })

  it('still reports what changed when a reply fails to send', async () => {
    const { clone } = remoteAndClone()
    const { api } = fakeApi([update({ text: 'one' }), update({ text: 'two' })])
    api.send = vi.fn(async () => {
      throw new Error('429 Too Many Requests')
    })
    expect(await run(clone, api)).toEqual({ planted: 2, refused: 0, undone: 0 })
  })
})
