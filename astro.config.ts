import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { defineConfig } from 'astro/config'
import { parseNote } from './lib/content/note.ts'
import { remarkNoHtml, remarkWikilinks } from './lib/site/wikilinks.ts'

const BASE = '/garden'

function noteTitles(): Map<string, string> {
  const dir = new URL('./notes/', import.meta.url)
  if (!existsSync(dir)) return new Map()
  return new Map(
    readdirSync(dir)
      .filter((n) => n.endsWith('.md'))
      .map((n) => [n.slice(0, -3), parseNote(readFileSync(new URL(n, dir), 'utf8')).meta.title]),
  )
}

export default defineConfig({
  site: 'https://iliev-blnk.github.io',
  base: BASE,
  trailingSlash: 'always',
  markdown: { remarkPlugins: [[remarkWikilinks, { titles: noteTitles(), base: BASE }], remarkNoHtml] },
})
