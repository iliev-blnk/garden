import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { promisify } from 'node:util'

const run = promisify(execFile)
const git = (cwd: string, ...args: string[]) => run('git', args, { cwd, maxBuffer: 16 * 1024 * 1024 })
const BRANCH = 'main'

/**
 * A copy of the repo for unattended jobs: a detached worktree at origin/main, reset on every run so a
 * half-finished earlier run (or the user's own edits in their checkout) can never leak into a commit.
 */
export async function prepareWorkspace(repo: string, dir: string): Promise<void> {
  await git(repo, 'fetch', '-q', 'origin', BRANCH)
  if (!existsSync(dir)) {
    await git(repo, 'worktree', 'add', '-q', '--detach', dir, `origin/${BRANCH}`)
    return
  }
  await git(dir, 'rebase', '--abort').catch(() => {})
  await git(dir, 'reset', '-q', '--hard', `origin/${BRANCH}`)
  await git(dir, 'clean', '-fdq')
}

/** Stages and commits exactly `paths` (including deletions), pushes to main; one rebase-and-retry if the remote moved. */
export async function commitAndPush(
  root: string,
  paths: string[],
  message: string,
  opts: { verify?: boolean } = {},
): Promise<void> {
  if (!paths.length) return
  await git(root, 'add', '-A', '--', ...paths)
  const staged = (await git(root, 'diff', '--cached', '--name-only', '--', ...paths)).stdout.trim()
  if (!staged) return
  await git(
    root,
    'commit',
    '-q',
    ...(opts.verify === false ? ['--no-verify'] : []),
    '-m',
    message,
    '--',
    ...paths,
  )
  try {
    await git(root, 'push', '-q', 'origin', `HEAD:${BRANCH}`)
  } catch {
    try {
      await git(root, 'pull', '-q', '--rebase', 'origin', BRANCH)
    } catch (err) {
      await git(root, 'rebase', '--abort').catch(() => {})
      throw err
    }
    await git(root, 'push', '-q', 'origin', `HEAD:${BRANCH}`)
  }
}
