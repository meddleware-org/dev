// Build-time import of the CANONICAL on-chain docs that live inside each Sui Move package repo
// (`<package>/docs/onchain/*.md` + `manifest.json`). This site is a consumer of that content, never
// its source of truth: pages are copied fresh on every build into a git-ignored subtree, and the
// sidebar is generated from the packages' manifests.
//
// Resolution (no network, no hidden runtime dependency — everything comes from explicit inputs):
//  - default: the installed npm package (`node_modules/<pkg>`, resolved via `<pkg>/package.json`);
//  - override: ONCHAIN_DOCS_ROOT=<dir> reads `<dir>/<repoDir>/docs/onchain` instead (e.g. `..` to
//    preview unpublished changes from sibling checkouts in the workspace).
//
// Link handling: a link to another manifest page stays relative when that page is published on this
// site, and becomes an absolute URL on the other site otherwise; any other relative link (a repo
// file such as SECURITY.md) becomes a GitHub URL. So imported pages never produce dead links.
//
// Fails soft (like gen:api): a missing package or manifest writes a placeholder page and a warning;
// the script always exits 0 so the site still builds. Keep this file identical in the docs. and dev.
// repos except for the SITE block below.
import { createRequire } from 'node:module'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, posix, resolve } from 'node:path'

// ── SITE (the only per-repo difference) ───────────────────────────────────────────────────────
const SITE = 'dev'
const OUT_BASE = 'sui/onchain' // under docs/, served at /sui/onchain/…
const OTHER_SITE = { id: 'docs', origin: 'https://docs.meddleware.co.uk', base: 'blockchain/sui/onchain' }
// ───────────────────────────────────────────────────────────────────────────────────────────────

// Sui/Move packages whose on-chain docs are canonical in their own repo. `slug`/`title` are only
// fallbacks for the placeholder when the package (and so its manifest) is unavailable.
const PACKAGES = [
  { pkg: '@meddleware/access-gate-sui', repoDir: 'access-gate-sui', slug: 'access-gate', title: 'Access Gate' },
  { pkg: '@meddleware/seal-policies-sui', repoDir: 'seal-policies-sui', slug: 'sealed-storage', title: 'Sealed Storage policies' },
  { pkg: '@meddleware/sui-token-template', repoDir: 'sui-token-template', slug: 'token-deployer', title: 'Token Deployer' },
]

const require = createRequire(import.meta.url)
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const docsRoot = join(root, 'docs')
const outRoot = join(docsRoot, OUT_BASE)
const sidebarFile = join(docsRoot, '.vitepress', 'generated', 'onchain-sidebar.json')

function sourceDir({ pkg, repoDir }) {
  const override = process.env.ONCHAIN_DOCS_ROOT
  if (override) return join(resolve(root, override), repoDir, 'docs', 'onchain')
  try {
    return join(dirname(require.resolve(`${pkg}/package.json`)), 'docs', 'onchain')
  } catch {
    return null
  }
}

const stem = (file) => file.replace(/\.md$/, '')

// Rewrite relative Markdown links: `[text](target)` / `[text](target#anchor)`.
function rewriteLinks(md, manifest) {
  const pages = new Map(manifest.pages.map((p) => [p.file, p]))
  return md.replace(/\]\((?!https?:|mailto:|#|\/)([^)\s#]+)(#[^)\s]*)?\)/g, (all, target, anchor = '') => {
    const normal = posix.normalize(target)
    const page = pages.get(posix.basename(normal))
    if (page && !normal.startsWith('..')) {
      if (page.sites.includes(SITE)) return `](./${stem(page.file)}${anchor})`
      return `](${OTHER_SITE.origin}/${OTHER_SITE.base}/${manifest.slug}/${stem(page.file)}${anchor})`
    }
    // Any other relative link points at a file in the package repo (relative to docs/onchain/).
    const repoPath = posix.normalize(posix.join('docs/onchain', normal))
    return `](${manifest.repository}/blob/main/${repoPath}${anchor})`
  })
}

function sourceFooter(manifest, page) {
  return (
    `\n\n---\n\n<small>Canonical source: [\`${manifest.package}\` → \`docs/onchain/${page.file}\`]` +
    `(${manifest.repository}/blob/main/docs/onchain/${page.file}) — maintained with the Move package; ` +
    `edit it there, not on this site.</small>\n`
  )
}

// Standard page names every manifest uses; placeholders are written for all of them so hand-written
// pages on either site can link to them without risking a dead link in a build without the package.
const STANDARD_PAGES = ['overview', 'user-guide', 'dev-guide', 'api-reference']

function placeholder(entry, why) {
  const dir = join(outRoot, entry.slug)
  mkdirSync(dir, { recursive: true })
  for (const name of STANDARD_PAGES) {
    writeFileSync(
      join(dir, `${name}.md`),
      `# ${entry.title} — on-chain docs\n\n::: warning On-chain documentation not available in this build\n` +
        `\`${entry.pkg}\` could not be loaded (${why}). Install it (or set \`ONCHAIN_DOCS_ROOT\`) and ` +
        `rebuild.\n:::\n`,
    )
  }
  return { text: `${entry.title} (on-chain)`, collapsed: true, items: [{ text: 'On-chain overview', link: `/${OUT_BASE}/${entry.slug}/overview` }] }
}

rmSync(outRoot, { recursive: true, force: true })
mkdirSync(outRoot, { recursive: true })

const sidebar = []
let failures = 0
for (const entry of PACKAGES) {
  const dir = sourceDir(entry)
  const manifestPath = dir && join(dir, 'manifest.json')
  if (!manifestPath || !existsSync(manifestPath)) {
    failures++
    const why = dir ? 'no docs/onchain/manifest.json in the resolved package' : 'package not installed'
    console.warn(`[gen:onchain] ${entry.pkg}: ${why} — writing placeholder.`)
    sidebar.push(placeholder(entry, why))
    continue
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  const pages = manifest.pages.filter((p) => p.sites.includes(SITE))
  const outDir = join(outRoot, manifest.slug)
  mkdirSync(outDir, { recursive: true })
  const items = []
  for (const page of pages) {
    const src = join(dir, page.file)
    if (!existsSync(src)) {
      failures++
      console.warn(`[gen:onchain] ${entry.pkg}: missing ${page.file} — skipped.`)
      continue
    }
    const md = rewriteLinks(readFileSync(src, 'utf8'), manifest) + sourceFooter(manifest, page)
    writeFileSync(join(outDir, page.file), md)
    items.push({ text: page.title, link: `/${OUT_BASE}/${manifest.slug}/${stem(page.file)}` })
  }
  if (!items.length) {
    sidebar.push(placeholder(entry, 'manifest lists no pages for this site'))
    continue
  }
  sidebar.push({ text: `${manifest.title} (on-chain)`, collapsed: true, items })
  console.log(`[gen:onchain] ${manifest.package}: ${items.length} page(s) → docs/${OUT_BASE}/${manifest.slug}`)
}

mkdirSync(dirname(sidebarFile), { recursive: true })
writeFileSync(sidebarFile, JSON.stringify(sidebar, null, 2) + '\n')
if (failures) console.warn(`[gen:onchain] completed with ${failures} placeholder(s)/gap(s); site still builds.`)
