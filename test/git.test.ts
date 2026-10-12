import { rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { commitAndPush } from '../lib/git.ts'
import { git, remoteAndClone, secondClone } from './helpers/git.ts'

describe('commitAndPush', () => {
  it('commits only the named paths and pushes', async () => {
    const { remote, clone } = remoteAndClone()
    writeFileSync(join(clone, 'a.md'), 'a')
    writeFileSync(join(clone, 'stray.md'), 'not mine')
    await commitAndPush(clone, ['a.md'], 'Add a')
    expect(git(remote, 'log', '--format=%s', '-1', 'main')).toBe('Add a')
    expect(git(remote, 'ls-tree', '--name-only', 'main')).not.toContain('stray.md')
  })

  it('rebases onto a commit the other pipeline pushed meanwhile, then pushes', async () => {
    const { remote, clone } = remoteAndClone()
    const other = secondClone(remote)
    writeFileSync(join(other, 'stream.md'), 'from telegram')
    git(other, 'add', 'stream.md')
    git(other, 'commit', '-q', '-m', 'Telegram: 1 entries')
    git(other, 'push', '-q', 'origin', 'main')

    writeFileSync(join(clone, 'note.md'), 'from digest')
    await commitAndPush(clone, ['note.md'], 'Digest')
    expect(git(remote, 'log', '--format=%s', 'main').split('\n')).toEqual([
      'Digest',
      'Telegram: 1 entries',
      'init',
    ])
  })

  it('records the deletion of a named path', async () => {
    const { remote, clone } = remoteAndClone()
    writeFileSync(join(clone, 'gone.md'), 'x')
    await commitAndPush(clone, ['gone.md'], 'Add gone')
    rmSync(join(clone, 'gone.md'))
    await commitAndPush(clone, ['gone.md'], 'Remove gone')
    expect(git(remote, 'ls-tree', '--name-only', 'main')).not.toContain('gone.md')
  })
})
