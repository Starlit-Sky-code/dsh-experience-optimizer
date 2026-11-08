import { describe, expect, it } from 'vitest'
import type { CompatConfigLike, CompatContext, BundleInfoLike, LoaderEntrySnapshot } from '../src/compat/model.ts'
import { runPluginRules } from '../src/compat/rules-plugin.ts'
import { runProfileRules } from '../src/compat/rules-profile.ts'
import { runRuntimeRules } from '../src/compat/rules-runtime.ts'
import { runCompatibilityRules, buildReport, renderReport } from '../src/compat/report.ts'
import {
  checkNodeEngine,
  evaluateCompatibilityLocal,
} from '../src/compat/runtime-check.ts'
import { parsePatchText } from '../src/compat/patches.ts'
import { parsePackageKey, summarizeLockfile } from '../src/compat/lockfile.ts'

const config: CompatConfigLike = {
  compatEnabled: true,
  compatScanAllProfiles: false,
  compatMaxProfiles: 20,
  compatIncludeInfo: true,
  compatMaxFindings: 100,
  compatReadLockfile: true,
  compatReadWorkspace: true,
  compatStrictOfficialOverrides: false,
  compatCacheTtlMs: 0,
  toolOwners: {},
}

function context(partial: Partial<CompatContext> = {}): CompatContext {
  return {
    runtime: {
      dshVersion: '0.2.2-rc.1',
      nodeVersion: '26.10.0',
      platform: 'linux',
      arch: 'x64',
    },
    config,
    profile: {
      name: 'web',
      dir: '/tmp/dsh-web',
      bundles: [],
      dependencies: {},
      patchRows: [],
      exemptions: {},
      compatibilityWarnings: [],
      compatibilityRewritable: true,
    },
    loaderEntries: [],
    bundles: [],
    entriesInfo: [],
    manifests: new Map(),
    profiles: [],
    workspace: { cwd: '/tmp/workspace', instructionFiles: [], instructions: [] },
    diagnostics: [],
    ...partial,
  }
}

function bundle(partial: Partial<BundleInfoLike> = {}): BundleInfoLike {
  return {
    name: 'dsh-plugin-extra',
    version: '1.0.0',
    description: 'extra plugin',
    enabled: true,
    installed: true,
    availability: 'profile',
    official: false,
    optional: false,
    removable: true,
    rows: [],
    overrides: [],
    ...partial,
  }
}

function entry(partial: Partial<LoaderEntrySnapshot> = {}): LoaderEntrySnapshot {
  return {
    id: 'entry',
    parentId: null,
    depth: 0,
    moduleName: 'dsh-plugin-extra',
    enabled: true,
    group: false,
    fiberState: 'active',
    provide: [],
    inject: [],
    source: 'loader',
    ...partial,
  }
}

describe('runtime compatibility', () => {
  it('detects an unmet engines.dsh range', () => {
    const issue = evaluateCompatibilityLocal(
      { name: 'pkg', version: '1.0.0', engines: { dsh: '>=9.0.0' } },
      {},
      '0.2.2-rc.1',
    )
    expect(issue?.requirements['engines.dsh']).toBe('>=9.0.0')
  })

  it('detects an unmet DSH peer range', () => {
    const issue = evaluateCompatibilityLocal(
      {
        name: 'pkg',
        version: '1.0.0',
        peerDependencies: { '@deepseek-ai/dsh-tools': '>=9.0.0' },
      },
      {},
      '0.2.2-rc.1',
    )
    expect(issue?.requirements['@deepseek-ai/dsh-tools']).toBe('>=9.0.0')
  })

  it('checks Node engines', () => {
    expect(checkNodeEngine({ engines: { node: '>=20' } }, '26.10.0')).toBeUndefined()
    expect(checkNodeEngine({ engines: { node: '>=99' } }, '26.10.0')).toBe('>=99')
  })

  it('reports RT_ENGINE_UNMET from a manifest', async () => {
    const findings = await runRuntimeRules(
      context({
        bundles: [bundle()],
        manifests: new Map([
          ['dsh-plugin-extra', { name: 'dsh-plugin-extra', version: '1.0.0', engines: { dsh: '>=9.0.0' } }],
        ]),
      }),
    )
    expect(findings.some((finding) => finding.code === 'RT_ENGINE_UNMET')).toBe(true)
  })
})

