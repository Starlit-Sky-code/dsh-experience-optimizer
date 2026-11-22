// @ts-nocheck
// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import React from 'react'
import { createRoot } from 'react-dom/client'
import { act } from 'react-dom/test-utils'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const source = readFileSync(resolve(process.cwd(), 'packages/plugin-trim/client.js'), 'utf8')
const overview = {
  ok: true,
  data: {
    version: '0.5.4',
    runtime: { dshVersion: '0.2.2-rc.1' },
    profile: { name: 'web', dir: '/tmp/web' },
    compat: { error: 0, warn: 0, info: 0, byDomain: {} },
    verdict: {
      overall: 'ok',
      headline: '通过',
      checks: [
        { id: 'load', status: 'ok', label: '加载', detail: '插件行已加载' },
        { id: 'compat', status: 'ok', label: '兼容', detail: '未发现冲突' },
        { id: 'context', status: 'ok', label: '上下文', detail: '1,000 tokens' },
        { id: 'compaction', status: 'ok', label: '压缩链路', detail: '1 个后端' },
      ],
      actions: [{ id: 'draft', label: '生成瘦身方案', target: 'draft' }],
    },
    compaction: {
      health: 'ok',
      roles: { backend: 1, pruner: 1, image: 0, command: 1, threshold: 0, archive: 0, participant: 0 },
      backendCount: 1,
      effectiveModule: '@deepseek-ai/dsh-compaction-basic',
      participants: [
        { id: 'compaction-basic', moduleName: '@deepseek-ai/dsh-compaction-basic', role: 'backend', enabled: true, confidence: 'high', evidence: [] },
      ],
      findings: [],
      notes: [],
      criticalModules: ['@deepseek-ai/dsh-compaction-basic'],
    },
    findings: [],
    context: {
      totalTokens: 1000,
      attributableTokens: 600,
      budget: 2000,
      unattributedTokens: 400,
      topSections: [],
      topTools: [],
      byOwner: [],
      unattributedTop: {
        sections: [{ name: 'mystery-section', tokens: 300, source: 'section' }],
        tools: [{ name: 'mystery_tool', tokens: 100 }],
      },
    },
    bundles: [
      {
        name: 'demo-plugin',
        version: '1.0.0',
        enabled: true,
        protected: false,
        guardStatus: 'ok',
        contextTokens: 600,
        usage: { calls: 0, successes: 0, sessionCalls: 0 },
        description: 'demo',
      },
    ],
    entries: [],
    dedupe: [],
    managementAvailable: true,
    recipeAvailable: false,
    categories: [
      { id: 'memory', label: '上下文/记忆', bundles: 1, tokens: 600, share: 60 },
      { id: 'tools', label: '工具', bundles: 1, tokens: 400, share: 40 },
    ],
    host: { rssMb: 412, heapUsedMb: 120, uptimeSec: 3600 },
    capability: {
      groups: [
        { id: 'shell', label: 'Shell', count: 1, items: [{ name: 'bash', owner: 'demo-plugin', evidence: '工具名推断' }] },
        { id: 'filesystem-write', label: 'File write', count: 1, items: [{ name: 'write', owner: 'demo-plugin', evidence: '工具名推断' }] },
        { id: 'network', label: 'Network', count: 0, items: [] },
        { id: 'mcp', label: 'MCP', count: 0, items: [] },
        { id: 'dynamic-config', label: 'Dynamic config', count: 0, items: [] },
      ],
      notes: [],
    },
    history: {
      records: [
        { at: '2026-11-21T00:00:00.000Z', attributed: 1000, total: 1400, owners: [], enabledBundles: [], compat: { error: 0, warn: 0, info: 0 }, counts: { bundles: 0, entries: 0, tools: 0, sections: 0 } },
        { at: '2026-11-22T00:00:00.000Z', attributed: 800, total: 1200, owners: [], enabledBundles: [], compat: { error: 0, warn: 0, info: 0 }, counts: { bundles: 0, entries: 0, tools: 0, sections: 0 } },
      ],
      diff: { addedBundles: ['new-plugin'], removedBundles: [], attributedDelta: -200, totalDelta: -200, ownerDeltas: [], newBundleCosts: [{ name: 'new-plugin', tokens: 600 }], newCapabilities: [{ id: 'shell', delta: 1 }] },
      skipped: false,
    },
    verification: {
      last: {
        token: 'tok',
        at: '2026-11-22T00:00:00.000Z',
        applied: [{ id: 'bundle:demo-plugin', kind: 'bundle', name: 'demo-plugin' }],
        before: { attributed: 1000, total: 1400, enabledBundles: ['demo-plugin'], enabledEntries: [] },
        after: { attributed: 800, total: 1200, enabledBundles: ['demo-plugin'], enabledEntries: [] },
        deltaTokens: -200,
        deltaPercent: -20,
        confounded: false,
        unexpectedChanges: [],
      },
    },
    diagnostics: [],
  },
}
const config = {
  ok: true,
  data: {
    profile: 'web', profileDir: '/tmp/web', mode: 'advise', approvalMode: 'always',
    suggestionPolicy: 'conservative', approvalThreshold: 5, protect: [], pinned: [],
    trackUsage: true, usageRetentionDays: 30, maxDrafts: 20,
  },
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitFor(text: string): Promise<void> {
  for (let i = 0; i < 30; i++) {
    if (document.body.textContent?.includes(text)) return
    await act(async () => { await sleep(20) })
  }
  throw new Error(`missing text: ${text}`)
}

describe('client onboarding and pages', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>
  let slotComponents: Record<string, React.ComponentType>

  beforeEach(async () => {
    document.body.innerHTML = '<div id="root"></div>'
    container = document.getElementById('root') as HTMLDivElement
    slotComponents = {}
    window.localStorage.clear()
    window.sessionStorage.clear()
    window.localStorage.setItem('dsh-experience-optimizer.locale', 'zh')
    vi.stubGlobal('fetch', vi.fn(async (url: string) => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => (String(url).endsWith('/config') ? config : overview),
    })))
    let component: React.ComponentType | undefined
    const ctx = {
      slots: {
        inject(_name: string, callback: () => void) { callback() },
        register(options: { name?: string }, C: React.ComponentType) {
          if (options.name) slotComponents[options.name] = C
          if (options.name === 'settings.plugins.tab' || options.name === 'settings.section') component = C
          return () => undefined
        },
      },
    }
    ;(window as unknown as { __ModuleLoader__: { load: (entry: unknown) => void } }).__ModuleLoader__ = {
      load({ factory }: { factory: (require: (name: string) => unknown) => { apply: (target: unknown) => void } }) {
        factory((name: string) => name === 'react' ? React : undefined).apply(ctx)
      },
    }
    new Function(source)()
    if (!component) throw new Error('component did not register')
    root = createRoot(container)
    await act(async () => {
      root.render(React.createElement(component as React.ComponentType))
      await sleep(100)
    })
  })

  afterEach(async () => {
    overview.data.recipeAvailable = false
    overview.data.verdict.overall = 'ok'
    overview.data.verdict.headline = '通过'
    overview.data.compaction.health = 'ok'
    overview.data.compaction.backendCount = 1
    await act(async () => { root.unmount() })
    vi.unstubAllGlobals()
  })

  it('shows onboarding once and exposes tutorial/about/settings', async () => {
    await waitFor('新手引导')
    expect(container.querySelectorAll('.eo-progress-dot').length).toBe(4)
    const next = () => [...container.querySelectorAll('button')].find((button) => button.textContent?.trim() === '下一步')
    await act(async () => { next()?.click(); await sleep(20) })
    expect(container.textContent).toContain('看压缩链路')
    await act(async () => { next()?.click(); await sleep(20) })
    expect(container.textContent).toContain('生成方案')
    await act(async () => { next()?.click(); await sleep(20) })
    expect(container.textContent).toContain('应用并验证')
    expect(container.textContent).toContain('重启后看实测')
    const skip = [...container.querySelectorAll('button')].find((button) => button.textContent?.trim() === '跳过')
    expect(skip).toBeDefined()
    await act(async () => { skip?.click(); await sleep(30) })
    expect(window.localStorage.getItem('dsh-experience-optimizer.onboarding.v2')).toBe('1')

    const planToggle = [...container.querySelectorAll('.eo-card-toggle')].find((button) => button.textContent?.includes('插件体检方案'))
    expect(planToggle).toBeDefined()
    const planCard = planToggle?.closest('.eo-card')
    const planBody = planCard?.querySelector('.eo-collapse')
    await act(async () => { (planToggle as HTMLButtonElement).click(); await sleep(30) })
    expect(planBody?.classList.contains('is-collapsed')).toBe(true)
    expect(planBody?.getAttribute('aria-hidden')).toBe('true')
    expect(planBody?.hasAttribute('inert')).toBe(true)
    await act(async () => { (planToggle as HTMLButtonElement).click(); await sleep(30) })
    expect(planBody?.classList.contains('is-collapsed')).toBe(false)
    expect(planBody?.getAttribute('aria-hidden')).toBeNull()
    expect(planBody?.hasAttribute('inert')).toBe(false)
    expect(container.textContent).toContain('任务类型')
    expect(container.querySelector('.eo-progress-track')).not.toBeNull()
    expect(container.querySelectorAll('.eo-share-bar').length).toBeGreaterThan(0)
    expect(container.querySelector('.eo-mode-simple')).not.toBeNull()
    const fullView = [...container.querySelectorAll('button')].find((button) => button.textContent?.trim() === '完整视图')
    expect(fullView).toBeDefined()
    await act(async () => { fullView?.click(); await sleep(40) })
    expect(container.querySelector('.eo-mode-simple')).toBeNull()
    expect(container.textContent).toContain('生效后端')
    expect(container.textContent).toContain('预算 ')
    expect(container.querySelector('.eo-compat-footer')).not.toBeNull()
    expect(container.querySelector('.eo-verdict')).not.toBeNull()
    expect(container.textContent).toContain('体检结论')
    expect(container.textContent).toContain('压缩链路')
    expect(container.querySelector('.eo-compaction-row')).not.toBeNull()
    expect(container.textContent).toContain('上次实测')
    expect(container.textContent).toContain('-200 tokens')
    expect(container.textContent).toContain('能力面')
    expect(container.textContent).toContain('bash')
    expect(container.textContent).toContain('自上次体检')
    expect(container.querySelector('.eo-history-spark')).not.toBeNull()
    expect(container.textContent).toContain('mystery-section')
    expect(container.querySelector('.eo-unattributed')).not.toBeNull()
    expect(container.textContent).toContain('新装 ')
    expect(container.textContent).toContain('新增能力 shell')
    expect(container.querySelector('.eo-category-bar')).not.toBeNull()
    expect(container.textContent).toContain('宿主进程 RSS 412 MB')

    const tabs = [...container.querySelectorAll('button')]
    const tutorial = tabs.find((button) => button.textContent?.trim() === '教程')
    expect(tutorial).toBeDefined()
    await act(async () => { tutorial?.click(); await sleep(30) })
    expect(container.textContent).toContain('5 分钟上手')
    expect(container.textContent).toContain('先看结论')
    expect(container.textContent).toContain('看压缩链路')
    expect(container.textContent).toContain('重启后看实测')
    expect(container.querySelectorAll('.eo-tutorial-step').length).toBe(5)

    const about = tabs.find((button) => button.textContent?.trim() === '关于')
    await act(async () => { about?.click(); await sleep(30) })
    expect(container.textContent).toContain('关于项目')
    expect(container.textContent).toContain('1134419871')
    expect(container.querySelector('.eo-about-hero')).not.toBeNull()

    const clipboardWrite = vi.fn(async () => undefined)
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: { writeText: clipboardWrite },
    })
    const copyInstall = [...container.querySelectorAll('button')].find((button) => button.textContent?.trim() === '复制安装命令')
    expect(copyInstall).toBeDefined()
    await act(async () => { copyInstall?.click(); await sleep(30) })
    expect(clipboardWrite).toHaveBeenCalledWith('npm i dsh-plugin-trim')
    const trimTab = [...container.querySelectorAll('button')].find((button) => button.textContent?.trim() === '插件体检')
    expect(trimTab).toBeDefined()
    await act(async () => { trimTab?.click(); await sleep(40) })
    const copyReport = [...container.querySelectorAll('button')].find((button) => button.textContent?.trim() === '复制报告')
    expect(copyReport).toBeDefined()
    await act(async () => { copyReport?.click(); await sleep(30) })
    expect(clipboardWrite.mock.calls.some(([text]) => String(text).includes('# DSH 插件体检'))).toBe(true)

    const settings = tabs.find((button) => button.textContent?.trim() === '设置')
    await act(async () => { settings?.click(); await sleep(80) })
    const settingsText = container.textContent || ''
    expect(settingsText).toContain('修改后点击应用')
    expect(settingsText).toContain('审批与保护逻辑不会因为改设置而跳过')
    expect(settingsText.indexOf('修改后点击应用')).toBeLessThan(settingsText.indexOf('插件设置'))
    expect(settingsText).not.toContain('守卫')
    const mode = container.querySelector('select') as HTMLSelectElement
    expect(mode).not.toBeNull()
    await act(async () => {
      mode.value = 'auto-safe'
      mode.dispatchEvent(new Event('change', { bubbles: true }))
      await sleep(40)
    })
    expect(container.textContent).toContain('应用修改')
    const stepper = container.querySelector('.eo-stepper-up') as HTMLButtonElement
    const numeric = container.querySelector('.eo-param-input') as HTMLInputElement
    expect(stepper).not.toBeNull()
    expect(numeric).not.toBeNull()
    const previousValue = numeric.value
    await act(async () => { stepper.click(); await sleep(40) })
    expect(Number((container.querySelector('.eo-param-input') as HTMLInputElement).value)).toBe(Number(previousValue) + 1)
    expect(container.querySelector('.eo-param-track i')).not.toBeNull()

    const language = [...container.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'EN')
    expect(language).toBeDefined()
    await act(async () => { language?.click(); await sleep(40) })
    expect(container.textContent).toContain('Plugin checkup')
    expect(container.textContent).toContain('Guide')

    const trimEn = [...container.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Plugin checkup')
    expect(trimEn).toBeDefined()
    await act(async () => { trimEn?.click(); await sleep(40) })
    const copyReportEn = [...container.querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Copy report')
    expect(copyReportEn).toBeDefined()
    await act(async () => { copyReportEn?.click(); await sleep(30) })
    expect(clipboardWrite.mock.calls.some(([text]) => String(text).startsWith('# DSH Plugin Checkup') && String(text).includes('## Checks'))).toBe(true)

    await act(async () => { root.unmount() })
    const Bubble = slotComponents['conversation.composer.dock']
    const Reasoning = slotComponents['conversation.chat.reasoning.body']
    expect(Bubble).toBeDefined()
    expect(Reasoning).toBeDefined()

    root = createRoot(container)
    await act(async () => {
      root.render(React.createElement(Bubble as React.ComponentType, { sessionId: 'session-a' }))
    })
    await act(async () => { await sleep(1500) })
    expect(container.textContent).toContain('Measure first, then decide what to close.')
    const dismiss = container.querySelector('.eo-bubble-close') as HTMLButtonElement
    expect(dismiss).not.toBeNull()
    await act(async () => { dismiss.click(); await sleep(40) })
    expect(container.textContent).not.toContain('Measure first, then decide what to close.')

    await act(async () => { root.unmount() })
    root = createRoot(container)
    await act(async () => {
      root.render(React.createElement(Reasoning as React.ComponentType, {
        text: 'thinking',
        running: false,
        renderFactorySlot: () => React.createElement('div', { className: 'mock-reasoning' }, 'reasoning-body'),
      }))
    })
    await act(async () => { await sleep(80) })
    expect(container.textContent).toContain('1,000 tokens')
    expect(container.querySelector('.mock-reasoning')).not.toBeNull()

    await act(async () => { root.unmount() })
    const Activation = slotComponents['plugins.bundle.activation']
    expect(Activation).toBeDefined()
    root = createRoot(container)
    await act(async () => {
      root.render(React.createElement(Activation as React.ComponentType, {
        onDismiss: () => undefined,
        onOpenDetails: () => undefined,
      }))
    })
    expect(container.textContent).toContain('Plugin checkup is enabled')
    expect(container.textContent).toContain('Five steps')
    expect(container.textContent).toContain('Build a plan')
    expect(container.textContent).toContain('Measure after restart')
    expect(container.querySelectorAll('.eo-activation-steps li').length).toBe(5)
  })

  it('renders the activation guide with the shared five-step path', async () => {
    await act(async () => { root.unmount() })
    const Activation = slotComponents['plugins.bundle.activation']
    expect(Activation).toBeDefined()
    root = createRoot(container)
    await act(async () => {
      root.render(React.createElement(Activation as React.ComponentType, {
        onDismiss: () => undefined,
        onOpenDetails: () => undefined,
      }))
    })
    expect(container.textContent).toContain('5 步上手')
    expect(container.textContent).toContain('先看结论')
    expect(container.textContent).toContain('看压缩链路')
    expect(container.textContent).toContain('生成方案')
    expect(container.textContent).toContain('重启后看实测')
    expect(container.querySelectorAll('.eo-activation-steps li').length).toBe(5)
  })

  it('renders the main guide with navigation plus the eight-step path', async () => {
    await act(async () => { root.unmount() })
    const MainGuide = slotComponents['shell.overlay']
    expect(MainGuide).toBeDefined()
    root = createRoot(container)
    await act(async () => {
      root.render(React.createElement(MainGuide as React.ComponentType))
    })
    expect(container.textContent).toContain('打开后会先出现新手引导')
    expect(container.textContent).toContain('看结论 → 看压缩链路 → 生成方案 → 应用 → 重启后看实测')
    expect(container.querySelectorAll('.eo-guide-steps li').length).toBe(8)
    const toggle = [...container.querySelectorAll('button')].find((button) => button.textContent?.trim() === '收起步骤')
    expect(toggle).toBeDefined()
    await act(async () => { toggle?.click(); await sleep(20) })
    const reopen = [...container.querySelectorAll('button')].find((button) => button.textContent?.trim() === '查看 8 步路径')
    expect(reopen).toBeDefined()
  })

  it('generates a draft directly from the verdict action', async () => {
    const calls: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {
      calls.push(String(url))
      return {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({ ok: true, data: { profile: { id: 'draft-1', items: [] } } }),
      }
    }))
    const generate = [...container.querySelectorAll('button')].find((button) => button.textContent?.trim() === '生成瘦身方案')
    expect(generate).toBeDefined()
    await act(async () => { generate?.click(); await sleep(80) })
    expect(calls.some((url) => url.endsWith('/suggest'))).toBe(true)
  })

  it('warns in the composer when the checkup verdict needs attention', async () => {
    overview.data.verdict.overall = 'attention'
    overview.data.verdict.headline = '需处理 1 项'
    overview.data.verdict.checks[3].status = 'warn'
    overview.data.compaction.health = 'warn'
    overview.data.compaction.backendCount = 2

    const Bubble = slotComponents['conversation.composer.dock']
    expect(Bubble).toBeDefined()
    await act(async () => { root.unmount() })
    root = createRoot(container)
    await act(async () => {
      root.render(React.createElement(Bubble as React.ComponentType, { sessionId: 'warning' }))
    })
    await act(async () => { await sleep(1600) })
    expect(container.textContent).toContain('压缩链路：2 个后端同时启用')
  })

  it('hides the frozen recipe tab when recipe is not installed', async () => {
    await waitFor('新手引导')
    const skip = [...container.querySelectorAll('button')].find((button) => button.textContent?.trim() === '跳过')
    await act(async () => { skip?.click(); await sleep(40) })
    const recipeTab = [...container.querySelectorAll('button')].find((button) => button.textContent?.includes('工作流配方'))
    expect(recipeTab).toBeUndefined()
  })

  it('marks the recipe tab frozen and shows the deprecation banner', async () => {
    overview.data.recipeAvailable = true
    await waitFor('新手引导')
    const skip = [...container.querySelectorAll('button')].find((button) => button.textContent?.trim() === '跳过')
    await act(async () => { skip?.click(); await sleep(40) })

    const Panel = slotComponents['settings.plugins.tab']
    expect(Panel).toBeDefined()
    await act(async () => { root.unmount() })
    root = createRoot(container)
    await act(async () => {
      root.render(React.createElement(Panel as React.ComponentType))
      await sleep(140)
    })

    const recipeTab = [...container.querySelectorAll('button')].find((button) => button.textContent?.includes('工作流配方'))
    expect(recipeTab).toBeDefined()
    expect(recipeTab?.textContent).toContain('已冻结')
    await act(async () => { recipeTab?.click(); await sleep(60) })
    expect(container.textContent).toContain('暂时废弃（2026-11-22）')
  })
})
