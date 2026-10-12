import type { Topic } from '../content/note.ts'

export type DigestEdit = { path: string; content: string } | { path: string; append: string }
export type IndexEntry = { slug: string; title: string; topics: Topic[]; summary: string }

export class BadOutput extends Error {}

export const RULES = `You tend Ilie's public digital garden. You read one Claude Code conversation between Ilie (the user) and Claude, and decide what from it belongs in the garden. The garden is public on the internet.

WHAT BELONGS (only these topics):
- projects: side and CV projects — what and why, status, decisions, lessons, what's next
- ideas: unbuilt ideas, the backlog, rejected directions and why they were rejected
- tinserv: TinSerV (youth volunteer NGO in Chișinău) campaigns, design thinking, merch — public-facing work only
- church: church and community projects
- movies, photography, study, uni, diploma, hobbies: Ilie's own thoughts on these

NEVER INCLUDE:
- Ilie's employer or any paid work: no company, product, client, ticket, repository, code or colleague, not even as a general lesson
- money, prices paid, bank or payment details, invoices
- security problems or weaknesses in any project or site
- other people's private information: names of private individuals, contacts, children
- keys, tokens, passwords, emails, phone numbers, IP addresses, server names
- anything you are not sure is fine to publish. When in doubt, leave it out.

WHAT TO WRITE:
- Write as Ilie, in the first person ("I built…", "I chose … because …"). Plain, short, concrete. No hype, no marketing words, no emoji.
- Keep what Ilie thought and decided, and why. Drop the mechanics of the session (which commands ran, which files changed, Claude's process).
- Most conversations add little: an update to one or two notes. Many add nothing. Returning no edits is a good answer.
- Prefer updating an existing note over creating a new one. Look at the note index first.
- Link related notes with [[slug]] or [[slug|label]]. Only link slugs that exist in the index or that you create in this answer.
- Today's stream (quick entries Ilie sent from their phone) is shown too. If a stream entry belongs in a note, fold the thought into that note. Never edit stream files.

HOUSE STYLE:
- TinSerV's winter event is "Ediția de iarnă" (in English: the winter edition). Never call it a camp, tabără or лагерь.
- The motto is written "Fii lumina", without a diacritic on the a.

NOTE FORMAT (notes/<slug>.md, slug = lowercase ASCII words joined by "-"):
---
title: holdshort
topics: [projects]
stage: budding
planted: 2026-10-09
tended: 2026-10-12
summary: A digital twin of Istanbul airport's traffic, built in Rust.
---

What and why, then (for projects) sections: ## Status, ## Decisions, ## Lessons, ## Next.

- topics: one or more of projects, ideas, movies, photography, study, uni, diploma, tinserv, church, hobbies
- stage: seedling (a fresh thought), budding (worked on), evergreen (settled, finished thinking)
- planted: the day the note was first written; keep it when updating. tended: today.
- summary: one line. movies may add rating: 0–10.

HOW TO ANSWER: only a JSON object, no prose, no code fence:
{"edits": [ ... ]}
Each edit is one of:
- {"path": "notes/<slug>.md", "content": "<the whole file>"} — to create a note, or to rewrite a note whose FULL TEXT is shown below. Keep everything still true from the old text.
- {"path": "notes/<slug>.md", "append": "<markdown to add at the end>"} — to add to a note you only see in the index.
Return {"edits": []} when nothing belongs in the garden.`

export function buildPayload(p: {
  chunk: string
  index: IndexEntry[]
  fullText: { slug: string; text: string }[]
  stream: string
  today: string
}): string {
  const index = p.index.length
    ? p.index.map((n) => `- ${n.slug} — ${n.title} [${n.topics.join(', ')}]: ${n.summary}`).join('\n')
    : '(no notes yet)'
  const full = p.fullText.length
    ? p.fullText.map((n) => `=== notes/${n.slug}.md\n${n.text.trim()}`).join('\n\n')
    : '(none)'
  return [
    `Today: ${p.today}`,
    `NOTE INDEX:\n${index}`,
    `NOTES IN FULL TEXT:\n${full}`,
    `TODAY'S STREAM:\n${p.stream.trim() || '(empty)'}`,
    `CONVERSATION:\n${p.chunk}`,
  ].join('\n\n')
}

function isEdit(e: unknown): e is DigestEdit {
  if (!e || typeof e !== 'object') return false
  const o = e as Record<string, unknown>
  if (typeof o.path !== 'string') return false
  return typeof o.content === 'string' || typeof o.append === 'string'
}

export function parseEdits(stdout: string): DigestEdit[] {
  let envelope: { is_error?: boolean; result?: unknown }
  try {
    envelope = JSON.parse(stdout)
  } catch {
    throw new BadOutput('claude output is not JSON')
  }
  if (envelope.is_error) throw new BadOutput(`claude error: ${String(envelope.result).slice(0, 200)}`)
  if (typeof envelope.result !== 'string') throw new BadOutput('claude output has no result')
  const text = envelope.result
    .trim()
    .replace(/^```(?:json)?\s*/, '')
    .replace(/\s*```$/, '')
  let answer: { edits?: unknown }
  try {
    answer = JSON.parse(text)
  } catch {
    throw new BadOutput(`answer is not JSON: ${text.slice(0, 80)}`)
  }
  if (!Array.isArray(answer.edits) || !answer.edits.every(isEdit))
    throw new BadOutput('answer has no valid edits list')
  return answer.edits.map((e) =>
    'content' in e ? { path: e.path, content: e.content } : { path: e.path, append: e.append },
  )
}
