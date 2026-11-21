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
    runtime: { dshVersion: '0.2.2-rc.1' },
    profile: { name: 'web', dir: '/tmp/web' },
    compat: { error: 0, warn: 0, info: 0, byDomain: {} },
    findings: [],
    context: { totalTokens: 1000, unattributedTokens: 400, topSections: [], topTools: [], byOwner: [] },
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
    await act(async () => { root.unmount() })
    vi.unstubAllGlobals()
  })

  it('shows onboarding once and exposes tutorial/about/settings', async () => {
    await waitFor('新手引导')
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

    const tabs = [...container.querySelectorAll('button')]
    const tutorial = tabs.find((button) => button.textContent?.trim() === '教程')
    expect(tutorial).toBeDefined()
    await act(async () => { tutorial?.click(); await sleep(30) })
    expect(container.textContent).toContain('5 分钟上手')

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
    expect(clipboardWrite).toHaveBeenCalledWith('npm i dsh-plugin-trim\nnpm i dsh-plugin-recipe')

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
  })
})
