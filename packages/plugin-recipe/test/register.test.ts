import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import { apply } from '../src/index.ts'
import type { Config } from '../src/config.ts'

const cleanups: Array<() => Promise<void>> = []
const originalHome = process.env.DSH_HOME

afterEach(async () => {
  process.env.DSH_HOME = originalHome
  for (const cleanup of cleanups.splice(0)) await cleanup()
})

const config: Config = {
  maxSteps: 12,
  allowExport: true,
  capabilitiesFile: '',
  defaultDelivery: 'present',
}

function fakeContext(): { ctx: Context; definitions: Array<{ name: string; execute: Function }> } {
  const definitions: Array<{ name: string; execute: Function }> = []
  const ctx = {
    tools: {
      register(definition: { name: string; execute: Function }) {
        definitions.push(definition)
        return () => undefined
      },
      get() {
        return {}
      },
    },
    get(name: string) {
      if (name === 'schedule') return {}
      return undefined
    },
  } as unknown as Context
  return { ctx, definitions }
}

describe('plugin registration', () => {
  it('registers the recipe tool surface without a live profile', () => {
    const { ctx, definitions } = fakeContext()
    apply(ctx, config)
    expect(definitions.map((definition) => definition.name)).toEqual(
      expect.arrayContaining([
        'recipe_plan_workflow',
        'recipe_validate_workflow',
        'recipe_export_workflow',
      ]),
    )
  })

  it('defaults config when the loader passes undefined', () => {
    const { ctx, definitions } = fakeContext()
    apply(ctx, undefined)
    expect(definitions.some((definition) => definition.name === 'recipe_plan_workflow')).toBe(true)
  })

  it('walks the wizard through the registered tool', async () => {
    const home = await mkdtemp(join(tmpdir(), 'dsh-recipe-tool-'))
    process.env.DSH_HOME = home
    cleanups.push(() => rm(home, { recursive: true, force: true }))
    const { ctx, definitions } = fakeContext()
    apply(ctx, config)
    const tool = definitions.find((definition) => definition.name === 'recipe_plan_workflow')
    expect(tool).toBeDefined()
    const first = await tool!.execute(
      { goal: '我想每周自动整理项目周报，数据来自 Git log' },
      { agent: undefined, toolSet: undefined },
    )
    expect(String(first)).toContain('还需要确认')
    const second = await tool!.execute(
      {
        goal: '我想每周自动整理项目周报，数据来自 Git log',
        answers: {
          scope: '当前工作区',
          frequency: '每周一 09:00',
          sources: ['Git log'],
          outputFormat: 'Markdown',
          delivery: 'present',
          onFailure: '保留草稿并通知',
          acceptance: ['时间范围正确'],
        },
      },
      { agent: undefined, toolSet: undefined },
    )
    expect(String(second)).toContain('工作流蓝图')
  })
})
