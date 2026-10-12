import type { Html, Link, Parent, PhrasingContent, Root, Text } from 'mdast'
import { SKIP, visit } from 'unist-util-visit'
import type { VFile } from 'vfile'

const LINK = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g

/** Turns [[slug]] and [[slug|label]] into links; an unknown slug fails the build. */
export function remarkWikilinks(opts: { titles: Map<string, string>; base: string }) {
  const base = opts.base.replace(/\/$/, '')
  return (tree: Root, file: VFile) => {
    visit(tree, 'text', (node: Text, index, parent: Parent | undefined) => {
      if (!parent || index === undefined || !node.value.includes('[[')) return
      const out: PhrasingContent[] = []
      let last = 0
      for (const m of node.value.matchAll(LINK)) {
        const slug = m[1].trim()
        const title = opts.titles.get(slug)
        if (title === undefined) throw new Error(`Broken wikilink [[${slug}]] in ${file.path}`)
        if (m.index > last) out.push({ type: 'text', value: node.value.slice(last, m.index) })
        const link: Link = {
          type: 'link',
          url: `${base}/${slug}/`,
          children: [{ type: 'text', value: m[2]?.trim() || title }],
        }
        out.push(link)
        last = m.index + m[0].length
      }
      if (!out.length) return
      if (last < node.value.length) out.push({ type: 'text', value: node.value.slice(last) })
      parent.children.splice(index, 1, ...(out as typeof parent.children))
      return [SKIP, index + out.length]
    })
  }
}

/** Raw HTML in a note is shown as text: notes are written unattended, so no markup goes live. */
export function remarkNoHtml() {
  return (tree: Root) => {
    visit(tree, 'html', (node: Html, index, parent: Parent | undefined) => {
      if (!parent || index === undefined) return
      const text: Text = { type: 'text', value: node.value }
      const inline =
        parent.type === 'paragraph' ||
        parent.type === 'emphasis' ||
        parent.type === 'strong' ||
        parent.type === 'link'
      parent.children.splice(
        index,
        1,
        (inline ? text : { type: 'paragraph', children: [text] }) as (typeof parent.children)[number],
      )
    })
  }
}
