import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { BundleProfile } from 'dsh-shared-meta'
import type { ScanResult } from '../src/scan.ts'
import { recordCheckup, readHistory } from '../src/history.ts'

const originalHome = process.env.DSH_HOME
let home = ''

beforeEach(async () => {
  home = await mkdtemp(join(tmpdir(), 'dsh-history-'))
  process.env.DSH_HOME = home
})

afterEach(async () => {
  if (originalHome === undefined) delete process.env.DSH_HOME
  else process.env.DSH_HOME = originalHome
  await rm(home, { recursive: true, force: true })
})

function bundle(name: string, enabled = true, contextTokens = 0): BundleProfile {
  return {
    name,
    version: '1.0.0',
    enabled,
    installed: true,
    availability: 'profile',
    official: false,
    optional: false,
    removable: true,
    guardStatus: 'ok',
    rowModuleNames: [name],
    contextTokens,
    usage: { calls: 0, successes: 0, sessionCalls: 0 },
    protected: false,
    findings: [],
  }
}

function scan(input: { attributed?: number; bundles?: BundleProfile[]; owners?: Record<string, number> } = {}): ScanResult {
  const attributed = input.attributed ?? 1000
  return {
    managementAvailable: true,
    compat: {
      summary: { error: 0, warn: 0, info: 0, byDomain: { 'plugin-plugin': 0, 'plugin-runtime': 0, profile: 0, workspace: 0 } },
      topFindings: [],
    },
    bundles: input.bundles ?? [bundle('a')],
    entries: [],
    context: {
      totalTokens: attributed + 200,
      budget: 0,
      byOwner: input.owners ?? { a: attributed, unattributed: 200 },
      sections: [],
      tools: [],
      unattributedTokens: 200,
    },
    presetModules: [],
    usage: { byTool: {}, byOwner: {} },
    dedupe: [],
    diagnostics: [],
  }
}

describe('checkup history', () => {
  it('records the first snapshot without a diff and throttles the second', async () => {
    const first = await recordCheckup({ profile: 'web', scan: scan(), now: 1_000_000 })
    expect(first.skipped).toBe(false)
    expect(first.diff).toBeUndefined()
    expect(first.records).toHaveLength(1)

    const second = await recordCheckup({ profile: 'web', scan: scan({ attributed: 800 }), now: 1_000_100 })
    expect(second.skipped).toBe(true)
    expect(second.records).toHaveLength(1)
  })

  it('records a forced snapshot and reports plugin/token deltas', async () => {
    await recordCheckup({ profile: 'web', scan: scan({ bundles: [bundle('a')] }), now: 1_000_000 })
    const next = await recordCheckup({
      profile: 'web',
      scan: scan({ attributed: 700, bundles: [bundle('a'), bundle('b')] }),
      force: true,
      now: 2_000_000,
    })
    expect(next.records).toHaveLength(2)
    expect(next.diff?.addedBundles).toEqual(['b'])
    expect(next.diff?.attributedDelta).toBe(-300)
    expect(next.diff?.totalDelta).toBe(-300)
  })

  it('reports the marginal cost and capability of newly added plugins', async () => {
    const firstScan = scan({ bundles: [bundle('a')] })
    await recordCheckup({ profile: 'web', scan: firstScan, capability: { groups: [{ id: 'shell', count: 0 }] }, now: 1_000_000 })
    const nextScan = scan({ bundles: [bundle('a'), bundle('b', true, 300)] })
    const next = await recordCheckup({
      profile: 'web',
      scan: nextScan,
      capability: { groups: [{ id: 'shell', count: 2 }] },
      force: true,
      now: 2_000_000,
    })
    expect(next.diff?.newBundleCosts).toEqual([{ name: 'b', tokens: 300 }])
    expect(next.diff?.newCapabilities).toEqual([{ id: 'shell', delta: 2 }])
  })

  it('reports removed plugins', async () => {
    await recordCheckup({ profile: 'web', scan: scan({ bundles: [bundle('a'), bundle('b')] }), now: 1_000_000 })
    const next = await recordCheckup({
      profile: 'web',
      scan: scan({ bundles: [bundle('a')] }),
      force: true,
      now: 2_000_000,
    })
    expect(next.diff?.removedBundles).toEqual(['b'])
  })

  it('caps stored records at 60', async () => {
    for (let index = 0; index < 65; index++) {
      await recordCheckup({ profile: 'web', scan: scan({ attributed: 1000 + index }), force: true, now: 1_000_000 + index * 1000 })
    }
    const state = await readHistory('web')
    expect(state.records).toHaveLength(60)
  })
})
