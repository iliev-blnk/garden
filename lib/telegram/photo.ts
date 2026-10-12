import exifr from 'exifr'
import sharp from 'sharp'

const MAX_EDGE = 2000

function titleCase(s: string): string {
  return s.length > 1 && s === s.toUpperCase() ? s[0] + s.slice(1).toLowerCase() : s
}

function shutter(seconds: number): string {
  return seconds >= 1 ? `${seconds}s` : `1/${Math.round(1 / seconds)}`
}

async function cameraLine(buf: Buffer): Promise<string | undefined> {
  const t = await exifr
    .parse(buf, { pick: ['Make', 'Model', 'FocalLength', 'FNumber', 'ExposureTime', 'ISO'] })
    .catch(() => undefined)
  if (!t?.Model) return undefined
  const make = t.Make ? titleCase(String(t.Make).trim()) : ''
  const model = String(t.Model).trim()
  const body = make && !model.toLowerCase().startsWith(make.toLowerCase()) ? `${make} ${model}` : model
  const parts = [body]
  if (t.FocalLength) parts.push(`${Math.round(t.FocalLength)}mm`)
  if (t.FNumber) parts.push(`f/${t.FNumber}`)
  if (t.ExposureTime) parts.push(shutter(t.ExposureTime))
  if (t.ISO) parts.push(`ISO ${t.ISO}`)
  return parts.join(' · ')
}

/** Upright, at most 2000 px on the long edge, WebP with every bit of metadata removed. */
export async function processPhoto(buf: Buffer, asFile: boolean): Promise<{ webp: Buffer; camera?: string }> {
  const webp = await sharp(buf)
    .rotate()
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer()
  const camera = asFile ? await cameraLine(buf) : undefined
  return camera ? { webp, camera } : { webp }
}
