export type FindingKind = 'secret' | 'email' | 'phone' | 'ip' | 'iban' | 'card' | 'gps' | 'denylist'
export type Finding = { kind: FindingKind; index: number; redacted: string }

export function redact(value: string): string {
  return value.slice(0, 2) + '•'.repeat(Math.max(0, value.length - 2))
}

const SECRET_PATTERNS: RegExp[] = [
  /\bgh[pousr]_[A-Za-z0-9]{36,}/g,
  /\bgithub_pat_[A-Za-z0-9_]{40,}/g,
  /\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{20,}/g,
  /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g,
  /\b\d{8,10}:AA[A-Za-z0-9_-]{30,}/g,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/g,
  /\beyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{10,}/g,
]
const KEYWORD_SECRET = /(?:key|secret|token|passw(?:or)?d|pwd)["']?\s*[:=]\s*["']?([A-Za-z0-9+/_-]{24,})/gi
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g
const IBAN = /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/g
const CARD = /(?<![\w.])\d(?:[ -]?\d){12,18}(?![\w.])/g
const PHONE = /(?<![\w.\-/:])(?:\+\d[\d -]{7,18}\d|0\d(?:[ -]?\d){7,9})(?![\w.\-/:])/g
const IPV4 = /(?<![\w.])(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?![\w.]*\d)/g

function entropy(s: string): number {
  const counts = new Map<string, number>()
  for (const c of s) counts.set(c, (counts.get(c) ?? 0) + 1)
  let h = 0
  for (const n of counts.values()) {
    const p = n / s.length
    h -= p * Math.log2(p)
  }
  return h
}

function luhn(digits: string): boolean {
  let sum = 0
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i])
    if (i % 2 === 1) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
  }
  return sum % 10 === 0
}

function ibanValid(s: string): boolean {
  const moved = s.slice(4) + s.slice(0, 4)
  let rem = 0
  for (const c of moved) {
    const v = Number.parseInt(c, 36)
    rem = Number(`${rem}${v}`) % 97
  }
  return rem === 1
}

function isPublicIp(parts: number[]): boolean {
  if (parts.some((p) => p > 255)) return false
  const [a, b] = parts
  if (a === 0 || a === 10 || a === 127) return false
  if (a === 192 && b === 168) return false
  if (a === 172 && b >= 16 && b <= 31) return false
  if (a === 169 && b === 254) return false
  return true
}

/** Lowercase, strip diacritics, keep only [a-z0-9]; `map[i]` is the original index of normalised char i. */
function normalise(text: string): { norm: string; map: number[] } {
  let norm = ''
  const map: number[] = []
  for (let i = 0; i < text.length; i++) {
    const base = text[i].normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
    for (const c of base) {
      if (/[a-z0-9]/.test(c)) {
        norm += c
        map.push(i)
      }
    }
  }
  return { norm, map }
}

export function scanText(text: string, denylist: string[]): Finding[] {
  const findings: Finding[] = []
  const taken: [number, number][] = []
  const overlaps = (s: number, e: number) => taken.some(([a, b]) => s < b && e > a)
  const add = (kind: FindingKind, index: number, value: string) => {
    if (overlaps(index, index + value.length)) return
    taken.push([index, index + value.length])
    findings.push({ kind, index, redacted: redact(value) })
  }

  for (const re of SECRET_PATTERNS) for (const m of text.matchAll(re)) add('secret', m.index, m[0])
  for (const m of text.matchAll(KEYWORD_SECRET)) {
    const value = m[1]
    if (entropy(value) >= 3.5) add('secret', m.index + m[0].length - value.length, value)
  }
  for (const m of text.matchAll(EMAIL)) add('email', m.index, m[0])
  for (const m of text.matchAll(IBAN)) if (ibanValid(m[0])) add('iban', m.index, m[0])
  for (const m of text.matchAll(CARD)) {
    const digits = m[0].replace(/\D/g, '')
    if (digits.length >= 13 && digits.length <= 19 && luhn(digits)) add('card', m.index, m[0])
  }
  for (const m of text.matchAll(PHONE)) {
    const digits = m[0].replace(/\D/g, '')
    if (digits.length >= 9 && digits.length <= 15) add('phone', m.index, m[0])
  }
  for (const m of text.matchAll(IPV4)) {
    if (isPublicIp(m.slice(1, 5).map(Number))) add('ip', m.index, m[0])
  }

  if (denylist.length) {
    const { norm, map } = normalise(text)
    for (const term of denylist) {
      const t = normalise(term).norm
      if (!t) continue
      let from = 0
      for (let at = norm.indexOf(t, from); at !== -1; at = norm.indexOf(t, from)) {
        const start = map[at]
        const end = map[at + t.length - 1] + 1
        add('denylist', start, text.slice(start, end))
        from = at + t.length
      }
    }
  }

  return findings.sort((a, b) => a.index - b.index)
}
