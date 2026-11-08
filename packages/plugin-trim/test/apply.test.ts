import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import type { SlimProfile } from 'dsh-shared-meta'
import type {
  BundleInfoLike,
  ChangeResultLike,
  PluginInfoLike,
  PluginManagerLike,
} from '../src/compat/model.ts'
import { applySlimProfile, ApplyRefusedError } from '../src/apply.ts'
import { rollbackSlimProfile } from '../src/rollback.ts'
import { saveDraft } from '../src/store.ts'

const cleanups: Array<() => Promise<void>> = []
const originalHome = process.env.DSH_HOME

afterEach(async () => {
  process.env.DSH_HOME = originalHome
  for (const cleanup of cleanups.splice(0)) await cleanup()
})

class FakeManager implements PluginManagerLike {
  readonly bundles = new Map<string, boolean>()
  readonly entries = new Map<string, boolean>()
  failOn?: string
  readonly calls: Array<{ kind: 'bundle' | 'entry'; name: string; enabled: boolean }> = []

  constructor(bundles: Record<string, boolean>, entries: Record<string, boolean> = {}) {
    for (const [name, enabled] of Object.entries(bundles)) this.bundles.set(name, enabled)
    for (const [name, enabled] of Object.entries(entries)) this.entries.set(name, enabled)
  }

  async listPlugins(): Promise<PluginInfoLike[]> {
    return [...this.entries].map(([entryId, enabled]) => ({
      entryId,
      moduleName: entryId,
      enabled,
      fiberPhase: enabled ? 'active' : null,
    }))
  }

  async listBundles(): Promise<BundleInfoLike[]> {
    return [...this.bundles].map(([name, enabled]) => ({
      name,
      enabled,
      installed: true,
      availability: 'profile',
      official: false,
      optional: false,
      removable: true,
      rows: [],
      overrides: [],
    }))
  }

  listVersionExemptions(): { exemptions: Record<string, string[]>; warnings: string[] } {
    return { exemptions: {}, warnings: [] }
  }

  async setBundleEnabled(name: string, enabled: boolean): Promise<ChangeResultLike> {
    this.calls.push({ kind: 'bundle', name, enabled })
    if (this.failOn === name) {
      return { changed: false, application: 'failed', error: { diagnostic: 'simulated failure' } }
    }
    this.bundles.set(name, enabled)
    return { changed: true, application: 'applied' }
  }

  async setPluginEnabled(id: string, enabled: boolean): Promise<ChangeResultLike> {
    this.calls.push({ kind: 'entry', name: id, enabled })
    if (this.failOn === id) {
      return { changed: false, application: 'failed', error: { diagnostic: 'simulated failure' } }
    }
    this.entries.set(id, enabled)
    return { changed: true, application: 'applied' }
  }
}

function draft(id: string, items: SlimProfile['items']): SlimProfile {
  return {
    schemaVersion: 1,
    id,
    createdAt: new Date().toISOString(),
    task: {
      tag: 'bugfix',
      confidence: 0.9,
      keywords: ['修复'],
      evidence: [],
      source: 'goal',
    },
    mode: 'advise',
    items,
    dedupe: [],
    summary: { keep: 0, enable: 0, disable: items.length, review: 0, protected: 0 },
    status: 'draft',
  }
}

function item(
  id: string,
  name: string,
  action: 'suggest-disable' | 'enable',
  observedEnabled: boolean,
): SlimProfile['items'][number] {
  return {
    id,
    kind: 'bundle',
    name,
    bundleName: name,
    action,
    risk: 'low',
    score: 0,
    evidence: [],
    observedEnabled,
    protected: false,
    reason: 'test',
    findings: [],
  }
}

async function tempHome(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-trim-home-'))
  process.env.DSH_HOME = dir
  cleanups.push(() => rm(dir, { recursive: true, force: true }))
  return dir
}

describe('apply and rollback', () => {
  it('refuses without confirm', async () => {
    await tempHome()
    const manager = new FakeManager({ heavy: true })
    await saveDraft(draft('slim-refuse', [item('bundle:heavy', 'heavy', 'suggest-disable', true)]), 5)
    await expect(
      applySlimProfile('slim-refuse', { confirm: false, manager, maxDrafts: 5 }),
    ).rejects.toBeInstanceOf(ApplyRefusedError)
  })

  it('disables a low-risk bundle and restores it', async () => {
    await tempHome()
    const manager = new FakeManager({ heavy: true })
    await saveDraft(draft('slim-apply', [item('bundle:heavy', 'heavy', 'suggest-disable', true)]), 5)
    const result = await applySlimProfile('slim-apply', {
      confirm: true,
      manager,
      maxDrafts: 5,
    })
    expect(result.items[0]?.status).toBe('applied')
    expect(result.token).toBeDefined()
    expect(manager.bundles.get('heavy')).toBe(false)

    const rollback = await rollbackSlimProfile({
      token: result.token,
      manager,
      maxDrafts: 5,
    })
    expect(rollback.items[0]?.status).toBe('restored')
    expect(manager.bundles.get('heavy')).toBe(true)
  })

  it('skips stale items when plugin state changed after the draft', async () => {
    await tempHome()
    const manager = new FakeManager({ heavy: false })
    await saveDraft(draft('slim-stale', [item('bundle:heavy', 'heavy', 'suggest-disable', true)]), 5)
    const result = await applySlimProfile('slim-stale', {
      confirm: true,
      manager,
      maxDrafts: 5,
    })
    expect(result.items[0]?.status).toBe('stale')
    expect(manager.calls).toHaveLength(0)
  })

  it('rolls back already-applied items after a later failure', async () => {
    await tempHome()
    const manager = new FakeManager({ first: true, second: true })
    manager.failOn = 'second'
    await saveDraft(
      draft('slim-fail', [
        item('bundle:first', 'first', 'suggest-disable', true),
        item('bundle:second', 'second', 'suggest-disable', true),
      ]),
      5,
    )
    const result = await applySlimProfile('slim-fail', {
      confirm: true,
      manager,
      maxDrafts: 5,
    })
    expect(result.rolledBack).toBe(true)
    expect(manager.bundles.get('first')).toBe(true)
    expect(manager.bundles.get('second')).toBe(true)
  })

  it('does not touch protected items', async () => {
    await tempHome()
    const manager = new FakeManager({ core: true })
    const protectedItem = { ...item('bundle:core', 'core', 'suggest-disable', true), protected: true }
    await saveDraft(draft('slim-protected', [protectedItem]), 5)
    const result = await applySlimProfile('slim-protected', {
      confirm: true,
      manager,
      maxDrafts: 5,
    })
    expect(result.items).toHaveLength(0)
    expect(manager.bundles.get('core')).toBe(true)
  })

  it('blocks an enable when a fresh compatibility error appears', async () => {
    await tempHome()
    const manager = new FakeManager({ heavy: false })
    await saveDraft(draft('slim-blocked', [item('bundle:heavy', 'heavy', 'enable', false)]), 5)
    const result = await applySlimProfile('slim-blocked', {
      confirm: true,
      manager,
      maxDrafts: 5,
      findings: [
        {
          id: 'fresh',
          domain: 'plugin-runtime',
          code: 'RT_ENGINE_UNMET',
          severity: 'error',
          title: 'incompatible',
          subjects: ['heavy'],
          evidence: [],
          confidence: 'high',
          autoApplicable: false,
        },
      ],
    })
    expect(result.items[0]?.status).toBe('blocked-by-compat')
    expect(manager.bundles.get('heavy')).toBe(false)
  })
})
