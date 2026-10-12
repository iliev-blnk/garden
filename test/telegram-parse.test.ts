import { describe, expect, it } from 'vitest'
import { parseUpdate, type TgUpdate } from '../lib/telegram/parse.ts'

const CHAT = '4242'
const at = 1760270400 // 2025-10-12 12:00:00 UTC
const msg = (m: Record<string, unknown>, chat = 4242): TgUpdate =>
  ({ update_id: 7, message: { message_id: 1, date: at, chat: { id: chat }, ...m } }) as TgUpdate

describe('parseUpdate', () => {
  it('turns a text message into an entry', () => {
    expect(parseUpdate(msg({ text: 'a quiet thought' }), CHAT)).toEqual({
      kind: 'entry',
      at: new Date(at * 1000),
      text: 'a quiet thought',
    })
  })

  it('ignores messages from any other chat', () => {
    expect(parseUpdate(msg({ text: 'hi' }, 999), CHAT)).toEqual({ kind: 'ignore' })
  })

  it.each([
    ['#movie Dune 2 — 8/10, the sound', 'movies', 'Dune 2 — 8/10, the sound'],
    ['#film Paterson', 'movies', 'Paterson'],
    ['#idea bread subscription', 'ideas', 'bread subscription'],
    ['#diploma read two papers', 'diploma', 'read two papers'],
    ['#hobby climbing', 'hobbies', 'climbing'],
  ])('routes %s to a topic', (text, topic, rest) => {
    expect(parseUpdate(msg({ text }), CHAT)).toMatchObject({ kind: 'entry', topic, text: rest })
  })

  it('leaves unknown hashtags in the text', () => {
    const a = parseUpdate(msg({ text: '#sunday slow morning' }), CHAT)
    expect(a).toEqual({ kind: 'entry', at: new Date(at * 1000), text: '#sunday slow morning' })
  })

  it('keeps Romanian and Cyrillic text unchanged', () => {
    expect(parseUpdate(msg({ text: 'Fii lumina — будь светом' }), CHAT)).toMatchObject({
      text: 'Fii lumina — будь светом',
    })
  })

  it('takes the largest photo size and the caption', () => {
    const photo = [
      { file_id: 'small', width: 90, height: 60 },
      { file_id: 'big', width: 1280, height: 853 },
      { file_id: 'mid', width: 320, height: 213 },
    ]
    expect(parseUpdate(msg({ photo, caption: '#photo fog over the lake' }), CHAT)).toEqual({
      kind: 'entry',
      at: new Date(at * 1000),
      text: 'fog over the lake',
      topic: 'photography',
      photo: { fileId: 'big', asFile: false },
    })
  })

  it('treats an image sent as a file as a photo that keeps its camera data', () => {
    const a = parseUpdate(msg({ document: { file_id: 'doc', mime_type: 'image/jpeg' } }), CHAT)
    expect(a).toMatchObject({ kind: 'entry', text: '', photo: { fileId: 'doc', asFile: true } })
  })

  it('recognises /undo', () => {
    expect(parseUpdate(msg({ text: '/undo' }), CHAT)).toEqual({ kind: 'undo' })
  })

  it.each([
    ['a sticker', { sticker: { file_id: 's' } }],
    ['a voice note', { voice: { file_id: 'v' } }],
    ['a video', { video: { file_id: 'v' } }],
    ['a PDF', { document: { file_id: 'd', mime_type: 'application/pdf' } }],
  ])('answers %s with a reply instead of publishing', (_, m) => {
    expect(parseUpdate(msg(m), CHAT)).toEqual({ kind: 'unsupported', reply: 'only text, links and photos' })
  })

  it('answers an edited message with a reply', () => {
    const u = {
      update_id: 8,
      edited_message: { message_id: 1, date: at, chat: { id: 4242 }, text: 'fixed' },
    } as TgUpdate
    expect(parseUpdate(u, CHAT)).toEqual({ kind: 'unsupported', reply: 'only text, links and photos' })
  })
})
