import sharp from 'sharp'

/** A small JPEG; with `gps` it carries GPS EXIF tags, built at runtime so no fixture file holds coordinates. */
export async function jpeg(opts: { gps?: boolean; width?: number; height?: number; camera?: boolean } = {}) {
  const { width = 64, height = 48 } = opts
  let img = sharp({ create: { width, height, channels: 3, background: { r: 30, g: 40, b: 90 } } }).jpeg()
  const exif: Record<string, Record<string, string>> = {}
  if (opts.camera) {
    exif.IFD0 = { Make: 'FUJIFILM', Model: 'X-T30' }
    exif.IFD2 = { FNumber: '2/1', ExposureTime: '1/250', ISOSpeedRatings: '400', FocalLength: '23/1' }
  }
  if (opts.gps)
    exif.IFD3 = {
      GPSLatitudeRef: 'N',
      GPSLatitude: '46/1 37/1 0/1',
      GPSLongitudeRef: 'E',
      GPSLongitude: '28/1 46/1 0/1',
    }
  if (Object.keys(exif).length) img = img.withExif(exif)
  return img.toBuffer()
}
