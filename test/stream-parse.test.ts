import { describe, expect, it } from 'vitest'
import { parseStreamFile, renderText } from '../lib/site/stream.ts'

const day = `## 09:14
topic: tinserv

Fii lumina, iarna asta.

## 18:40

fog over the lake

![](../media/2026/7.webp)
*X-T30 · 23mm · f/2*

## 21:05

just a link https://example.org/a?b=1
`

describe('parseStreamFile', () => {
  it('reads every entry with its time, topic, text, photo and camera line', () => {
    expect(parseStreamFile('2026-10-12', day)).toEqual([
      { date: '2026-10-12', time: '09:14', topic: 'tinserv', text: 'Fii lumina, iarna asta.' },
      {
        date: '2026-10-12',
        time: '18:40',
        text: 'fog over the lake',
        photo: 'media/2026/7.webp',
        camera: 'X-T30 · 23mm · f/2',
      },
      { date: '2026-10-12', time: '21:05', text: 'just a link https://example.org/a?b=1' },
    ])
  })
  it('handles a photo with no text', () => {
    expect(parseStreamFile('2026-10-12', '## 07:00\n\n![](../media/2026/1.webp)\n')).toEqual([
      { date: '2026-10-12', time: '07:00', text: '', photo: 'media/2026/1.webp' },
    ])
  })
})

describe('renderText', () => {
  it('escapes HTML and links bare URLs', () => {
    expect(renderText('<b>hi</b> see https://example.org/a?b=1&c=2.')).toBe(
      '<p>&lt;b&gt;hi&lt;/b&gt; see <a href="https://example.org/a?b=1&amp;c=2">https://example.org/a?b=1&amp;c=2</a>.</p>',
    )
  })
  it('keeps paragraphs and line breaks', () => {
    expect(renderText('one\ntwo\n\nthree')).toBe('<p>one<br>two</p><p>three</p>')
  })
})
