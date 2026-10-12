import type { Topic } from '../content/note.ts'

type TgMessage = {
  message_id: number
  date: number
  chat: { id: number }
  text?: string
  caption?: string
  photo?: { file_id: string; width: number; height: number }[]
  document?: { file_id: string; mime_type?: string }
}
/** The part of Telegram's Update object the garden reads. */
export type TgUpdate = { update_id: number; message?: TgMessage; edited_message?: TgMessage }

export type EntryAction = {
  kind: 'entry'
  at: Date
  text: string
  topic?: Topic
  photo?: { fileId: string; asFile: boolean }
}
export type Action =
  | EntryAction
  | { kind: 'undo' }
  | { kind: 'unsupported'; reply: string }
  | { kind: 'ignore' }

const UNSUPPORTED: Action = { kind: 'unsupported', reply: 'only text, links and photos' }
const COMMANDS: Action = { kind: 'unsupported', reply: 'commands: /undo removes your last entry' }

const HASHTAGS: Record<string, Topic> = {
  movie: 'movies',
  movies: 'movies',
  film: 'movies',
  idea: 'ideas',
  photo: 'photography',
  study: 'study',
  uni: 'uni',
  diploma: 'diploma',
  tinserv: 'tinserv',
  church: 'church',
  hobby: 'hobbies',
  project: 'projects',
}

function routed(raw: string): { text: string; topic?: Topic } {
  const m = /^#(\w+)\s*/.exec(raw)
  const topic = m ? HASHTAGS[m[1].toLowerCase()] : undefined
  return topic ? { text: raw.slice(m![0].length).trim(), topic } : { text: raw.trim() }
}

export function parseUpdate(update: TgUpdate, chatId: string): Action {
  const msg = update.message ?? update.edited_message
  if (!msg || String(msg.chat.id) !== chatId) return { kind: 'ignore' }
  if (!update.message) return UNSUPPORTED
  const at = new Date(msg.date * 1000)

  let photo: EntryAction['photo']
  if (msg.photo?.length) {
    const largest = msg.photo.reduce((a, b) => (b.width * b.height > a.width * a.height ? b : a))
    photo = { fileId: largest.file_id, asFile: false }
  } else if (msg.document?.mime_type?.startsWith('image/')) {
    photo = { fileId: msg.document.file_id, asFile: true }
  } else if (msg.text === undefined) {
    return UNSUPPORTED
  }

  const raw = photo ? (msg.caption ?? '') : (msg.text ?? '')
  const command = !photo && /^\/([a-z_]+)(@\w+)?\s*$/i.exec(raw.trim())
  if (command) return command[1].toLowerCase() === 'undo' ? { kind: 'undo' } : COMMANDS
  const { text, topic } = routed(raw)
  return { kind: 'entry', at, text, ...(topic ? { topic } : {}), ...(photo ? { photo } : {}) }
}
