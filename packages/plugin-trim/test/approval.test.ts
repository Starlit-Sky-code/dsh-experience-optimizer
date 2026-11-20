import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import type { SlimProfile } from 'dsh-shared-meta'
import { apply } from '../src/index.ts'
import { saveDraft } from '../src/store.ts'

const cleanups: Array<() => Promise<void>> = []
const originalHome = process.env.DSH_HOME

afterEach(async () => {
  process.env.DSH_HOME = originalHome
  for (const cleanup of cleanups.splice(0)) await cleanup()
})

function profile(): SlimProfile {
  return {
    schemaVersion: 1,
    id: 'slim-approval',
    createdAt: new Date().toISOString(),
    task: { tag: 'review', confidence: 0.8, keywords: [], evidence: [], source: 'goal' },
    mode: 'advise',
    items: [
      {
        id: 'bundle:heavy',
        kind: 'bundle',
        name: 'heavy',
        bundleName: 'heavy',
        action: 'suggest-disable',
        risk: 'low',
        score: 1,
        evidence: [],
        observedEnabled: true,
        protected: false,
        reason: 'unused by this task',
        findings: [],
      },
    ],
    dedupe: [],
    summary: { keep: 0, enable: 0, disable: 1, review: 0, protected: 0 },
    status: 'draft',
  }
}

function context(approval: unknown): { ctx: Context; tools: Map<string, { execute: Function }> } {
  const tools = new Map<string, { execute: Function }>()
  const manager = {
    listBundles: async () => [],
    listPlugins: async () => [],
    setBundleEnabled: async () => ({ changed: true, application: 'applied' }),
    setPluginEnabled: async () => ({ changed: true, application: 'applied' }),
  }
  const ctx = {
    tools: { register(definition: { name: string; execute: Function }) { tools.set(definition.name, definition); return () => undefined } },
    on() { return () => undefined },
    effect() { return () => undefined },
    get(name: string) {
      if (name === 'approval') return approval
      if (name === 'pluginManager') return manager
      return undefined
    },
  } as unknown as Context
  return { ctx, tools }
}

async function home(): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), 'dsh-approval-'))
  process.env.DSH_HOME = dir
  cleanups.push(() => rm(dir, { recursive: true, force: true }))
  await saveDraft(profile(), 5)
}

const exec = {
  agent: {},
  callId: 'call-1',
  signal: new AbortController().signal,
  toolSet: undefined,
} as never

describe('host approval', () => {
  it('fails closed when no approval service is available', async () => {
    await home()
    const { ctx, tools } = context(undefined)
    apply(ctx, { approvalMode: 'always', approvalThreshold: 5 })
    const result = await tools.get('trim_apply_profile')!.execute(
      { profileId: 'slim-approval', confirm: true },
      exec,
    )
    expect(String(result)).toContain('没有 approval 服务')
  })

  it('does not apply when approval is rejected', async () => {
    await home()
    const requests: Array<Record<string, unknown>> = []
    const { ctx, tools } = context({
      async request(request: Record<string, unknown>) {
        requests.push(request)
        return 'rejected'
      },
    })
    apply(ctx, { approvalMode: 'always', approvalThreshold: 5 })
    const result = await tools.get('trim_apply_profile')!.execute(
      { profileId: 'slim-approval', confirm: true },
      exec,
    )
    expect(String(result)).toContain('宿主审批未通过')
    expect(requests).toHaveLength(1)
    expect(String(requests[0]?.reason)).toContain('slim-approval')
    expect(String(requests[0]?.reason)).toContain('bundle:heavy')
    expect(String(requests[0]?.reason)).toContain('Snapshot id:')
  })

  it('requires approval for rollback even without a draft', async () => {
    await home()
    const { ctx, tools } = context(undefined)
    apply(ctx, { approvalMode: 'risk-based', approvalThreshold: 5 })
    const result = await tools.get('trim_rollback_profile')!.execute({}, exec)
    expect(String(result)).toContain('没有 approval 服务')
  })
})
