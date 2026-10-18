// Fails the build when the built site contains an audit page. `docs/audit/` is an internal review
// kept next to the site source; `srcExclude: ['audit/**']` in the VitePress config keeps it out of
// dist/, and this check makes a regression (a changed srcExclude, a moved file) impossible to miss.
//
// Usage: node scripts/check-dist-no-audit.mjs [distDir]
import { readdirSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

/** Returns the paths (relative to `dist`) of anything that looks like an audit page. */
export function findAuditPages(dist) {
  const found = []
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name)
      const rel = relative(dist, p).split(sep).join('/')
      if (/(^|[-_.])audit([-_.]|$)/i.test(entry.name)) found.push(rel)
      else if (entry.isDirectory()) walk(p)
    }
  }
  walk(dist)
  return found
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const dist = resolve(process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..', 'dist'))
  const found = findAuditPages(dist)
  if (found.length) {
    console.error('dist check: audit material in the built site:')
    for (const f of found) console.error(`  ${f}`)
    process.exit(1)
  }
  console.log('dist check: no audit page in the built site.')
}
