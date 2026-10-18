import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { checkOnchainIds, loadDeployments, OTHER_IDS, REQUIRED } from '../scripts/check-onchain-ids.mjs'

const hex = (c) => `0x${c.repeat(64)}`
const deployments = {
  accessGate: { originalId: hex('a'), publishedAt: hex('a'), platformConfigId: hex('b') },
  sealPolicies: { originalId: hex('c'), publishedAt: hex('c'), policyConfigId: hex('d') },
}

let docsRoot
const write = (rel, text) => {
  mkdirSync(dirname(join(docsRoot, rel)), { recursive: true })
  writeFileSync(join(docsRoot, rel), text)
}
const goodPages = () => {
  write('sui/index.md', `| a | \`${hex('a')}\` | b \`${hex('b')}\` |\n| c | \`${hex('c')}\` | d \`${hex('d')}\` |\n`)
}

beforeEach(() => {
  docsRoot = mkdtempSync(join(tmpdir(), 'onchain-ids-'))
})
afterEach(() => rmSync(docsRoot, { recursive: true, force: true }))

describe('checkOnchainIds', () => {
  it('passes when the reference page shows the current ids', () => {
    goodPages()
    expect(checkOnchainIds({ docsRoot, deployments })).toEqual([])
  })

  it('fails on a superseded id in the reference page', () => {
    goodPages()
    write('sui/index.md', `${hex('e')} ${hex('b')} ${hex('c')} ${hex('d')}`)
    const problems = checkOnchainIds({ docsRoot, deployments })
    expect(problems.some((p) => p.includes('sui/index.md') && p.includes('not a current deployment id'))).toBe(true)
    expect(problems.some((p) => p.includes('does not show accessGate.originalId'))).toBe(true)
  })

  it('fails when a required id is missing', () => {
    goodPages()
    write('sui/index.md', `${hex('a')} ${hex('b')} ${hex('c')}`)
    expect(checkOnchainIds({ docsRoot, deployments })).toEqual([
      expect.stringContaining('does not show sealPolicies.policyConfigId'),
    ])
  })

  it('fails on a stale id in any hand-written page, case-insensitively', () => {
    goodPages()
    write('sui/guide.md', `see 0x${'E'.repeat(64)}`)
    expect(checkOnchainIds({ docsRoot, deployments })).toEqual([expect.stringContaining('guide.md')])
  })

  it('ignores the audit tree and the generated onchain tree', () => {
    goodPages()
    write('audit/a-audit.md', hex('f'))
    write('sui/onchain/access-gate/overview.md', hex('f'))
    expect(checkOnchainIds({ docsRoot, deployments })).toEqual([])
  })

  it('allows the listed key-server ids and nothing else off-list', () => {
    goodPages()
    const [keyServer] = OTHER_IDS
    write('sui/seal.md', keyServer)
    expect(checkOnchainIds({ docsRoot, deployments })).toEqual([])
    write('sui/seal.md', keyServer.replace(/.$/, '0'))
    expect(checkOnchainIds({ docsRoot, deployments })).toEqual([expect.stringContaining('seal.md')])
  })

  it('does not treat short hex literals as ids', () => {
    goodPages()
    write('sui/short.md', 'type 0x2::sui::SUI and 0xd7ddaa94…')
    expect(checkOnchainIds({ docsRoot, deployments })).toEqual([])
  })

  it('reports a missing reference page', () => {
    expect(checkOnchainIds({ docsRoot, deployments }).filter((p) => p.includes('not found'))).toHaveLength(Object.keys(REQUIRED).length)
  })
})

describe('against the installed clients and the real pages', () => {
  it('reads testnet deployments from both clients', async () => {
    const d = await loadDeployments()
    for (const id of [d.accessGate.originalId, d.accessGate.platformConfigId, d.sealPolicies.originalId, d.sealPolicies.policyConfigId]) {
      expect(id).toMatch(/^0x[0-9a-f]{64}$/)
    }
  })

  it('the pages in this repo agree with them', async () => {
    const docs = join(import.meta.dirname, '..', 'docs')
    expect(checkOnchainIds({ docsRoot: docs, deployments: await loadDeployments() })).toEqual([])
  })
})
