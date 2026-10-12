import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { loadDenylist } from '../lib/scan/denylist.ts'
import { scanImage } from '../lib/scan/image.ts'
import { jpeg } from './helpers/images.ts'

describe('scanImage', () => {
  it('flags GPS EXIF', async () => {
    expect((await scanImage(await jpeg({ gps: true }))).map((f) => f.kind)).toEqual(['gps'])
  })
  it('lets a photo with camera EXIF but no GPS through', async () => {
    expect(await scanImage(await jpeg({ camera: true }))).toEqual([])
  })
})

describe('loadDenylist', () => {
  it('reads newline-separated terms from GARDEN_DENYLIST, dropping blanks and whitespace', () => {
    expect(loadDenylist({ GARDEN_DENYLIST: 'a\n\n b \r\nc' }, '/nonexistent')).toEqual(['a', 'b', 'c'])
  })
  it('falls back to the local file, ignoring # comments', () => {
    const file = join(mkdtempSync(join(tmpdir(), 'deny-')), 'denylist.txt')
    writeFileSync(file, '# work\nAcme Corp\n\nWidgetco\n')
    expect(loadDenylist({}, file)).toEqual(['Acme Corp', 'Widgetco'])
  })
  it('refuses to run without a denylist in CI', () => {
    expect(() => loadDenylist({ CI: 'true' }, '/nonexistent/denylist.txt')).toThrow(/GARDEN_DENYLIST/)
    expect(() => loadDenylist({ CI: 'true', GARDEN_DENYLIST: '' }, '/nonexistent/denylist.txt')).toThrow(
      /GARDEN_DENYLIST/,
    )
  })
  it('returns an empty list when neither exists', () => {
    expect(loadDenylist({}, '/nonexistent/denylist.txt')).toEqual([])
  })
})
