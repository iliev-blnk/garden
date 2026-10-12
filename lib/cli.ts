import { execFile } from 'node:child_process'
import { appendFileSync, existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'
import { backfill } from './digest/backfill.ts'
import { claudeRunner } from './digest/claude.ts'
import { digest } from './digest/run.ts'
import { STATE_FILE } from './digest/state.ts'
import { commitAndPush } from './git.ts'
import { notify } from './notify.ts'
import { loadDenylist } from './scan/denylist.ts'
import { expandPaths, type PathFindings, scanPaths, scanStaged } from './scan/repo.ts'
import { httpApi, telegramRun } from './telegram/run.ts'

function report(hits: PathFindings[]): number {
  for (const { path, findings } of hits) {
    for (const f of findings) process.stderr.write(`${path}: ${f.kind} ${f.redacted}\n`)
  }
  return hits.length ? 1 : 0
}

const ROOT = resolve(import.meta.dirname, '..')
export const SITE_URL = 'https://iliev-blnk.github.io/garden/'
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
const projectDirFor = (path: string) => join(PROJECTS, path.replace(/[^a-zA-Z0-9]/g, '-'))
const ownProjectDir = () => projectDirFor(ROOT)

async function main(argv: string[]): Promise<number> {
  loadEnvFile()
  const [cmd, ...args] = argv
  switch (cmd) {
    case 'scan': {
      const denylist = loadDenylist()
      if (args[0] === '--staged') return report(await scanStaged(process.cwd(), denylist))
      return report(await scanPaths(expandPaths(args), denylist))
    }
    case 'digest':
    case 'backfill': {
      const opts = {
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
      }
      if (cmd === 'backfill') {
        if (!process.env.GARDEN_WORK_MEMORY)
          throw new Error('GARDEN_WORK_MEMORY is not set; refusing to backfill without it')
        const limit = args.indexOf('--limit')
        await backfill({
          ...opts,
          memoryDir: join(projectDirFor(homedir()), 'memory'),
          workMemory: new RegExp(process.env.GARDEN_WORK_MEMORY, 'i'),
          batch: 10,
          maxChats: limit === -1 ? undefined : Number(args[limit + 1]),
        })
        return 0
      }
      const res = await digest(opts)
      process.stdout.write(`digest: ${res.notes} notes, ${res.skipped} skipped\n`)
      return 0
    }
    case 'telegram': {
      const token = process.env.GARDEN_BOT_TOKEN
      const chatId = process.env.GARDEN_CHAT_ID
      if (!token || !chatId) throw new Error('GARDEN_BOT_TOKEN and GARDEN_CHAT_ID are required')
      const res = await telegramRun({
        root: ROOT,
        api: httpApi(token, chatId),
        chatId,
        denylist: loadDenylist(),
        push: commitAndPush,
        siteUrl: SITE_URL,
      })
      process.stdout.write(`telegram: ${res.planted} planted, ${res.refused} refused\n`)
      if (process.env.GITHUB_OUTPUT)
        appendFileSync(process.env.GITHUB_OUTPUT, `changed=${res.planted + res.undone}\n`)
      return 0
    }
    default:
      process.stderr.write(
        'usage: garden <scan|telegram|digest [--dry-run]|backfill [--limit N] [--dry-run]>\n',
      )
      return 2
  }
}

process.exitCode = await main(process.argv.slice(2))
