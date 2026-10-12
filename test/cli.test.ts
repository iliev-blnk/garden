import { describe, expect, it, vi } from 'vitest'
import { withPing } from '../lib/ping.ts'

describe('withPing', () => {
  it('pings and rethrows when the command crashes', async () => {
    const notify = vi.fn(async (_: string) => {})
    await expect(
      withPing('digest', notify, async () => {
        throw new Error('bad frontmatter in notes/x.md')
      }),
    ).rejects.toThrow('bad frontmatter')
    expect(notify).toHaveBeenCalledWith('garden: digest crashed: bad frontmatter in notes/x.md')
  })
  it('stays quiet when the command succeeds', async () => {
    const notify = vi.fn(async (_: string) => {})
    expect(await withPing('digest', notify, async () => 7)).toBe(7)
    expect(notify).not.toHaveBeenCalled()
  })
})
