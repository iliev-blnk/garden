import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const LINK = /\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g

export function linkedSlugs(body: string): string[] {
  return [...new Set([...body.matchAll(LINK)].map((m) => m[1].trim()))]
}

/** For each note, the notes that link to it, in the order given. */
export function backlinks(notes: { slug: string; body: string }[]): Map<string, string[]> {
  const map = new Map<string, string[]>()
  for (const n of notes) {
    for (const target of linkedSlugs(n.body)) {
      if (target === n.slug) continue
      map.set(target, [...(map.get(target) ?? []), n.slug])
    }
  }
  return map
}

/** Every [[link]] (outside inline code) whose note doesn't exist; the build fails on any. */
export function brokenLinks(root: string): { file: string; slug: string }[] {
  const dir = join(root, 'notes')
  if (!existsSync(dir)) return []
  const names = readdirSync(dir).filter((n) => n.endsWith('.md'))
  const slugs = new Set(names.map((n) => n.slice(0, -3)))
  return names.flatMap((n) => {
    const body = readFileSync(join(dir, n), 'utf8').replace(/`[^`\n]*`/g, '')
    return linkedSlugs(body)
      .filter((s) => !slugs.has(s))
      .map((slug) => ({ file: `notes/${n}`, slug }))
  })
}

/** Rewrites links to missing notes in `paths` as plain text (label, or the slug in words); returns the slugs unlinked. */
export function unlinkBroken(root: string, paths: string[]): string[] {
  const dir = join(root, 'notes')
  const slugs = new Set(readdirSync(dir).map((n) => n.slice(0, -3)))
  const gone: string[] = []
  for (const p of paths.filter((p) => p.startsWith('notes/'))) {
    const file = join(root, p)
    if (!existsSync(file)) continue
    const text = readFileSync(file, 'utf8')
    // Inline code is matched first so links inside it are left alone.
    const next = text.replace(/(`[^`\n]*`)|\[\[([^\]|]+)(?:\|([^\]]*))?\]\]/g, (all, code, slug, label) => {
      if (code || slugs.has(slug.trim())) return all
      gone.push(slug.trim())
      return label?.trim() || slug.trim().replace(/-/g, ' ')
    })
    if (next !== text) writeFileSync(file, next)
  }
  return gone
}
