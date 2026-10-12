import exifr from 'exifr'
import type { Finding } from './scanner.ts'

export async function scanImage(buf: Buffer): Promise<Finding[]> {
  const tags = await exifr
    .parse(buf, { gps: true, pick: ['GPSLatitude', 'GPSLongitude'] })
    .catch(() => undefined)
  if (tags?.GPSLatitude || tags?.GPSLongitude) return [{ kind: 'gps', index: 0, redacted: 'GPS••••' }]
  return []
}
