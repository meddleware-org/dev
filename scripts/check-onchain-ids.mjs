// Build-time drift check for the on-chain ids typed into the hand-written pages.
//
// The canonical record of a deployment is the generated `deployments` export of the published
// clients (`@meddleware/access-gate-client`, `@meddleware/sealed-storage-client`), which come from the Move
// packages' own `Published.toml`. This site must not carry a second, hand-maintained copy that can
// silently lag a republication, so the build fails when:
//   1. a hand-written page contains a 32-byte `0x…` id that is not a current testnet id of either
//      deployment (a stale or mistyped id), or
//   2. a "Deployed identifiers" reference page lacks one of the ids it is required to show.
//
// Scope of 1: every Markdown page under docs/ except the audit tree (never published) and the
// generated `sui/onchain/` tree (built from the packages themselves). A few non-deployment ids
// (Seal key servers) are allowlisted in OTHER_IDS. Fails closed: if a
// client or its deployments record cannot be read, the check fails instead of passing vacuously.
//
// Usage: node scripts/check-onchain-ids.mjs
import { createRequire } from 'node:module'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ID = /0x[0-9a-fA-F]{64}\b/g

// Pages that must show specific deployment ids (page path under docs/ → required ids by name).
export const REQUIRED = {
  'sui/index.md': ['accessGate.originalId', 'accessGate.platformConfigId', 'sealPolicies.originalId', 'sealPolicies.policyConfigId'],
}

// 32-byte ids that are not package deployments but are typed into a sample on purpose: the Seal
// testnet key-server object ids (the same defaults `sealed-storage-ui` uses). Keep each with its reason.
export const OTHER_IDS = new Set([
  '0xb012378c9f3799fb5b1a7083da74a4069e3c3f1c93de0b27212a5799ce1e1e98', // Mysten testnet committee (aggregator)
  '0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75', // independent testnet key server
  '0xf5d14a81a982144ae441cd7d64b09027f116a468bd36e7eca494f750591623c8', // independent testnet key server
])

// The clients ship TypeScript source (no JS build) and Node does not strip types inside
// node_modules, so transpile the (import-free, generated) deployments file and import the result.
async function loadTsModule(file) {
  const out = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText
  return import(`data:text/javascript;base64,${Buffer.from(out).toString('base64')}`)
}

/** Reads the current deployments out of the installed clients. */
export async function loadDeployments(resolveFrom = root) {
  const require = createRequire(join(resolveFrom, 'package.json'))
  const gate = await loadTsModule(require.resolve('@meddleware/access-gate-client/deployments'))
  const seal = await loadTsModule(require.resolve('@meddleware/sealed-storage-client/deployments'))
  const testnetGate = gate.ACCESS_GATE_DEPLOYMENTS?.testnet
  const testnetSeal = seal.SEAL_POLICIES_DEPLOYMENTS?.testnet
  if (!testnetGate || !testnetSeal) throw new Error('a client exports no testnet deployment')
  return { accessGate: testnetGate, sealPolicies: testnetSeal }
}

function* markdownFiles(dir, base) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name)
    const rel = relative(base, p).split(sep).join('/')
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.vitepress' || entry.name === 'audit' || rel === 'sui/onchain') continue
      yield* markdownFiles(p, base)
    } else if (entry.name.endsWith('.md')) {
      yield [rel, p]
    }
  }
}

const lookup = (deployments, name) => name.split('.').reduce((o, k) => o?.[k], deployments)

/** Returns a list of problems (empty when the pages agree with the deployments). */
export function checkOnchainIds({ docsRoot, deployments, required = REQUIRED, otherIds = OTHER_IDS }) {
  const known = new Set(otherIds)
  for (const group of Object.values(deployments)) {
    for (const v of Object.values(group)) if (typeof v === 'string' && /^0x[0-9a-f]{64}$/.test(v)) known.add(v)
  }
  const problems = []
  const pages = new Map()
  for (const [rel, file] of markdownFiles(docsRoot, docsRoot)) pages.set(rel, readFileSync(file, 'utf8'))
  for (const [rel, text] of pages) {
    for (const id of new Set(text.match(ID) ?? [])) {
      if (!known.has(id.toLowerCase())) problems.push(`${rel}: ${id} is not a current deployment id (stale or mistyped)`)
    }
  }
  for (const [rel, names] of Object.entries(required)) {
    const text = pages.get(rel)
    if (text === undefined) {
      problems.push(`${rel}: required reference page not found`)
      continue
    }
    for (const name of names) {
      const id = lookup(deployments, name)
      if (typeof id !== 'string') problems.push(`${rel}: deployments record has no ${name}`)
      else if (!text.includes(id)) problems.push(`${rel}: does not show ${name} (${id})`)
    }
  }
  return problems
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  let problems
  try {
    problems = checkOnchainIds({ docsRoot: join(root, 'docs'), deployments: await loadDeployments() })
  } catch (err) {
    console.error(`check-onchain-ids: cannot read the clients' deployments: ${err.message}`)
    process.exit(1)
  }
  if (problems.length) {
    console.error('check-onchain-ids: reference pages drifted from the clients\' deployments:')
    for (const p of problems) console.error(`  ${p}`)
    console.error('Edit the page to the id in @meddleware/access-gate-client / sealed-storage-client `deployments`.')
    process.exit(1)
  }
  console.log('check-onchain-ids: every on-chain id in the reference pages matches the clients\' deployments.')
}
