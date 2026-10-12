import { parse } from 'yaml'

export const TOPICS = [
  'projects',
  'ideas',
  'movies',
  'photography',
  'study',
  'uni',
  'diploma',
  'tinserv',
  'church',
  'hobbies',
] as const
export const STAGES = ['seedling', 'budding', 'evergreen'] as const
export type Topic = (typeof TOPICS)[number]
export type Stage = (typeof STAGES)[number]

export type Edit = { path: string; content: string }
export type NoteMeta = {
  title: string
  topics: Topic[]
  stage: Stage
  planted: string
  tended: string
  summary: string
  rating?: number
}

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/
const DATE = /^\d{4}-\d{2}-\d{2}$/

export function splitFrontmatter(text: string): { yaml: string; body: string } | null {
  const m = FRONTMATTER.exec(text)
  return m ? { yaml: m[1], body: m[2] } : null
}

export function parseNote(text: string): { meta: NoteMeta; body: string } {
  const parts = splitFrontmatter(text)
  if (!parts) throw new Error('missing frontmatter')
  const raw = parse(parts.yaml) ?? {}
  const str = (k: string) => {
    const v = raw[k]
    if (typeof v !== 'string' || !v.trim()) throw new Error(`missing ${k}`)
    return v.trim()
  }
  const title = str('title')
  const summary = str('summary')
  const planted = String(raw.planted ?? '')
  const tended = String(raw.tended ?? '')
  if (!DATE.test(planted) || !DATE.test(tended)) throw new Error('planted and tended must be YYYY-MM-DD')
  const topics = raw.topics
  if (
    !Array.isArray(topics) ||
    !topics.length ||
    !topics.every((t) => (TOPICS as readonly string[]).includes(t))
  ) {
    throw new Error(`topics must be a non-empty list of: ${TOPICS.join(', ')}`)
  }
  if (!(STAGES as readonly string[]).includes(raw.stage))
    throw new Error(`stage must be one of: ${STAGES.join(', ')}`)
  const meta: NoteMeta = { title, topics, stage: raw.stage, planted, tended, summary }
  if (raw.rating !== undefined) {
    const rating = Number(raw.rating)
    if (!Number.isFinite(rating) || rating < 0 || rating > 10) throw new Error('rating must be 0–10')
    meta.rating = rating
  }
  return { meta, body: parts.body }
}
