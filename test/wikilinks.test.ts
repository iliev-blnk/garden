import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import rehypeStringify from 'rehype-stringify'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'
import { describe, expect, it } from 'vitest'
import { backlinks, brokenLinks } from '../lib/site/backlinks.ts'
import { remarkNoHtml, remarkWikilinks } from '../lib/site/wikilinks.ts'

const titles = new Map([
  ['holdshort', 'holdshort'],
  ['grid-md', 'grid.md'],
])
const render = (md: string, path = 'notes/x.md') =>
  String(
    unified()
      .use(remarkParse)
      .use(remarkWikilinks, { titles, base: '/garden' })
      .use(remarkNoHtml)
      .use(remarkRehype)
      .use(rehypeStringify)
      .processSync({ value: md, path }),
  )

describe('remarkWikilinks', () => {
  it('links a slug and shows the note title', () => {
    expect(render('See [[grid-md]] too.')).toBe('<p>See <a href="/garden/grid-md/">grid.md</a> too.</p>')
  })
  it('uses the label after the pipe', () => {
    expect(render('[[holdshort|the twin]]')).toBe('<p><a href="/garden/holdshort/">the twin</a></p>')
  })
  it('handles several links in one paragraph and inside emphasis', () => {
    expect(render('**[[holdshort]]** and [[grid-md]]')).toBe(
      '<p><strong><a href="/garden/holdshort/">holdshort</a></strong> and <a href="/garden/grid-md/">grid.md</a></p>',
    )
  })
  it('throws on a slug that does not exist, naming the file', () => {
    expect(() => render('[[nope]]', 'notes/broken.md')).toThrow('Broken wikilink [[nope]] in notes/broken.md')
  })
  it('shows raw HTML as text instead of markup', () => {
    expect(render('Try <script>alert(1)</script> here')).toBe(
      '<p>Try &#x3C;script>alert(1)&#x3C;/script> here</p>',
    )
    expect(render('<iframe src="x"></iframe>')).toBe('<p>&#x3C;iframe src="x">&#x3C;/iframe></p>')
  })
  it('leaves code alone', () => {
    expect(render('`[[nope]]`')).toBe('<p><code>[[nope]]</code></p>')
  })
})

describe('backlinks', () => {
  it('maps each note to the notes that link to it, ignoring self-links and duplicates', () => {
    const map = backlinks([
      { slug: 'a', body: 'see [[b]] and [[b|again]]' },
      { slug: 'b', body: 'I link to [[b]] myself' },
      { slug: 'c', body: 'also [[b]], and [[a]]' },
    ])
    expect(map.get('b')).toEqual(['a', 'c'])
    expect(map.get('a')).toEqual(['c'])
    expect(map.get('c')).toBeUndefined()
  })
})

describe('brokenLinks', () => {
  it('lists links to notes that do not exist, by file', () => {
    const root = mkdtempSync(join(tmpdir(), 'links-'))
    mkdirSync(join(root, 'notes'))
    writeFileSync(join(root, 'notes/a.md'), 'see [[b]] and [[ghost|boo]]')
    writeFileSync(join(root, 'notes/b.md'), 'back to [[a]], and `[[code]]` is fine')
    expect(brokenLinks(root)).toEqual([{ file: 'notes/a.md', slug: 'ghost' }])
  })
})