describe('plugin compatibility', () => {
  it('detects duplicate service providers in one scope', async () => {
    const findings = await runPluginRules(
      context({
        loaderEntries: [
          entry({ id: 'a', moduleName: 'plugin-a', provide: ['shared'] }),
          entry({ id: 'b', moduleName: 'plugin-b', provide: ['shared'] }),
        ],
      }),
    )
    expect(findings.some((finding) => finding.code === 'PP_SERVICE_DUPLICATE')).toBe(true)
  })

  it('does not flag the same service across different presets', async () => {
    const findings = await runPluginRules(
      context({
        loaderEntries: [
          entry({ id: 'p1:a', moduleName: 'plugin-a', provide: ['shared'], source: 'preset', presetId: 'p1' }),
          entry({ id: 'p2:b', moduleName: 'plugin-b', provide: ['shared'], source: 'preset', presetId: 'p2' }),
        ],
      }),
    )
    expect(findings.some((finding) => finding.code === 'PP_SERVICE_DUPLICATE')).toBe(false)
  })

  it('detects duplicate MCP server names', async () => {
    const findings = await runPluginRules(
      context({
        loaderEntries: [
          entry({ id: 'm1', moduleName: '@deepseek-ai/dsh-mcp-client', source: 'mcp', mcpServerName: 'github' }),
          entry({ id: 'm2', moduleName: '@deepseek-ai/dsh-mcp-client', source: 'mcp', mcpServerName: 'github' }),
        ],
      }),
    )
    expect(findings.some((finding) => finding.code === 'PP_MCP_SERVER_DUPLICATE')).toBe(true)
  })

  it('detects duplicate row ids across enabled bundles', async () => {
    const findings = await runPluginRules(
      context({
        bundles: [
          bundle({ name: 'a', rows: [{ rowId: 'same', moduleName: 'a' }] }),
          bundle({ name: 'b', rows: [{ rowId: 'same', moduleName: 'b' }] }),
        ],
      }),
    )
    expect(findings.some((finding) => finding.code === 'PP_ROW_DUPLICATE')).toBe(true)
  })
})

describe('profile compatibility', () => {
  it('detects duplicate bundles', async () => {
    const findings = await runProfileRules(
      context({ profile: { ...context().profile, bundles: ['a', 'a'] } }),
    )
    expect(findings.some((finding) => finding.code === 'PW_DUPLICATE_BUNDLE')).toBe(true)
  })

  it('detects version drift across profiles', async () => {
    const findings = await runProfileRules(
      context({
        profiles: [
          {
            name: 'web',
            dir: '/tmp/web',
            bundles: ['a'],
            dependencies: {},
            patchRows: [],
            exemptions: {},
            compatibilityWarnings: [],
            compatibilityRewritable: true,
            manifestVersions: { a: '1.0.0' },
          },
          {
            name: 'headless',
            dir: '/tmp/headless',
            bundles: ['a'],
            dependencies: {},
            patchRows: [],
            exemptions: {},
            compatibilityWarnings: [],
            compatibilityRewritable: true,
            manifestVersions: { a: '2.0.0' },
          },
        ],
      }),
    )
    expect(findings.some((finding) => finding.code === 'PW_VERSION_DRIFT')).toBe(true)
  })

  it('detects incompatible bundle drift as info', async () => {
    const findings = await runProfileRules(
      context({
        profiles: [
          {
            name: 'web',
            dir: '/tmp/web',
            bundles: ['a'],
            dependencies: {},
            patchRows: [],
            exemptions: {},
            compatibilityWarnings: [],
            compatibilityRewritable: true,
            manifestVersions: {},
          },
          {
            name: 'headless',
            dir: '/tmp/headless',
            bundles: ['a', 'b'],
            dependencies: {},
            patchRows: [],
            exemptions: {},
            compatibilityWarnings: [],
            compatibilityRewritable: true,
            manifestVersions: {},
          },
        ],
      }),
    )
    expect(findings.some((finding) => finding.code === 'PW_BUNDLE_DRIFT')).toBe(true)
  })
})

