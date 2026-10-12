import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { expandPaths, scanPaths, scanStaged } from '../lib/scan/repo.ts'
import { jpeg } from './helpers/images.ts'

const email = ['someone', 'example.org'].join('@')

function tempRepo() {
  const dir = mkdtempSync(join(tmpdir(), 'garden-scan-'))
  execFileSync('git', ['init', '-q', dir])
  return dir
}

describe('scanPaths', () => {
  it('reports only the files with findings', async () => {
    const dir = tempRepo()
    writeFileSync(join(dir, 'dirty.md'), `write to ${email}`)
    writeFileSync(join(dir, 'clean.md'), 'nothing here')
    const result = await scanPaths([join(dir, 'dirty.md'), join(dir, 'clean.md')], [])
    expect(result).toEqual([
      { path: join(dir, 'dirty.md'), findings: [expect.objectContaining({ kind: 'email' })] },
    ])
  })
  it('scans images for GPS', async () => {
    const dir = tempRepo()
    writeFileSync(join(dir, 'p.jpg'), await jpeg({ gps: true }))
    const [hit] = await scanPaths([join(dir, 'p.jpg')], [])
    expect(hit.findings[0].kind).toBe('gps')
  })
})

describe('expandPaths', () => {
  it('walks directories recursively and skips missing ones', () => {
    const dir = tempRepo()
    mkdirSync(join(dir, 'notes/sub'), { recursive: true })
    writeFileSync(join(dir, 'notes/a.md'), '')
    writeFileSync(join(dir, 'notes/sub/b.md'), '')
    expect(expandPaths([join(dir, 'notes'), join(dir, 'missing')]).sort()).toEqual([
      join(dir, 'notes/a.md'),
      join(dir, 'notes/sub/b.md'),
    ])
  })
})

describe('scanStaged', () => {
  it('scans the staged content, not the working tree', async () => {
    const dir = tempRepo()
    writeFileSync(join(dir, 'n.md'), `contact ${email}`)
    execFileSync('git', ['add', 'n.md'], { cwd: dir })
    writeFileSync(join(dir, 'n.md'), 'cleaned in the working tree but not staged')
    const result = await scanStaged(dir, [])
    expect(result.map((r) => r.path)).toEqual(['n.md'])
  })
})
