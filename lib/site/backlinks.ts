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
