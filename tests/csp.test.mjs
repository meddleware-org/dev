import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// The Content-Security-Policy the image serves is the `ARG CSP` default of the Dockerfile. This site is
// static: its local search and footer load only same-origin files, so it may connect nowhere else
// (checked with a headless browser probe on 2026-10-22, audit F19 / F13; see the audit).
const dockerfile = readFileSync(new URL('../Dockerfile', import.meta.url), 'utf8')
const csp = /^ARG CSP="([^"]+)"$/m.exec(dockerfile)?.[1] ?? ''
const directive = (name) =>
  csp
    .split(';')
    .map((d) => d.trim())
    .find((d) => d === name || d.startsWith(`${name} `))

describe('Content-Security-Policy of the image', () => {
  it('has a policy at all', () => {
    expect(csp).not.toBe('')
  })

  it('lets the page connect to its own origin only', () => {
    expect(directive('connect-src')).toBe("connect-src 'self'")
  })

  it('keeps the other restrictive directives', () => {
    expect(directive('default-src')).toBe("default-src 'self'")
    expect(directive('object-src')).toBe("object-src 'none'")
    expect(directive('base-uri')).toBe("base-uri 'self'")
    expect(directive('frame-ancestors')).toBe("frame-ancestors 'self'")
    expect(directive('script-src')).toMatch(/^script-src 'self'( 'sha256-[A-Za-z0-9+/=]+')+$/)
  })
})
