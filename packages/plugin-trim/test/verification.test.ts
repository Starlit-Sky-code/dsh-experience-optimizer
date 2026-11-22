import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { BundleProfile, PluginProfile } from 'dsh-shared-meta'
import type { ScanResult } from '../src/scan.ts'
import {
  beginVerification,
  clearVerification,
  readVerification,
  settleVerification,
  snapshotOf,
} from '../src/verification.ts'

const originalHome = process.env.DSH_HOME
let home = ''

beforeEach(async () => {
  home = await mkdtemp(join(tmpdir(), 'dsh-verify-'))
  process.env.DSH_HOME = home
})

afterEach(async () => {
  if (originalHome === undefined) delete process.env.DSH_HOME
  else process.env.DSH_HOME = originalHome
  await rm(home, { recursive: true, force: true })
})

function bundle(name: string, enabled = true): BundleProfile {
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
    contextTokens: 0,
    usage: { calls: 0, successes: 0, sessionCalls: 0 },
    protected: false,
    findings: [],
  }
}

function entry(entryId: string, enabled = true): PluginProfile {
  return {
    entryId,
    moduleName: entryId,
    enabled,
    fiberPhase: 'active',
    patchId: entryId,
    guardStatus: 'ok',
    contextTokens: 0,
    usage: { calls: 0, successes: 0, sessionCalls: 0 },
    protected: false,
    findings: [],
  }
}

function scan(input: {
  attributed?: number
  total?: number
  bundles?: BundleProfile[]
  entries?: PluginProfile[]
} = {}): ScanResult {
  return {
    managementAvailable: true,
    compat: {
      summary: { error: 0, warn: 0, info: 0, byDomain: { 'plugin-plugin': 0, 'plugin-runtime': 0, profile: 0, workspace: 0 } },
      topFindings: [],
    },
    bundles: input.bundles ?? [bundle('a'), bundle('b')],
    entries: input.entries ?? [entry('entry-a'), entry('entry-b')],
    context: {
      totalTokens: input.total ?? 1000,
      budget: 0,
      byOwner: {},
      sections: [],
      tools: [],
      unattributedTokens: (input.total ?? 1000) - (input.attributed ?? 800),
    },
    presetModules: [],
    usage: { byTool: {}, byOwner: {} },
    dedupe: [],
    diagnostics: [],
  }
}

describe('apply verification', () => {
  it('keeps a restart-required baseline pending on the same boot', async () => {
    const before = snapshotOf(scan())
    await beginVerification({
      profile: 'web',
      token: 'tok',
      applied: [{ id: 'bundle:b', kind: 'bundle', name: 'b' }],
      before,
      needsRestart: true,
    })
    const view = await settleVerification({
      profile: 'web',
      after: snapshotOf(scan({ attributed: 600 })),
    })
    expect(view.pending).toBeDefined()
    expect(view.pending?.needsRestart).toBe(true)
    expect(view.last).toBeUndefined()
  })

  it('settles after a new boot and reports the measured delta', async () => {
    const before = snapshotOf(scan())
    await beginVerification({
      profile: 'web',
      token: 'tok',
      applied: [{ id: 'bundle:b', kind: 'bundle', name: 'b' }],
      before,
      needsRestart: true,
    })
    const view = await settleVerification({
      profile: 'web',
      after: snapshotOf(scan({ attributed: 600, bundles: [bundle('a'), bundle('b', false)] })),
      pid: process.pid + 1,
      bootAt: Date.now() + 10_000,
    })
    expect(view.pending).toBeUndefined()
    expect(view.last?.deltaTokens).toBe(-200)
    expect(view.last?.deltaPercent).toBeCloseTo(-25)
    expect(view.last?.confounded).toBe(false)
  })

  it('settles immediately when no restart is required', async () => {
    const before = snapshotOf(scan())
    await beginVerification({
      profile: 'web',
      token: 'tok',
      applied: [{ id: 'bundle:b', kind: 'bundle', name: 'b' }],
      before,
      needsRestart: false,
    })
    const view = await settleVerification({
      profile: 'web',
      after: snapshotOf(scan({ attributed: 700 })),
    })
    expect(view.last?.deltaTokens).toBe(-100)
  })

  it('marks a delta as confounded when unrelated plugins changed', async () => {
    const before = snapshotOf(scan())
    await beginVerification({
      profile: 'web',
      token: 'tok',
      applied: [{ id: 'bundle:b', kind: 'bundle', name: 'b' }],
      before,
      needsRestart: true,
    })
    const view = await settleVerification({
      profile: 'web',
      after: snapshotOf(scan({
        attributed: 500,
        bundles: [bundle('a'), bundle('b', false), bundle('c')],
      })),
      pid: process.pid + 1,
      bootAt: Date.now() + 10_000,
    })
    expect(view.last?.confounded).toBe(true)
    expect(view.last?.unexpectedChanges).toContain('c')
  })

  it('clears the receipt after a rollback', async () => {
    const before = snapshotOf(scan())
    await beginVerification({
      profile: 'web',
      token: 'tok',
      applied: [{ id: 'bundle:b', kind: 'bundle', name: 'b' }],
      before,
      needsRestart: false,
    })
    await settleVerification({ profile: 'web', after: snapshotOf(scan({ attributed: 600 })) })
    await clearVerification('web')
    const view = await readVerification('web')
    expect(view.last).toBeUndefined()
    expect(view.pending).toBeUndefined()
  })

  it('reads the last settled verification without clearing it', async () => {
    const before = snapshotOf(scan())
    await beginVerification({
      profile: 'web',
      token: 'tok',
      applied: [{ id: 'bundle:b', kind: 'bundle', name: 'b' }],
      before,
      needsRestart: false,
    })
    await settleVerification({ profile: 'web', after: snapshotOf(scan({ attributed: 600 })) })
    const view = await readVerification('web')
    expect(view.last?.deltaTokens).toBe(-200)
    expect(view.pending).toBeUndefined()
  })
})
