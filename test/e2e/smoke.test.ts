import { existsSync, readFileSync, statSync } from 'node:fs'
import { createServer, type Server } from 'node:http'
import { extname, join } from 'node:path'
import { type Browser, chromium, type Page } from 'playwright-core'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

// Local only: needs `pnpm build` first and a Chromium (PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium).
const PORT = 4419
const ROOT = `http://localhost:${PORT}/garden/`
let server: Server
let browser: Browser

async function page(width = 1200, colorScheme: 'light' | 'dark' = 'light'): Promise<Page> {
  const ctx = await browser.newContext({ viewport: { width, height: 900 }, colorScheme })
  return ctx.newPage()
}

const TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.webp': 'image/webp',
  '.xml': 'application/xml',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
}

/** Serves dist/ under /garden/ the way GitHub Pages does. */
function serveDist(): Server {
  return createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url!, ROOT).pathname)
    if (!path.startsWith('/garden/')) return void res.writeHead(404).end()
    let file = join('dist', path.slice('/garden/'.length))
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html')
    if (!existsSync(file)) return void res.writeHead(404).end()
    res
      .writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' })
      .end(readFileSync(file))
  })
}

beforeAll(async () => {
  server = serveDist()
  await new Promise<void>((r) => server.listen(PORT, r))
  browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ?? '/usr/bin/chromium',
  })
})

afterAll(async () => {
  await browser?.close()
  server?.close()
})

describe('the garden', () => {
  it('shows the plot and "lately" on the home page', async () => {
    const p = await page()
    await p.goto(ROOT)
    await expect(p.getByRole('heading', { name: 'Lately' }).isVisible()).resolves.toBe(true)
    expect(await p.locator('.plant').count()).toBeGreaterThan(0)
  })

  it('shows "linked from" on a note that other notes link to, and search finds it', async () => {
    const p = await page()
    await p.goto(ROOT)
    const hrefs = await p
      .locator('.plant a')
      .evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).href))
    let found: { href: string; title: string } | undefined
    for (const href of hrefs) {
      await p.goto(href)
      if (await p.getByText('Linked from', { exact: true }).count()) {
        found = { href, title: (await p.locator('h1').textContent())!.trim() }
        break
      }
    }
    expect(found).toBeDefined()
    await p.goto(`${ROOT}search/`)
    await p.locator('#search input').fill(found!.title)
    await p.locator('.pagefind-ui__result-link').first().waitFor()
    const results = await p
      .locator('.pagefind-ui__result-link')
      .evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).href))
    expect(results.some((r) => r.startsWith(found!.href.replace(/\/$/, '')))).toBe(true)
  })

  it('follows the dark colour scheme', async () => {
    const light = await page(1200, 'light')
    const dark = await page(1200, 'dark')
    await light.goto(ROOT)
    await dark.goto(ROOT)
    const bg = (p: Page) => p.evaluate(() => getComputedStyle(document.body).backgroundColor)
    expect(await bg(light)).not.toBe(await bg(dark))
  })

  it.each(['', 'stream/', 'topics/photography/', 'topics/movies/', 'search/'])(
    'has no horizontal scroll at 375px on /%s',
    async (path) => {
      const p = await page(375)
      await p.goto(ROOT + path)
      expect(await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    },
  )
})
