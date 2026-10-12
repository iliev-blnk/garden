import { toLatin } from './translit.ts'

export function slugify(title: string): string {
  return [...title]
    .map(toLatin)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
