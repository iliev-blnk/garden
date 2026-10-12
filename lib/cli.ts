import { loadDenylist } from './scan/denylist.ts'
import { expandPaths, type PathFindings, scanPaths, scanStaged } from './scan/repo.ts'

function report(hits: PathFindings[]): number {
  for (const { path, findings } of hits) {
    for (const f of findings) process.stderr.write(`${path}: ${f.kind} ${f.redacted}\n`)
  }
  return hits.length ? 1 : 0
}

async function main(argv: string[]): Promise<number> {
  const [cmd, ...args] = argv
  switch (cmd) {
    case 'scan': {
      const denylist = loadDenylist()
      if (args[0] === '--staged') return report(await scanStaged(process.cwd(), denylist))
      return report(await scanPaths(expandPaths(args), denylist))
    }
    default:
      process.stderr.write('usage: garden <scan>\n')
      return 2
  }
}

process.exitCode = await main(process.argv.slice(2))
