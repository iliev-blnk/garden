import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export const git = (cwd: string, ...args: string[]) => execFileSync('git', args, { cwd }).toString().trim()

/** A bare "GitHub" remote plus a working clone with one commit on main. */
export function remoteAndClone(): { remote: string; clone: string } {
  const base = mkdtempSync(join(tmpdir(), 'garden-git-'))
  const remote = join(base, 'remote.git')
  const clone = join(base, 'clone')
  execFileSync('git', ['init', '-q', '--bare', '-b', 'main', remote])
  execFileSync('git', ['clone', '-q', remote, clone])
  configure(clone)
  writeFileSync(join(clone, 'README.md'), 'garden\n')
  git(clone, 'add', 'README.md')
  git(clone, 'commit', '-q', '-m', 'init')
  git(clone, 'push', '-q', 'origin', 'HEAD:main')
  return { remote, clone }
}

export function configure(dir: string) {
  git(dir, 'config', 'user.name', 'test')
  git(dir, 'config', 'user.email', 'test@localhost')
  git(dir, 'config', 'commit.gpgsign', 'false')
}

export function secondClone(remote: string): string {
  const dir = join(mkdtempSync(join(tmpdir(), 'garden-git2-')), 'c')
  execFileSync('git', ['clone', '-q', remote, dir])
  configure(dir)
  return dir
}
