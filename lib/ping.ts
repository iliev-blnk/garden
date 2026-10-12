/** Runs a command; if it crashes, pings the user before letting the error through. */
export async function withPing<T>(
  cmd: string,
  notify: (text: string) => Promise<void>,
  fn: () => Promise<T>,
): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    await notify(`garden: ${cmd} crashed: ${(err as Error).message}`).catch(() => {})
    throw err
  }
}
