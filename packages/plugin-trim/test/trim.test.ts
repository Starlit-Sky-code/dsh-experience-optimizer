import { describe, expect, it } from 'vitest'
import type { BundleProfile, PluginProfile, SlimProfile, TaskProfile } from 'dsh-shared-meta'
import { detectTask } from '../src/task.ts'
import { scoreBundle } from '../src/score.ts'
import { computeOverlapSet } from '../src/score.ts'
import { dedupeSections } from '../src/dedupe.ts'
import { applicableItems, buildSlimProfile } from '../src/draft.ts'
import type { ScanResult } from '../src/scan.ts'
import type { Config } from '../src/config.ts'

const config: Config = {
  mode: 'advise',
  protect: [],
  pinned: [],
  trackUsage: true,
  usageRetentionDays: 30,
  maxDrafts: 20,
  enableDedupe: true,
  persistExcerpts: false,
  tokenRatio: 3.5,
  toolOwners: {},
  compatEnabled: true,
  compatScanAllProfiles: false,
  compatMaxProfiles: 20,
  compatIncludeInfo: false,
  compatMaxFindings: 100,
  compatReadLockfile: true,
  compatReadWorkspace: true,
  compatStrictOfficialOverrides: false,
  compatCacheTtlMs: 0,
}

function task(partial: Partial<TaskProfile> = {}): TaskProfile {
  return {
    tag: 'bugfix',
    confidence: 0.9,
    keywords: ['修复', 'bug'],
    evidence: [],
    source: 'goal',
    ...partial,
  }
}

function bundle(partial: Partial<BundleProfile> = {}): BundleProfile {
  return {
    name: 'dsh-plugin-extra',
    version: '1.0.0',
    description: '周报生成器',
    enabled: true,
    installed: true,
    availability: 'profile',
    official: false,
    optional: false,
    removable: true,
    guardStatus: 'ok',
    rowModuleNames: ['dsh-plugin-extra'],
    contextTokens: 0,
    usage: { calls: 0, successes: 0, sessionCalls: 0 },
    protected: false,
    findings: [],
    ...partial,
  }
}

function scan(overrides: Partial<ScanResult> = {}): ScanResult {
  return {
    managementAvailable: true,
    compat: {
      summary: { error: 0, warn: 0, info: 0, byDomain: { 'plugin-plugin': 0, 'plugin-runtime': 0, profile: 0, workspace: 0 } },
      topFindings: [],
    },
    bundles: [],
    entries: [],
    context: { totalTokens: 0, byOwner: {}, sections: [], tools: [], unattributedTokens: 0 },
    presetModules: [],
    usage: { byTool: {}, byOwner: {} },
    dedupe: [],
    diagnostics: [],
    ...overrides,
  }
}

describe('task detection', () => {
  it('detects a bugfix goal', () => {
    const result = detectTask({ goal: '修复登录页面的崩溃问题' })
    expect(result.tag).toBe('bugfix')
    expect(result.confidence).toBeGreaterThan(0.5)
  })

  it('detects a report goal', () => {
    const result = detectTask({ goal: '每周自动整理项目周报并汇总 commit' })
    expect(result.tag).toBe('report')
    expect(result.keywords.length).toBeGreaterThan(0)
  })

  it('honors an explicit tag', () => {
    const result = detectTask({ explicit: 'release', goal: '随便' })
    expect(result.tag).toBe('release')
    expect(result.confidence).toBe(1)
  })

  it('returns unknown for empty input', () => {
    expect(detectTask({}).tag).toBe('unknown')
  })
})

describe('bundle scoring', () => {
  it('does not disable on weak evidence', () => {
    const item = scoreBundle(
      scan(),
      task({ tag: 'unknown', confidence: 0.2, keywords: [] }),
      bundle({ contextTokens: 0 }),
      new Set(),
    )
    expect(item.action).toBe('review')
    expect(item.risk).toBe('high')
  })

  it('suggests disabling a costly unrelated bundle with low risk', () => {
    const item = scoreBundle(
      scan(),
      task({ tag: 'bugfix', confidence: 0.9, keywords: ['修复'] }),
      bundle({ description: '演示文稿生成', contextTokens: 6000 }),
      new Set(),
    )
    expect(item.action).toBe('suggest-disable')
    expect(item.risk).toBe('low')
  })

  it('keeps protected items', () => {
    const item = scoreBundle(scan(), task(), bundle({ protected: true }), new Set())
    expect(item.action).toBe('keep')
    expect(item.protected).toBe(true)
  })

  it('computes overlap sets', () => {
    const text = '生成每周项目周报并发送到邮箱，包含提交统计、风险与待办事项的完整汇总说明'
    const left = bundle({ name: 'a', description: text })
    const right = bundle({ name: 'b', description: text })
    const overlap = computeOverlapSet(scan({ bundles: [left, right] }))
    expect(overlap.has('a')).toBe(true)
    expect(overlap.has('b')).toBe(true)
  })
})

describe('dedupe', () => {
  it('groups identical paragraphs across sections', () => {
    const groups = dedupeSections(
      [
        { name: 'tool-read', text: '读取文件时必须先确认路径存在，再执行读取操作。' },
        { name: 'plugin-x', text: '读取文件时必须先确认路径存在，再执行读取操作。' },
      ],
      { persistExcerpts: false },
    )
    expect(groups).toHaveLength(1)
    expect(groups[0]?.members).toHaveLength(2)
    expect(groups[0]?.conflict).toBe(false)
  })
})

describe('slim profile draft', () => {
  it('marks only low-risk disables as applicable', () => {
    const protectedEntry: PluginProfile = {
      entryId: 'core',
      moduleName: '@deepseek-ai/dsh-tools',
      enabled: true,
      fiberPhase: 'active',
      guardStatus: 'protected',
      contextTokens: 0,
      usage: { calls: 0, successes: 0, sessionCalls: 0 },
      protected: true,
      findings: [],
    }
    const profile = buildSlimProfile(
      scan({
        bundles: [
          bundle({ name: 'heavy', enabled: true, contextTokens: 8000 }),
          bundle({ name: 'core', enabled: true, protected: true }),
        ],
        entries: [protectedEntry],
      }),
      task({ tag: 'bugfix', confidence: 0.9, keywords: ['修复'] }),
      config,
    )
    expect(profile.items.find((item) => item.id === 'bundle:core')?.action).toBe('keep')
    expect(profile.items.find((item) => item.id === 'bundle:heavy')?.action).toBe('suggest-disable')
    for (const item of applicableItems(profile)) {
      expect(item.risk).toBe('low')
      expect(item.protected).toBe(false)
    }
  })
})

describe('draft schema', () => {
  it('keeps a stable slim profile shape', () => {
    const profile: SlimProfile = buildSlimProfile(scan(), task(), config)
    expect(profile.schemaVersion).toBe(1)
    expect(profile.status).toBe('draft')
    expect(profile.summary.keep + profile.summary.disable + profile.summary.review + profile.summary.enable).toBeLessThanOrEqual(profile.items.length)
  })
})

describe('protection policy', () => {
  it('honors extra protect and preset module names', async () => {
    const { buildProtection } = await import('../src/protect.ts')
    const custom = { ...bundle({ name: 'custom-plugin' }), rows: [], overrides: [] }
    const protection = buildProtection({
      bundles: [custom],
      entries: [],
      extraProtect: ['custom-plugin'],
      pinned: [],
    })
    expect(protection.protectedBundlePredicate(custom)).toBe(true)
    expect(protection.protectedModules.has('custom-plugin')).toBe(true)
  })
})
