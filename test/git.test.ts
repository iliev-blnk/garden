import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { commitAndPush, prepareWorkspace } from '../lib/git.ts'
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
  it('aborts a rebase that conflicts, so the next run starts clean', async () => {
    const { remote, clone } = remoteAndClone()
    const other = secondClone(remote)
    writeFileSync(join(other, 'same.md'), 'from telegram')
    git(other, 'add', 'same.md')
    git(other, 'commit', '-q', '-m', 'Telegram')
    git(other, 'push', '-q', 'origin', 'main')
    writeFileSync(join(clone, 'same.md'), 'from digest')
    await expect(commitAndPush(clone, ['same.md'], 'Digest')).rejects.toThrow()
    expect(existsSync(join(clone, '.git/rebase-merge')) || existsSync(join(clone, '.git/rebase-apply'))).toBe(
      false,
    )
  })

  it('commits only the named paths even when other files are staged', async () => {
    const { remote, clone } = remoteAndClone()
    writeFileSync(join(clone, 'staged.md'), 'user work')
    git(clone, 'add', 'staged.md')
    writeFileSync(join(clone, 'note.md'), 'digest')
    await commitAndPush(clone, ['note.md'], 'Digest')
    expect(git(remote, 'ls-tree', '--name-only', 'main')).not.toContain('staged.md')
  })
})

describe('prepareWorkspace', () => {
  it('makes a detached copy at origin/main and pushes from it to main', async () => {
    const { remote, clone } = remoteAndClone()
    const ws = join(mkdtempSync(join(tmpdir(), 'ws-')), 'garden')
    await prepareWorkspace(clone, ws)
    writeFileSync(join(ws, 'n.md'), 'x')
    await commitAndPush(ws, ['n.md'], 'From the workspace')
    expect(git(remote, 'log', '--format=%s', '-1', 'main')).toBe('From the workspace')
  })

  it('resets the copy to the latest origin/main and drops leftovers', async () => {
    const { remote, clone } = remoteAndClone()
    const ws = join(mkdtempSync(join(tmpdir(), 'ws-')), 'garden')
    await prepareWorkspace(clone, ws)
    writeFileSync(join(ws, 'leftover.md'), 'half-done')
    const other = secondClone(remote)
    writeFileSync(join(other, 'new.md'), 'new')
    git(other, 'add', 'new.md')
    git(other, 'commit', '-q', '-m', 'Telegram')
    git(other, 'push', '-q', 'origin', 'main')
    await prepareWorkspace(clone, ws)
    expect(existsSync(join(ws, 'leftover.md'))).toBe(false)
    expect(existsSync(join(ws, 'new.md'))).toBe(true)
  })
})
