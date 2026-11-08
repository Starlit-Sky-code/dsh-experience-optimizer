import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import type { WizardAnswers, WorkflowBlueprint } from 'dsh-shared-meta'
import { BUILT_IN_CAPABILITIES } from '../src/capabilities.ts'
import { defaultsFor, isWorkflowGoal, nextQuestion } from '../src/wizard.ts'
import { translateGoal } from '../src/translate.ts'
import { validateBlueprint, renderValidation } from '../src/validate.ts'
import { exportBlueprint, renderBlueprintMarkdown } from '../src/export.ts'

const cleanups: Array<() => Promise<void>> = []
const originalHome = process.env.DSH_HOME

afterEach(async () => {
  process.env.DSH_HOME = originalHome
  for (const cleanup of cleanups.splice(0)) await cleanup()
})

const goal = '我想每周自动整理项目周报，数据来自 Git log'
const available = new Set(BUILT_IN_CAPABILITIES.map((capability) => capability.id))

function blueprint(): WorkflowBlueprint {
  const answers = defaultsFor(goal, { goal })
  return translateGoal(goal, answers, BUILT_IN_CAPABILITIES, { available })
}

describe('wizard', () => {
  it('recognizes workflow and non-workflow goals', () => {
    expect(isWorkflowGoal(goal)).toBe(true)
    expect(isWorkflowGoal('解释一下这个函数')).toBe(false)
  })

  it('asks at most the four planned question groups', () => {
    const answers: Partial<WizardAnswers> = { goal }
    const first = nextQuestion(goal, { goal })
    expect(first?.step).toBe('scope-frequency')
    const second = nextQuestion(goal, {
      goal,
      scope: '当前工作区',
      frequency: '每周一 09:00',
    })
    expect(second?.step).toBe('sources')
    const third = nextQuestion(goal, {
      goal,
      scope: '当前工作区',
      frequency: '每周一 09:00',
      sources: ['Git log'],
    })
    expect(third?.step).toBe('output-delivery')
    const fourth = nextQuestion(goal, {
      goal,
      scope: '当前工作区',
      frequency: '每周一 09:00',
      sources: ['Git log'],
      outputFormat: 'Markdown',
      delivery: 'present',
    })
    expect(fourth?.step).toBe('failure-acceptance')
    expect(answers).toBeDefined()
  })
})

describe('translation', () => {
  it('builds the weekly-report blueprint', () => {
    const bp = blueprint()
    expect(bp.template).toBe('weekly-report')
    expect(bp.steps.map((step) => step.id)).toEqual(['s1', 's2', 's3', 's4', 's5'])
    expect(bp.steps.find((step) => step.id === 's4')?.needsConfirm).toBe(true)
    expect(bp.minPluginSet).toContain('@deepseek-ai/dsh-tool-bash')
    expect(bp.minPluginSet).toContain('@deepseek-ai/dsh-tool-fs')
    expect(bp.minPluginSet).toContain('@deepseek-ai/dsh-tool-schedule')
    expect(bp.acceptance.length).toBeGreaterThan(0)
    expect(bp.rollback.length).toBeGreaterThan(0)
  })

  it('does not invent a send capability when present is unavailable', () => {
    const withoutPresent = new Set(
      [...available].filter((id) => id !== 'present' && id !== 'schedule'),
    )
    const bp = translateGoal(goal, defaultsFor(goal, { goal }), BUILT_IN_CAPABILITIES, {
      available: withoutPresent,
    })
    expect(bp.steps.some((step) => step.kind === 'schedule')).toBe(false)
    expect(bp.uncertainties.some((item) => item.includes('schedule'))).toBe(true)
  })
})

describe('validation', () => {
  it('passes the weekly blueprint with available tools', () => {
    const issues = validateBlueprint(blueprint(), {
      toolExists: () => true,
      pluginKnown: () => true,
      scheduleAvailable: true,
      maxSteps: 12,
      capabilities: BUILT_IN_CAPABILITIES,
    })
    expect(issues.filter((issue) => issue.level === 'error')).toHaveLength(0)
  })

  it('detects a dependency cycle', () => {
    const bp = blueprint()
    const first = bp.steps[0]!
    const second = bp.steps[1]!
    const cyclic = {
      ...bp,
      steps: [
        { ...first, dependsOn: [second.id] },
        { ...second, dependsOn: [first.id] },
      ],
    }
    const issues = validateBlueprint(cyclic, {
      toolExists: () => true,
      pluginKnown: () => true,
      scheduleAvailable: true,
      maxSteps: 12,
      capabilities: BUILT_IN_CAPABILITIES,
    })
    expect(issues.some((issue) => issue.code === 'CYCLE')).toBe(true)
  })

  it('detects missing tools', () => {
    const issues = validateBlueprint(blueprint(), {
      toolExists: (name) => name !== 'bash',
      pluginKnown: () => true,
      scheduleAvailable: true,
      maxSteps: 12,
      capabilities: BUILT_IN_CAPABILITIES,
    })
    expect(issues.some((issue) => issue.code === 'MISSING_TOOL')).toBe(true)
  })

  it('renders a validation table', () => {
    const text = renderValidation([
      { level: 'error', code: 'X', message: 'bad' },
    ])
    expect(text).toContain('X')
  })
})

describe('export', () => {
  it('writes Markdown and JSON to the DSH data directory', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dsh-recipe-home-'))
    process.env.DSH_HOME = dir
    cleanups.push(() => rm(dir, { recursive: true, force: true }))
    const bp = blueprint()
    const result = await exportBlueprint(bp, 'both')
    expect(result.markdownPath).toBeDefined()
    expect(result.jsonPath).toBeDefined()
    const markdown = await readFile(result.markdownPath!, 'utf8')
    expect(markdown).toContain('# 工作流蓝图')
    expect(markdown).toContain('验收清单')
    const json = JSON.parse(await readFile(result.jsonPath!, 'utf8')) as WorkflowBlueprint
    expect(json.id).toBe(bp.id)
  })

  it('renders the runbook', () => {
    const text = renderBlueprintMarkdown(blueprint())
    expect(text).toContain('## 6. 运行手册')
    expect(text).toContain('## 8. 回滚')
  })
})

describe('compatibility integration', () => {
  it('flags a blueprint step whose plugin has a compat error', () => {
    const bp = blueprint()
    const issues = validateBlueprint(bp, {
      toolExists: () => true,
      pluginKnown: () => true,
      scheduleAvailable: true,
      maxSteps: 12,
      capabilities: BUILT_IN_CAPABILITIES,
      compatFindings: [
        {
          id: 'compat',
          domain: 'plugin-runtime',
          code: 'RT_ENGINE_UNMET',
          severity: 'error',
          title: 'incompatible',
          subjects: ['@deepseek-ai/dsh-tool-bash'],
          evidence: [],
          confidence: 'high',
          autoApplicable: false,
        },
      ],
    })
    expect(issues.some((issue) => issue.code === 'COMPAT_CONFLICT')).toBe(true)
  })
})
