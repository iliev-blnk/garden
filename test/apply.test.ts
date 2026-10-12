import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { applyEdits, noteIndex } from '../lib/content/apply.ts'
import { parseNote } from '../lib/content/note.ts'
import { slugify } from '../lib/content/slug.ts'

const root = () => mkdtempSync(join(tmpdir(), 'garden-apply-'))

function note(fields: Record<string, string> = {}, body = 'I built a thing.') {
  const meta = {
    title: 'holdshort',
    topics: '[projects]',
    stage: 'budding',
    planted: '2026-10-09',
    tended: '2026-10-12',
    summary: 'An airspace twin of Istanbul airport.',
    ...fields,
  }
  const lines = Object.entries(meta)
    .filter(([, v]) => v !== '')
    .map(([k, v]) => `${k}: ${v}`)
  return `---\n${lines.join('\n')}\n---\n\n${body}\n`
}

describe('applyEdits', () => {
  it('writes a valid note', () => {
    const r = root()
    const res = applyEdits(r, [{ path: 'notes/holdshort.md', content: note() }], [])
    expect(res).toEqual({ applied: ['notes/holdshort.md'], skipped: [] })
    expect(readFileSync(join(r, 'notes/holdshort.md'), 'utf8')).toBe(note())
  })

  it('refuses to write stream files (they hold the user’s own words)', () => {
    const res = applyEdits(
      root(),
      [{ path: 'stream/2026-10-12.md', content: '## 09:14\n\nA thought.\n' }],
      [],
    )
    expect(res).toEqual({ applied: [], skipped: [{ path: 'stream/2026-10-12.md', reason: 'path' }] })
  })

  it.each([
    'media/a.webp',
    '../x.md',
    '/etc/x.md',
    'notes/../x.md',
    'notes/a/b.md',
    'notes/Bad Name.md',
    'stream/today.md',
  ])('refuses the path %s', (path) => {
    const r = root()
    const res = applyEdits(r, [{ path, content: note() }], [])
    expect(res).toEqual({ applied: [], skipped: [{ path, reason: 'path' }] })
  })

  it('refuses a topic outside the list', () => {
    const res = applyEdits(root(), [{ path: 'notes/x.md', content: note({ topics: '[work]' }) }], [])
    expect(res.skipped).toEqual([{ path: 'notes/x.md', reason: 'frontmatter' }])
  })

  it('refuses a note without a title', () => {
    const res = applyEdits(root(), [{ path: 'notes/x.md', content: note({ title: '' }) }], [])
    expect(res.skipped).toEqual([{ path: 'notes/x.md', reason: 'frontmatter' }])
  })

  it('skips an edit the scanner flags and still applies the others', () => {
    const r = root()
    const email = ['a', 'b.co'].join('@')
    const res = applyEdits(
      r,
      [
        { path: 'notes/leak.md', content: note({}, `write to ${email}`) },
        { path: 'notes/fine.md', content: note() },
      ],
      [],
    )
    expect(res).toEqual({
      applied: ['notes/fine.md'],
      skipped: [{ path: 'notes/leak.md', reason: 'scan:email' }],
    })
    expect(existsSync(join(r, 'notes/leak.md'))).toBe(false)
  })

  it('skips a denylisted term', () => {
    const res = applyEdits(root(), [{ path: 'notes/x.md', content: note({}, 'at Acme Corp') }], ['acme corp'])
    expect(res.skipped).toEqual([{ path: 'notes/x.md', reason: 'scan:denylist' }])
  })

  it('skips a rewrite that drops most of an existing note', () => {
    const r = root()
    mkdirSync(join(r, 'notes'))
    writeFileSync(join(r, 'notes/x.md'), note({}, 'a'.repeat(1000)))
    const res = applyEdits(r, [{ path: 'notes/x.md', content: note({}, 'b'.repeat(400)) }], [])
    expect(res.skipped).toEqual([{ path: 'notes/x.md', reason: 'shrink' }])
    expect(readFileSync(join(r, 'notes/x.md'), 'utf8')).toContain('a'.repeat(1000))
  })

  it('allows a rewrite that keeps at least half the body', () => {
    const r = root()
    mkdirSync(join(r, 'notes'))
    writeFileSync(join(r, 'notes/x.md'), note({}, 'a'.repeat(1000)))
    const res = applyEdits(r, [{ path: 'notes/x.md', content: note({}, 'b'.repeat(600)) }], [])
    expect(res.applied).toEqual(['notes/x.md'])
  })
})

describe('parseNote', () => {
  it('reads frontmatter and body', () => {
    const { meta, body } = parseNote(note({ rating: '8', topics: '[movies]' }, 'Loved the sound.'))
    expect(meta).toEqual({
      title: 'holdshort',
      topics: ['movies'],
      stage: 'budding',
      planted: '2026-10-09',
      tended: '2026-10-12',
      summary: 'An airspace twin of Istanbul airport.',
      rating: 8,
    })
    expect(body.trim()).toBe('Loved the sound.')
  })
  it.each([
    ['an unknown stage', { stage: 'tree' }],
    ['a malformed date', { planted: '12 Oct' }],
    ['a rating above 10', { rating: '11' }],
    ['no topics', { topics: '[]' }],
  ])('throws on %s', (_, fields) => {
    expect(() => parseNote(note(fields as Record<string, string>))).toThrow()
  })
  it('throws without frontmatter', () => expect(() => parseNote('just text')).toThrow())
})

describe('slugify', () => {
  it('makes ASCII kebab-case', () => expect(slugify('Cimișlia iarna')).toBe('cimislia-iarna'))
  it('drops punctuation and collapses dashes', () =>
    expect(slugify('  Dune: Part Two!! ')).toBe('dune-part-two'))
  it('transliterates Cyrillic', () => expect(slugify('Будь светом')).toBe('bud-svetom'))
})

describe('noteIndex', () => {
  it('lists every note with its summary, sorted by slug', () => {
    const r = root()
    applyEdits(
      r,
      [
        { path: 'notes/zeta.md', content: note({ title: 'Zeta', topics: '[ideas]' }) },
        { path: 'notes/alpha.md', content: note({ title: 'Alpha' }) },
      ],
      [],
    )
    expect(noteIndex(r)).toEqual([
      {
        slug: 'alpha',
        title: 'Alpha',
        topics: ['projects'],
        summary: 'An airspace twin of Istanbul airport.',
      },
      { slug: 'zeta', title: 'Zeta', topics: ['ideas'], summary: 'An airspace twin of Istanbul airport.' },
    ])
  })
  it('is empty when there are no notes yet', () => expect(noteIndex(root())).toEqual([]))
})
