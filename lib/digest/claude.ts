import { spawn } from 'node:child_process'

export type Runner = (system: string, payload: string) => Promise<string>

const TIMEOUT_MS = 10 * 60 * 1000

/** Headless Claude with no tools, no saved session, no hooks and no MCP servers. */
export const claudeRunner: Runner = (system, payload) =>
  new Promise((resolve, reject) => {
    const child = spawn(
      'claude',
      [
        '-p',
        '--output-format',
        'json',
        '--tools',
        '',
        '--no-session-persistence',
        '--strict-mcp-config',
        '--settings',
        '{"disableAllHooks":true}',
        '--system-prompt',
        system,
      ],
      { stdio: ['pipe', 'pipe', 'pipe'] },
    )
    let out = ''
    let err = ''
    const timer = setTimeout(() => {
      child.kill('SIGTERM')
      reject(new Error('claude timed out after 10 minutes'))
    }, TIMEOUT_MS)
    child.stdout.on('data', (d) => {
      out += d
    })
    child.stderr.on('data', (d) => {
      err += d
    })
    child.on('error', (e) => {
      clearTimeout(timer)
      reject(e)
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (code === 0) resolve(out)
      else reject(new Error(`claude exited ${code}: ${err.slice(0, 300)}`))
    })
    child.stdin.end(payload)
  })
