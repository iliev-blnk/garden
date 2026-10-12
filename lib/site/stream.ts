export type StreamEntry = {
  date: string
  time: string
  topic?: string
  text: string
  photo?: string
  camera?: string
}

const PHOTO = /^!\[\]\(\.\.\/(media\/[^)]+)\)(?:\n\*(.+)\*)?$/

export function parseStreamFile(date: string, text: string): StreamEntry[] {
  return text
    .split(/^(?=## \d\d:\d\d)/m)
    .map((b) => b.trim())
    .filter(Boolean)
    .map((block) => {
      const [head, ...rest] = block.split(/\n\n/)
      const [heading, topicLine] = head.split('\n')
      const entry: StreamEntry = { date, time: heading.slice(3, 8), text: '' }
      const topic = topicLine?.match(/^topic: (\w+)$/)?.[1]
      if (topic) entry.topic = topic
      const paragraphs: string[] = []
      for (const part of rest) {
        const m = PHOTO.exec(part.trim())
        if (m) {
          entry.photo = m[1]
          if (m[2]) entry.camera = m[2]
        } else paragraphs.push(part.trim())
      }
      entry.text = paragraphs.join('\n\n')
      return entry
    })
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Plain text from Telegram → safe HTML paragraphs with bare URLs linked. */
export function renderText(text: string): string {
  return text
    .split(/\n{2,}/)
    .filter((p) => p.trim())
    .map((p) => {
      const linked = p.replace(/https?:\/\/[^\s<>"]+[^\s<>".,;:!?)]/g, (url) => `\u0000${url}\u0001`)
      const html = esc(linked)
        .replace(/\u0000([^\u0001]+)\u0001/g, (_, u) => `<a href="${u}">${u}</a>`)
        .replace(/\n/g, '<br>')
      return `<p>${html}</p>`
    })
    .join('')
}
