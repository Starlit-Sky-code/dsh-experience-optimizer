import { describe, expect, it } from 'vitest'
import type { BundleInfoLike, CompatConfigLike, CompatContext, LoaderEntrySnapshot } from '../src/compat/model.ts'
import { inspectCompactionStack } from '../src/compat/compaction.ts'
import { buildProtection } from '../src/protect.ts'

const config: CompatConfigLike = {
  compatEnabled: true,
  compatScanAllProfiles: false,
  compatMaxProfiles: 20,
  compatIncludeInfo: true,
  compatMaxFindings: 100,
  compatReadLockfile: false,
  compatReadWorkspace: false,
  compatStrictOfficialOverrides: false,
  compatCacheTtlMs: 0,
  toolOwners: {},
}

function entry(partial: Partial<LoaderEntrySnapshot>): LoaderEntrySnapshot {
  return {
    id: 'row',
    parentId: null,
    depth: 0,
    moduleName: 'module',
    enabled: true,
    group: false,
    fiberState: 'active',
    provide: [],
    inject: [],
    source: 'loader',
    ...partial,
  }
}

function bundle(name: string, modules: string[], description?: string): BundleInfoLike {
  return {
    name,
    version: '1.0.0',
    description,
    enabled: true,
    installed: true,
    availability: 'profile',
    official: false,
    optional: false,
    removable: true,
    rows: modules.map((moduleName, index) => ({ rowId: `row-${index}`, moduleName })),
    overrides: [],
  }
}

function context(entries: LoaderEntrySnapshot[], bundles: BundleInfoLike[], base = true): CompatContext {
  return {
    runtime: { dshVersion: '0.2.2-rc.1', nodeVersion: '26.10.0', platform: 'linux', arch: 'x64' },
    config,
    profile: {
      name: 'web',
      dir: '/tmp/web',
      bundles: base ? ['@deepseek-ai/dsh-base'] : [],
      dependencies: {},
      patchRows: [],
      exemptions: {},
      compatibilityWarnings: [],
      compatibilityRewritable: false,
    },
    loaderEntries: entries,
    bundles,
    entriesInfo: [],
    manifests: new Map(),
    profiles: [],
    workspace: { cwd: '/tmp', instructionFiles: [], instructions: [] },
    diagnostics: [],
  }
}

const builtin = [
  entry({ id: 'compaction-basic', moduleName: '@deepseek-ai/dsh-compaction-basic' }),
  entry({ id: 'tool-result-pruner', moduleName: '@deepseek-ai/dsh-compaction-tool-result-pruner' }),
  entry({ id: 'image-offload', moduleName: '@deepseek-ai/dsh-compaction-image-offload' }),
  entry({ id: 'command-compact', moduleName: '@deepseek-ai/dsh-command-compact' }),
]

const builtinBundles = [
  bundle('@deepseek-ai/dsh-base', builtin.map((item) => item.moduleName), 'DSH base bundle'),
]

