import { getCollection } from 'astro:content'
import rss from '@astrojs/rss'
import type { APIContext } from 'astro'
import { loadStream } from '../../lib/site/data.ts'

export async function GET(context: APIContext) {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '')
  const notes = (await getCollection('notes')).map((n) => ({
    title: n.data.title,
    description: n.data.summary,
    link: `${base}/${n.id}/`,
    pubDate: new Date(`${n.data.tended}T12:00:00Z`),
  }))
  const stream = loadStream().map((s) => ({
    title: `${s.date} ${s.time}`,
    description: s.text || 'A photo',
    link: `${base}/stream/#${s.date}`,
    pubDate: new Date(`${s.date}T${s.time}:00+03:00`),
  }))
  return rss({
    title: 'Ilie’s garden',
    description: 'Notes on what I build and think about, growing over time.',
    site: context.site!,
    items: [...notes, ...stream].sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime()).slice(0, 50),
  })
}
