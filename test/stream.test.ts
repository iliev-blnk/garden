import { existsSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { appendEntry, undoLast } from '../lib/telegram/stream.ts'

const root = () => mkdtempSync(join(tmpdir(), 'garden-stream-'))
// 09:14 and 18:40 in Chișinău (UTC+3 in October)
const morning = new Date('2026-10-12T06:14:00Z')
const evening = new Date('2026-10-12T15:40:00Z')

describe('appendEntry', () => {
  it('writes entries into the local day file in time order', () => {
    const r = root()
    const path = appendEntry(r, { kind: 'entry', at: evening, text: 'Будь светом' })
    appendEntry(r, { kind: 'entry', at: morning, text: 'Fii lumina, iarna asta.', topic: 'tinserv' })
    expect(path).toBe('stream/2026-10-12.md')
    expect(readFileSync(join(r, path), 'utf8')).toBe(
      '## 09:14\ntopic: tinserv\n\nFii lumina, iarna asta.\n\n## 18:40\n\nБудь светом\n',
    )
  })

  it('uses the Chișinău date, not UTC', () => {
    const r = root()
    expect(appendEntry(r, { kind: 'entry', at: new Date('2026-10-12T22:30:00Z'), text: 'late' })).toBe(
      'stream/2026-10-13.md',
    )
  })

  it('adds the photo and the camera line', () => {
    const r = root()
    const path = appendEntry(
      r,
      { kind: 'entry', at: morning, text: 'fog' },
      'media/2026/7.webp',
      'X-T30 · 23mm · f/2',
    )
    expect(readFileSync(join(r, path), 'utf8')).toBe(
      '## 09:14\n\nfog\n\n![](../media/2026/7.webp)\n*X-T30 · 23mm · f/2*\n',
    )
  })
})

describe('undoLast', () => {
  it('removes the newest entry and reports its photo', () => {
    const r = root()
    appendEntry(r, { kind: 'entry', at: morning, text: 'keep me' })
    appendEntry(r, { kind: 'entry', at: evening, text: 'oops' }, 'media/2026/9.webp')
    expect(undoLast(r)).toEqual({ path: 'stream/2026-10-12.md', removedMedia: 'media/2026/9.webp' })
    expect(readFileSync(join(r, 'stream/2026-10-12.md'), 'utf8')).toBe('## 09:14\n\nkeep me\n')
  })

  it('deletes the day file when its last entry goes', () => {
    const r = root()
    appendEntry(r, { kind: 'entry', at: morning, text: 'only' })
    expect(undoLast(r)).toEqual({ path: 'stream/2026-10-12.md' })
    expect(existsSync(join(r, 'stream/2026-10-12.md'))).toBe(false)
  })

  it('returns null when there is nothing to undo', () => expect(undoLast(root())).toBeNull())
})
