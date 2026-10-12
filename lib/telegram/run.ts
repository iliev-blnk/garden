import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { commitAndPush } from '../git.ts'
import { scanImage } from '../scan/image.ts'
import { type FindingKind, scanText } from '../scan/scanner.ts'
import { localDate } from '../time.ts'
import { parseUpdate, type TgUpdate } from './parse.ts'
import { processPhoto } from './photo.ts'
import { appendEntry, undoLast } from './stream.ts'

export type TgApi = {
  getUpdates(offset: number): Promise<TgUpdate[]>
  getFile(fileId: string): Promise<Buffer>
  send(text: string): Promise<void>
}

const OFFSET_FILE = '.garden/telegram.json'

const WHAT: Record<FindingKind, string> = {
  secret: 'a key or password',
  email: 'an email address',
  phone: 'a phone number',
  ip: 'an IP address',
  iban: 'a bank account number',
  card: 'a card number',
  gps: 'a location',
  denylist: 'a name on your private list',
}

export function httpApi(token: string, chatId: string): TgApi {
  const call = async (method: string, params: Record<string, unknown>) => {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(params),
    })
    const body = (await res.json()) as { ok: boolean; result: unknown; description?: string }
    if (!body.ok) throw new Error(`telegram ${method}: ${body.description}`)
    return body.result
  }
  return {
    getUpdates: async (offset) =>
      (await call('getUpdates', {
        offset,
        timeout: 0,
        allowed_updates: ['message', 'edited_message'],
      })) as TgUpdate[],
    getFile: async (fileId) => {
      const { file_path } = (await call('getFile', { file_id: fileId })) as { file_path: string }
      const res = await fetch(`https://api.telegram.org/file/bot${token}/${file_path}`)
      if (!res.ok) throw new Error(`telegram download: ${res.status}`)
      return Buffer.from(await res.arrayBuffer())
    },
    send: async (text) => {
      await call('sendMessage', { chat_id: chatId, text, link_preview_options: { is_disabled: true } })
    },
  }
}

export async function telegramRun(o: {
  root: string
  api: TgApi
  chatId: string
  denylist: string[]
  push: typeof commitAndPush
  siteUrl: string
}): Promise<{ planted: number; refused: number; undone: number }> {
  const offsetFile = join(o.root, OFFSET_FILE)
  const offset = existsSync(offsetFile) ? (JSON.parse(readFileSync(offsetFile, 'utf8')).offset as number) : 0
  const updates = await o.api.getUpdates(offset)
  if (!updates.length) return { planted: 0, refused: 0, undone: 0 }

  const paths = new Set<string>()
  const replies: string[] = []
  let planted = 0
  let refused = 0
  let undone = 0
  const refuse = (kind: FindingKind) => {
    refused++
    replies.push(`not published: looks like ${WHAT[kind]}`)
  }

  for (const u of updates) {
    // One unusable message (a HEIC file, a 20 MB file, a corrupt image) must not block the ones behind it.
    try {
      const a = parseUpdate(u, o.chatId)
      if (a.kind === 'ignore') continue
      if (a.kind === 'unsupported') {
        replies.push(a.reply)
        continue
      }
      if (a.kind === 'undo') {
        const removed = undoLast(o.root)
        if (!removed) {
          replies.push('nothing to undo')
          continue
        }
        paths.add(removed.path)
        if (removed.removedMedia) {
          rmSync(join(o.root, removed.removedMedia), { force: true })
          paths.add(removed.removedMedia)
        }
        undone++
        replies.push('undone')
        continue
      }
      const [textFinding] = scanText(a.text, o.denylist)
      if (textFinding) {
        refuse(textFinding.kind)
        continue
      }
      let photoPath: string | undefined
      let camera: string | undefined
      if (a.photo) {
        const processed = await processPhoto(await o.api.getFile(a.photo.fileId), a.photo.asFile)
        const [imageFinding] = await scanImage(processed.webp)
        if (imageFinding) {
          refuse(imageFinding.kind)
          continue
        }
        photoPath = `media/${localDate(a.at).slice(0, 4)}/${u.update_id}.webp`
        mkdirSync(dirname(join(o.root, photoPath)), { recursive: true })
        writeFileSync(join(o.root, photoPath), processed.webp)
        paths.add(photoPath)
        camera = processed.camera
      }
      paths.add(appendEntry(o.root, a, photoPath, camera))
      planted++
      replies.push(`🌱 planted ${o.siteUrl}stream/`)
    } catch (err) {
      replies.push(`could not use that message (${(err as Error).message.slice(0, 120)})`)
    }
  }

  mkdirSync(dirname(offsetFile), { recursive: true })
  writeFileSync(
    offsetFile,
    `${JSON.stringify({ offset: Math.max(...updates.map((u) => u.update_id)) + 1 })}\n`,
  )
  paths.add(OFFSET_FILE)
  // Every new entry was scanned above; skipping the hook keeps an old entry that a newer denylist flags from
  // blocking the queue (the build's scan still catches it before deploy).
  await o.push(o.root, [...paths], `Telegram: ${planted} entries`, { verify: false })
  for (const r of replies) await o.api.send(r).catch(() => {})
  return { planted, refused, undone }
}
