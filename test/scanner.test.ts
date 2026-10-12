import { describe, expect, it } from 'vitest'
import { redact, scanText } from '../lib/scan/scanner.ts'

// Fixtures are assembled at runtime so this public file never contains a real-looking secret,
// email or phone number itself (GitHub push protection and our own pre-commit scan would stop it).
const rep = (s: string, n: number) => s.repeat(Math.ceil(n / s.length)).slice(0, n)
const kinds = (text: string, deny: string[] = []) => scanText(text, deny).map((f) => f.kind)

describe('scanText flags', () => {
  it('a GitHub token', () => expect(kinds(`token ${'gh'}p_${rep('aB3dE5fG7h', 36)}`)).toContain('secret'))
  it('an Anthropic key', () =>
    expect(kinds(`${'sk-'}ant-api03-${rep('Qw9_eR7-tY5u', 40)}`)).toContain('secret'))
  it('an AWS access key', () => expect(kinds(`${'AK'}IA${rep('Q7ZK2M4P', 16)}`)).toContain('secret'))
  it('a Telegram bot token', () =>
    expect(kinds(`${'1234'}56789:AA${rep('hX3kP9qL2mZ7_', 33)}`)).toContain('secret'))
  it('a private key block', () =>
    expect(kinds(`-----BEGIN ${'OPENSSH'} PRIVATE KEY-----\nabc`)).toContain('secret'))
  it('a JWT', () =>
    expect(
      kinds(`${'eyJ'}hbGciOiJIUzI1NiJ9.${'eyJ'}zdWIiOiIxMjM0NTY3ODkwIn0.${rep('dBjftJeZ4CVP', 43)}`),
    ).toContain('secret'))
  it('a high-entropy value next to "key"', () =>
    expect(kinds(`api_key = "${'Zx9Qp2Lm7Rt4Vb8Nc1Hs6Jd3Kf5Gw0Ye'}"`)).toContain('secret'))
  it('an email address', () =>
    expect(kinds(`mail me: ${['ilie', 'example.com'].join('@')}`)).toEqual(['email']))
  it('an international phone number', () => expect(kinds(`call ${'+373'} 69 123 456`)).toEqual(['phone']))
  it('a local phone number', () => expect(kinds(`call ${'069'}123456 today`)).toEqual(['phone']))
  it('an IPv4 address', () => expect(kinds(`server ${[203, 0, 113, 7].join('.')}`)).toEqual(['ip']))
  it('an IBAN', () => expect(kinds(`${'GB82'}WEST12345698765432`)).toEqual(['iban']))
  it('a card number that passes Luhn', () => expect(kinds(`${'4111'} 1111 1111 1111`)).toEqual(['card']))
  it('denylist terms ignoring case and separators', () => {
    expect(kinds('worked at acme-corp', ['Acme Corp'])).toEqual(['denylist'])
    expect(kinds('ACMECORP', ['Acme Corp'])).toEqual(['denylist'])
  })
  it('denylist terms ignoring diacritics', () =>
    expect(kinds('drive to cimislia', ['Cimișlia'])).toEqual(['denylist']))
})

describe('scanText lets through', () => {
  it('a card-like number that fails Luhn', () => expect(kinds(`${'4111'} 1111 1111 1112`)).toEqual([]))
  it('ordinary text with dates, versions, prices, links and ranges', () => {
    const text =
      'On 2026-10-12 I shipped v0.1.1 for €19, see https://iliev-blnk.github.io/garden/ — MAE 1.39 vs 1.90 min, camp 4–9.01.2027, 10:00 UTC, 1080×1350, 40 seats, 668 MW, 12/12 tests'
    expect(kinds(text)).toEqual([])
  })
  it('loopback and private addresses', () =>
    expect(kinds('preview at http://127.0.0.1:4400/after-dark/ or 192.168.1.20, bind 0.0.0.0')).toEqual([]))
  it('Romanian and Cyrillic text', () =>
    expect(kinds('Fii lumina, iarna asta. Будь светом, этой зимой.')).toEqual([]))
})

describe('redact', () => {
  it('keeps the first two characters', () => expect(redact('secret-value')).toBe('se••••••••••'))
})

it('reports where the match starts', () => {
  const text = `x ${['a', 'b.co'].join('@')}`
  expect(scanText(text, [])[0]).toMatchObject({ kind: 'email', index: 2, redacted: 'a@••••' })
})