describe('patch parsing', () => {
  it('parses insert rows and keeps !!js as a sentinel', () => {
    const result = parsePatchText(
      [
        '- insert:',
        '    - id: plugin-a',
        "      name: '@scope/plugin-a'",
        '      disabled: !!js process.platform === "win32"',
        '      config:',
        '        enabled: true',
      ].join('\n'),
      'bundle-a',
      '/tmp/a.yml',
    )
    expect(result.error).toBeUndefined()
    expect(result.rows).toHaveLength(1)
    expect(result.rows[0]?.id).toBe('plugin-a')
    expect(result.rows[0]?.disabled).toEqual({ __js: 'process.platform === "win32"' })
  })
})

describe('lockfile parsing', () => {
  it('parses scoped and peer-suffixed package keys', () => {
    expect(parsePackageKey('@scope/pkg@1.2.3')).toEqual({ name: '@scope/pkg', version: '1.2.3' })
    expect(parsePackageKey('pkg@1.2.3(react@18.0.0)')).toEqual({ name: 'pkg', version: '1.2.3' })
  })

  it('detects duplicate versions', () => {
    const summary = summarizeLockfile(
      '/tmp/pnpm-lock.yaml',
      [
        'packages:',
        '  pkg@1.0.0: {}',
        '  pkg@2.0.0: {}',
        '  "@deepseek-ai/dsh-tools@0.2.2-rc.1": {}',
      ].join('\n'),
    )
    expect(summary.packageVersions.pkg).toEqual(['1.0.0', '2.0.0'])
  })
})

describe('report', () => {
  it('builds and renders a matrix', async () => {
    const contextValue = context({
      bundles: [bundle()],
      manifests: new Map([
        ['dsh-plugin-extra', { name: 'dsh-plugin-extra', version: '1.0.0', engines: { dsh: '>=9.0.0' } }],
      ]),
    })
    const findings = await runCompatibilityRules(contextValue)
    const report = buildReport(contextValue, findings, { includeInfo: true, maxFindings: 100 })
    expect(report.summary.error).toBeGreaterThan(0)
    const markdown = renderReport(report, { includeInfo: true, maxFindings: 100 })
    expect(markdown).toContain('RT_ENGINE_UNMET')
    expect(markdown).toContain('兼容性矩阵')
  })
})

describe('additional conflict rules', () => {
  it('detects conflicting config across two bundles', async () => {
    const base = context()
    const findings = await runPluginRules(
      context({
        bundles: [bundle({ name: 'a' }), bundle({ name: 'b' })],
        profile: {
          ...base.profile,
          patchRows: [
            { layer: 'a', id: 'row', config: { x: 1 }, sourceFile: 'a.yml' },
            { layer: 'b', id: 'row', config: { x: 2 }, sourceFile: 'b.yml' },
          ],
        },
      }),
    )
    expect(findings.some((finding) => finding.code === 'PP_CONFIG_CONFLICT')).toBe(true)
  })

  it('detects profile patch overriding a bundle config', async () => {
    const base = context()
    const findings = await runProfileRules(
      context({
        profile: {
          ...base.profile,
          patchRows: [
            { layer: 'profile', id: 'row', config: { x: 2 }, sourceFile: 'profile.yml' },
            { layer: 'a', id: 'row', config: { x: 1 }, sourceFile: 'a.yml' },
          ],
        },
      }),
    )
    expect(findings.some((finding) => finding.code === 'PW_PATCH_CONFLICT')).toBe(true)
  })

  it('detects duplicate prompt paragraphs', async () => {
    const text = '读取文件前必须确认路径存在并检查权限，避免读取失败或覆盖用户数据。'
    const findings = await runPluginRules(
      context({
        prompt: {
          sections: [
            { name: 'tool-read', text },
            { name: 'plugin-x', text },
          ],
          contexts: [],
          tools: [],
        },
      }),
    )
    expect(findings.some((finding) => finding.code === 'PP_PROMPT_OVERLAP')).toBe(true)
  })

  it('detects workspace instruction overlap', async () => {
    const text = '读取文件前必须确认路径存在并检查权限，避免读取失败或覆盖用户数据。'
    const findings = await runProfileRules(
      context({
        prompt: { sections: [{ name: 'tool-read', text }], contexts: [], tools: [] },
        workspace: {
          cwd: '/tmp/workspace',
          instructionFiles: ['/tmp/workspace/AGENTS.md'],
          instructions: [{ file: '/tmp/workspace/AGENTS.md', text }],
        },
      }),
    )
    expect(findings.some((finding) => finding.code === 'PW_WORKSPACE_RULE_OVERLAP')).toBe(true)
  })
})
