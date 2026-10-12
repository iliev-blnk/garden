import { defineCollection } from 'astro:content'
import { glob } from 'astro/loaders'
import { z } from 'astro/zod'
import { STAGES, TOPICS } from '../lib/content/note.ts'

// YAML may turn 2026-10-12 into a Date; keep dates as YYYY-MM-DD strings either way.
const day = z
  .union([z.string(), z.date()])
  .transform((d) => (typeof d === 'string' ? d : d.toISOString().slice(0, 10)))

const notes = defineCollection({
  loader: glob({ pattern: '*.md', base: './notes' }),
  schema: z.object({
    title: z.string(),
    topics: z.array(z.enum(TOPICS)).min(1),
    stage: z.enum(STAGES),
    planted: day,
    tended: day,
    summary: z.string(),
    rating: z.number().min(0).max(10).optional(),
  }),
})

export const collections = { notes }
