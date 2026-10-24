// Writes dist/llms-full.txt (llmstxt.org): every published page's Markdown source in one file, so agents
// and IDE tools can read the whole site in one request. Runs after `vitepress build`; audit pages (srcExclude)
// and generated API pages are left out, exactly as the site leaves out the audit.
//
//   node scripts/gen-llms-full.mjs <site-url> "<site title>"
import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const [siteUrl, title] = process.argv.slice(2)
if (!siteUrl || !title) throw new Error('usage: gen-llms-full.mjs <site-url> "<site title>"')
const root = 'docs'
const skip = (rel) => rel.startsWith('audit/') || rel.startsWith('.vitepress/') || rel.startsWith('public/') || /(^|\/)(api|wire-api)\//.test(rel)

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? walk(path) : name.endsWith('.md') ? [path] : []
  })
}

const pages = walk(root)
  .map((p) => relative(root, p).split(sep).join('/'))
  .filter((rel) => !skip(rel))
  .sort((a, b) => (a === 'index.md' ? -1 : b === 'index.md' ? 1 : a.localeCompare(b)))

const url = (rel) => siteUrl.replace(/\/$/, '') + '/' + rel.replace(/(^|\/)index\.md$/, '$1').replace(/\.md$/, '')
const body = (rel) => readFileSync(join(root, rel), 'utf8').replace(/^---\n[\s\S]*?\n---\n/, '').trim()

const out = [`# ${title}`, '', `> The full text of ${siteUrl}, one section per page.`, '']
for (const rel of pages) out.push(`---`, '', `Source: ${url(rel)}`, '', body(rel), '')
if (!existsSync('dist')) throw new Error('dist/ is missing: run vitepress build first')
writeFileSync('dist/llms-full.txt', out.join('\n'))
console.log(`llms-full.txt: ${pages.length} pages`)
