import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)
const git = (cwd: string, ...args: string[]) => run('git', args, { cwd, maxBuffer: 16 * 1024 * 1024 })

/** Stages exactly `paths` (including deletions), commits, pushes; one rebase-and-retry if the remote moved. */
export async function commitAndPush(root: string, paths: string[], message: string): Promise<void> {
  if (!paths.length) return
  await git(root, 'add', '-A', '--', ...paths)
  const staged = (await git(root, 'diff', '--cached', '--name-only')).stdout.trim()
  if (!staged) return
  await git(root, 'commit', '-q', '-m', message)
  try {
    await git(root, 'push', '-q', 'origin', 'HEAD')
  } catch {
    const branch = (await git(root, 'rev-parse', '--abbrev-ref', 'HEAD')).stdout.trim()
    await git(root, 'pull', '-q', '--rebase', 'origin', branch)
    await git(root, 'push', '-q', 'origin', 'HEAD')
  }
}
