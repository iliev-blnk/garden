import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { scanImage } from '../lib/scan/image.ts'
import { processPhoto } from '../lib/telegram/photo.ts'
import { jpeg } from './helpers/images.ts'

describe('processPhoto', () => {
  it('scales the long edge down to 2000 px and writes WebP with no GPS', async () => {
    const { webp } = await processPhoto(
      await jpeg({ gps: true, camera: true, width: 4000, height: 3000 }),
      true,
    )
    const meta = await sharp(webp).metadata()
    expect([meta.format, meta.width, meta.height]).toEqual(['webp', 2000, 1500])
    expect(meta.exif).toBeUndefined()
    expect(await scanImage(webp)).toEqual([])
  })

  it('does not enlarge small photos', async () => {
    const { webp } = await processPhoto(await jpeg({ width: 640, height: 480 }), false)
    expect((await sharp(webp).metadata()).width).toBe(640)
  })

  it('reads the camera line only when the photo was sent as a file', async () => {
    const original = await jpeg({ camera: true })
    expect((await processPhoto(original, true)).camera).toBe('Fujifilm X-T30 · 23mm · f/2 · 1/250 · ISO 400')
    expect((await processPhoto(original, false)).camera).toBeUndefined()
  })

  it('has no camera line when the file carries no camera data', async () => {
    expect((await processPhoto(await jpeg(), true)).camera).toBeUndefined()
  })
})
