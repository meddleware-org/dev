// Fails the build when dist/ contains an inline <script> whose sha256 is not allowed by the CSP's
// script-src. VitePress inlines a couple of small scripts (appearance/theme bootstrap); the image
// serves a hash-based CSP, so a VitePress upgrade that changes them must update the Dockerfile's
// CSP ARG in the same change — this check makes that impossible to miss.
//
// Usage: node scripts/check-csp-inline.mjs "<csp>" [distDir]
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const [csp, dist = 'dist'] = process.argv.slice(2)
if (!csp) {
  console.error('usage: check-csp-inline.mjs "<csp>" [distDir]')
  process.exit(2)
}
const scriptSrc = (csp.split(';').map((d) => d.trim()).find((d) => d.startsWith('script-src ')) ?? '').split(/\s+/)
const allowed = new Set(scriptSrc.filter((t) => t.startsWith("'sha256-")).map((t) => t.slice(1, -1)))

function* htmlFiles(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) yield* htmlFiles(p)
    else if (name.endsWith('.html')) yield p
  }
}

const missing = new Map()
let files = 0
for (const file of htmlFiles(dist)) {
  files++
  const html = readFileSync(file, 'utf8')
  for (const m of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)) {
    if (!m[1].trim()) continue
    const hash = 'sha256-' + createHash('sha256').update(m[1]).digest('base64')
    if (!allowed.has(hash)) missing.set(hash, file)
  }
}
if (missing.size) {
  console.error(`CSP check: ${missing.size} inline script(s) not allowed by script-src:`)
  for (const [hash, file] of missing) console.error(`  '${hash}'  (first seen in ${file})`)
  process.exit(1)
}
console.log(`CSP check: every inline script in ${files} HTML file(s) is allowed by script-src.`)
