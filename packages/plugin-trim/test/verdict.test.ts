import { describe, expect, it } from 'vitest'
import type { CompatFinding, CompatReport, CompactionStack } from 'dsh-shared-meta'
import type { CompatAnalysisResult, CompatContext } from '../src/compat/model.ts'
import { makeFinding } from '../src/compat/finding.ts'
import { buildVerdict } from '../src/verdict.ts'
import type { ScanResult } from '../src/scan.ts'

const ctx = {
  runtime: { dshVersion: '0.2.2-rc.1', nodeVersion: '26', platform: 'linux', arch: 'x64' },
  config: {},
  profile: {
    name: 'web',
    dir: '/tmp/web',
    bundles: ['@deepseek-ai/dsh-base'],
    dependencies: {},
    patchRows: [],
    exemptions: {},
    compatibilityWarnings: [],
    compatibilityRewritable: false,
  },
  loaderEntries: [],
  bundles: [],
  entriesInfo: [],
  manifests: new Map(),
  profiles: [],
  workspace: { cwd: '/tmp', instructionFiles: [], instructions: [] },
  diagnostics: [],
} as unknown as CompatContext

const compaction = (health: CompactionStack['health'], backendCount = 1): CompactionStack => ({
  health,
  roles: { backend: backendCount, pruner: 1, image: 1, command: 1, threshold: 0, archive: 0, participant: 0 },
  backendCount,
  effectiveModule: backendCount === 1 ? '@deepseek-ai/dsh-compaction-basic' : null,
  participants: [],
  findings: [],
  notes: [],
  criticalModules: [],
})

function analysis(findings: CompatFinding[], stack = compaction('ok')): CompatAnalysisResult {
  const report = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    runtime: ctx.runtime,
    profile: { name: 'web', dir: '/tmp/web', bundles: ctx.profile.bundles },
    findings,
    summary: {
      error: findings.filter((finding) => finding.severity === 'error').length,
      warn: findings.filter((finding) => finding.severity === 'warn').length,
      info: findings.filter((finding) => finding.severity === 'info').length,
      byDomain: { 'plugin-plugin': 0, 'plugin-runtime': 0, profile: 0, workspace: 0 },
    },
    compaction: stack,
    profiles: [],
    workspaces: [],
    diagnostics: [],
  } as unknown as CompatReport
  return { report, findings, context: ctx, markdown: '' }
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
    context: {
      totalTokens: 1200,
      budget: 0,
      byOwner: { demo: 900, other: 300 },
      sections: [],
      tools: [],
      unattributedTokens: 0,
    },
    presetModules: [],
    usage: { byTool: {}, byOwner: {} },
    dedupe: [],
    compaction: compaction('ok'),
    diagnostics: [],
    ...overrides,
  }
}

describe('checkup verdict', () => {
  it('warns when attributable context exceeds the configured budget', () => {
    const base = scan()
    const verdict = buildVerdict(analysis([]), scan({
      context: { ...base.context, budget: 1000 },
    }))
    const check = verdict.checks.find((item) => item.id === 'context')
    expect(check?.status).toBe('warn')
    expect(check?.detail).toContain('1,200 / 1,000')
    expect(verdict.actions.some((action) => action.target === 'context')).toBe(true)
  })

  it('returns a clean verdict with a draft action', () => {
    const verdict = buildVerdict(analysis([]), scan())
    expect(verdict.overall).toBe('ok')
    expect(verdict.headline).toBe('通过')
    expect(verdict.checks).toHaveLength(4)
    expect(verdict.actions.map((action) => action.target)).toContain('draft')
  })

  it('turns a compat warning into attention and a compat action', () => {
    const finding = makeFinding({
      domain: 'plugin-plugin',
      code: 'PP_CONFIG_CONFLICT',
      severity: 'warn',
      title: 'config conflict',
      subjects: ['a', 'b'],
      evidence: [{ source: 'loader', summary: 'conflict' }],
    })
    const verdict = buildVerdict(analysis([finding]), scan())
    expect(verdict.overall).toBe('attention')
    expect(verdict.headline).toContain('需处理')
    expect(verdict.actions.some((action) => action.target === 'compat')).toBe(true)
  })

  it('turns a compaction warning into a compaction action', () => {
    const verdict = buildVerdict(analysis([], compaction('warn', 2)), scan({ compaction: compaction('warn', 2) }))
    expect(verdict.overall).toBe('attention')
    expect(verdict.actions.some((action) => action.target === 'compaction')).toBe(true)
    expect(verdict.checks.find((check) => check.id === 'compaction')?.detail).toContain('2 个后端')
  })

  it('turns a load error into a risk verdict', () => {
    const finding = makeFinding({
      domain: 'plugin-runtime',
      code: 'RT_ENGINE_MISMATCH',
      severity: 'error',
      title: 'engine mismatch',
      subjects: ['demo'],
      evidence: [{ source: 'runtime', summary: 'dsh 0.3 required' }],
    })
    const verdict = buildVerdict(analysis([finding]), scan())
    expect(verdict.overall).toBe('risk')
    expect(verdict.headline).toBe('有阻断项')
  })

  it('warns on duplicate prompt text without inventing a budget', () => {
    const verdict = buildVerdict(analysis([]), scan({
      dedupe: [{
        fingerprint: 'x',
        members: [],
        authority: 'a',
        conflict: false,
        reason: 'duplicate',
      }],
    }))
    expect(verdict.overall).toBe('attention')
    expect(verdict.checks.find((check) => check.id === 'context')?.status).toBe('warn')
  })
})
