type Env = Record<string, string | undefined>

/** Sends `text` to the garden bot's chat; without credentials it only warns on stderr. */
export async function notify(
  text: string,
  env: Env = process.env,
  fetchFn: typeof fetch = fetch,
): Promise<void> {
  const token = env.GARDEN_BOT_TOKEN
  const chatId = env.GARDEN_CHAT_ID
  if (!token || !chatId) {
    process.stderr.write(`garden: (no bot configured) ${text}\n`)
    return
  }
  await fetchFn(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  })
}
