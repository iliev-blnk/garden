import { execFile } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'
import { claudeRunner } from './digest/claude.ts'
import { digest } from './digest/run.ts'
import { STATE_FILE } from './digest/state.ts'
import { commitAndPush } from './git.ts'
import { notify } from './notify.ts'
import { loadDenylist } from './scan/denylist.ts'
import { expandPaths, type PathFindings, scanPaths, scanStaged } from './scan/repo.ts'

function report(hits: PathFindings[]): number {
  for (const { path, findings } of hits) {
    for (const f of findings) process.stderr.write(`${path}: ${f.kind} ${f.redacted}\n`)
  }
  return hits.length ? 1 : 0
}

const ROOT = resolve(import.meta.dirname, '..')
const PROJECTS = join(homedir(), '.claude/projects')

/** Loads KEY=value lines from ~/.config/garden/env without overriding the real environment. */
function loadEnvFile(file = join(homedir(), '.config/garden/env')) {
  if (!existsSync(file)) return
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line)
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2')
  }
}

const workDirs = () => (process.env.GARDEN_WORK_DIRS ?? '').split(':').filter(Boolean)
/** Claude Code keeps a project's transcripts under its path with every non-alphanumeric turned into "-". */
const ownProjectDir = () => join(PROJECTS, ROOT.replace(/[^a-zA-Z0-9]/g, '-'))

async function main(argv: string[]): Promise<number> {
  loadEnvFile()
  const [cmd, ...args] = argv
  switch (cmd) {
    case 'scan': {
      const denylist = loadDenylist()
      if (args[0] === '--staged') return report(await scanStaged(process.cwd(), denylist))
      return report(await scanPaths(expandPaths(args), denylist))
    }
    case 'digest': {
      const res = await digest({
        root: ROOT,
        projectsDir: PROJECTS,
        stateFile: STATE_FILE,
        skipDirs: [ownProjectDir()],
        workDirs: workDirs(),
        denylist: loadDenylist(),
        runner: claudeRunner,
        build: async () => {
          await promisify(execFile)('pnpm', ['run', 'build'], { cwd: ROOT, maxBuffer: 64 * 1024 * 1024 })
        },
        push: commitAndPush,
        notify,
        dryRun: args.includes('--dry-run'),
      })
      process.stdout.write(`digest: ${res.notes} notes, ${res.skipped} skipped\n`)
      return 0
    }
    default:
      process.stderr.write('usage: garden <scan|digest [--dry-run]>\n')
      return 2
  }
}

process.exitCode = await main(process.argv.slice(2))