describe('compaction stack audit', () => {
  it('keeps the built-in chain quiet and coherent', () => {
    const result = inspectCompactionStack(context(builtin, builtinBundles))
    expect(result.findings).toEqual([])
    expect(result.stack.health).toBe('ok')
    expect(result.stack.backendCount).toBe(1)
    expect(result.stack.roles.pruner).toBe(1)
    expect(result.stack.roles.image).toBe(1)
    expect(result.stack.roles.command).toBe(1)
    expect(result.stack.criticalModules).toEqual(['@deepseek-ai/dsh-compaction-basic'])
  })

  it('warns when two backend engines are active', () => {
    const entries = [
      ...builtin,
      entry({
        id: 'compaction-weave-gate',
        moduleName: 'dsh-compaction-weave',
        provide: ['compactionWeaveGate'],
      }),
    ]
    const bundles = [
      ...builtinBundles,
      bundle('dsh-compaction-weave', ['dsh-compaction-weave'], 'Cache-friendly context compaction engine'),
    ]
    const result = inspectCompactionStack(context(entries, bundles))
    expect(result.stack.health).toBe('warn')
    expect(result.stack.backendCount).toBe(2)
    expect(result.findings.map((finding) => finding.code)).toContain('PP_COMPACTION_BACKEND_DUPLICATE')
    expect(result.stack.criticalModules).toHaveLength(2)
  })

  it('accepts a single replacement backend when the built-in row is disabled', () => {
    const entries = [
      entry({ id: 'compaction-basic', moduleName: '@deepseek-ai/dsh-compaction-basic', enabled: false, fiberState: null }),
      entry({ id: 'dsh-argp', moduleName: 'dsh-argp' }),
    ]
    const bundles = [
      ...builtinBundles,
      bundle('dsh-argp', ['dsh-argp'], 'Factor context compaction for DeepSeek Harness'),
    ]
    const result = inspectCompactionStack(context(entries, bundles))
    expect(result.stack.health).toBe('ok')
    expect(result.stack.backendCount).toBe(1)
    expect(result.findings.map((finding) => finding.code)).not.toContain('PP_COMPACTION_BACKEND_DUPLICATE')
  })

  it('warns when the profile has no backend but keeps a pruner', () => {
    const entries = [
      entry({ id: 'compaction-basic', moduleName: '@deepseek-ai/dsh-compaction-basic', enabled: false, fiberState: null }),
      entry({ id: 'tool-result-pruner', moduleName: '@deepseek-ai/dsh-compaction-tool-result-pruner' }),
    ]
    const result = inspectCompactionStack(context(entries, builtinBundles))
    expect(result.findings.map((finding) => finding.code)).toContain('PP_COMPACTION_BACKEND_MISSING')
    expect(result.findings.map((finding) => finding.code)).toContain('PP_COMPACTION_PRUNE_WITHOUT_BACKEND')
    expect(result.stack.health).toBe('warn')
  })

  it('reports conflicting explicit thresholds and out-of-range values', () => {
    const entries = [
      ...builtin,
      entry({ id: 'compact-suite', moduleName: 'dsh-compact-suite', config: { thresholdRatio: 0.6 } }),
      entry({ id: 'compact-tuner', moduleName: 'dsh-compact-tuner', config: { thresholdRatio: 0.98 } }),
    ]
    const bundles = [
      ...builtinBundles,
      bundle('dsh-compact-suite', ['dsh-compact-suite'], 'Compaction control panel'),
      bundle('dsh-compact-tuner', ['dsh-compact-tuner'], 'Tune compaction threshold'),
    ]
    const result = inspectCompactionStack(context(entries, bundles))
    const codes = result.findings.map((finding) => finding.code)
    expect(codes).toContain('PP_COMPACTION_THRESHOLD_CONFLICT')
    expect(codes).toContain('PP_COMPACTION_THRESHOLD_OUT_OF_RANGE')
  })

  it('deduplicates the same module across preset and loader rows', () => {
    const entries = [
      entry({ id: 'compaction-basic', moduleName: '@deepseek-ai/dsh-compaction-basic', source: 'loader' }),
      entry({ id: 'compaction-basic', moduleName: '@deepseek-ai/dsh-compaction-basic', source: 'preset' }),
    ]
    const result = inspectCompactionStack(context(entries, builtinBundles))
    expect(result.stack.backendCount).toBe(1)
    expect(result.stack.participants).toHaveLength(1)
  })

  it('protects active backend bundles from disable suggestions', () => {
    const backend = bundle('dsh-compaction-weave', ['dsh-compaction-weave'], 'Cache-friendly context compaction engine')
    const pruner = bundle('dsh-context-fold', ['dsh-context-fold'], 'Fold completed tool results')
    const entries = [
      ...builtin,
      entry({ id: 'compaction-weave-gate', moduleName: 'dsh-compaction-weave' }),
      entry({ id: 'context-fold', moduleName: 'dsh-context-fold' }),
    ]
    const inspected = inspectCompactionStack(context(entries, [...builtinBundles, backend, pruner]))
    const protection = buildProtection({
      bundles: [backend, pruner],
      entries: [],
      extraProtect: inspected.stack.criticalModules,
    })
    expect(protection.protectedBundlePredicate(backend)).toBe(true)
    expect(protection.protectedBundlePredicate(pruner)).toBe(false)
  })

  it('does not treat a generic context dashboard as a backend', () => {
    const entries = [
      ...builtin,
      entry({ id: 'dsh-context', moduleName: 'dsh-context' }),
    ]
    const bundles = [
      ...builtinBundles,
      bundle('dsh-context', ['dsh-context'], 'Context insight and management dashboard'),
    ]
    const result = inspectCompactionStack(context(entries, bundles))
    expect(result.stack.backendCount).toBe(1)
    expect(result.stack.roles.participant).toBe(0)
  })
})
