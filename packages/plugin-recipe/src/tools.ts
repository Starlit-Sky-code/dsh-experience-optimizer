import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import {
  AuditLog,
  dataDir,
  escapeMarkdownCell,
  isRecord,
  jsonBlock,
  readJson,
} from 'dsh-shared-meta'
import type {
  CapabilitySeam,
  CompatReport,
  SlimProfile,
  ValidationIssue,
  WizardAnswers,
  WorkflowBlueprint,
} from 'dsh-shared-meta'
import type { Config } from './config.ts'
import {
  availableCapabilities,
  loadCapabilities,
} from './capabilities.ts'
import {
  defaultsFor,
  isWorkflowGoal,
  nextQuestion,
} from './wizard.ts'
import { translateGoal } from './translate.ts'
import { renderValidation, validateBlueprint } from './validate.ts'
import { exportBlueprint, renderBlueprintMarkdown, type ExportFormat } from './export.ts'

/** Register the recipe model-facing tools. */
export function registerRecipeTools(ctx: Context, config: Config): void {
  ctx.tools.register(
    defineTool({
      name: 'recipe_plan_workflow',
      description:
        'Translate a business goal into a validated DSH workflow blueprint through at most four concise questions. Returns one question at a time until enough answers exist, then a blueprint with steps, capability seams, minimum plugin set, permissions, failure policy, acceptance checklist, rollback, and uncertainties. Do not invent missing capabilities; report them in uncertainties. Read-only; never creates schedules or edits plugins.',
      parameters: {
        goal: {
          type: 'string',
          required: true,
          description: 'The user business goal, in their own words.',
        },
        answers: {
          type: 'json',
          description:
            'Answers gathered so far: { scope?, frequency?, sources?, outputFormat?, delivery?, onFailure?, acceptance? }. Reuse the same goal across calls.',
        },
        trimProfileId: {
          type: 'string',
          description: 'Optional trim slim-profile id whose suggested disables should be attached.',
        },
        forceBlueprint: {
          type: 'boolean',
          description: 'Skip remaining questions and emit a draft with assumptions and uncertainties.',
        },
      },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args, exec) {
        const goal = args.goal.trim()
        if (!isWorkflowGoal(goal) && args.forceBlueprint !== true) {
          return [
            '# 不需要编排',
            '',
            '这个目标更像普通问答或单步任务，建议直接在当前会话完成，不必生成工作流。',
            '如果确实需要自动化，请补充“周期、数据来源、输出、交付方式”后重试。',
          ].join('\n')
        }
        const partial = readAnswers(args.answers)
        const question = nextQuestion(goal, { goal, ...partial }, {
          forceBlueprint: args.forceBlueprint,
        })
        if (question !== null) {
          return renderQuestion(goal, question, partial)
        }

        const catalog = await loadCapabilities(config.capabilitiesFile)
        const toolExists = (name: string): boolean => ctx.tools.get(name, exec.agent) !== undefined
        const known = await knownPlugins(ctx, catalog.capabilities, toolExists)
        const compat = await readCompatReport()
        const blocked = blockedSubjects(compat)
        const capabilities = availableCapabilities(catalog.capabilities, toolExists).filter(
          (capability) =>
            !capability.pluginIds.some((plugin) => blocked.has(plugin)) &&
            !capability.tools.some((tool) => blocked.has(tool)),
        )
        const available = new Set(capabilities.map((capability) => capability.id))
        const filled = defaultsFor(goal, { goal, ...partial })
        const suggestedDisable = await readSuggestedDisable(args.trimProfileId)
        const blueprint = translateGoal(goal, filled, catalog.capabilities, {
          available,
          suggestedDisable,
        })
        if (blocked.size > 0) {
          blueprint.uncertainties.push(
            `兼容性报告存在 error，以下主体被排除：${[...blocked].slice(0, 10).join(', ')}`,
          )
        }
        for (const diagnostic of catalog.diagnostics) blueprint.uncertainties.push(diagnostic)
        blueprint.uncertainties = [...new Set(blueprint.uncertainties)]

        const issues = validateBlueprint(blueprint, {
          toolExists,
          pluginKnown: (name) => known.has(name),
          scheduleAvailable: ctx.get('schedule') !== undefined,
          maxSteps: config.maxSteps,
          capabilities: catalog.capabilities,
          compatFindings: compat?.findings,
        })
        await audit('plan_workflow', 'ok', `blueprint ${blueprint.id}: ${blueprint.steps.length} steps`)
        return renderBlueprint(blueprint, issues)
      },
      presentCall: () => ({ card: 'generic', title: 'Plan workflow', kind: 'read' }),
    }),
  )

  ctx.tools.register(
    defineTool({
      name: 'recipe_validate_workflow',
      description:
        'Validate a workflow blueprint for missing tools/capabilities, dependency cycles, schedule service availability, human confirmation, rollback, acceptance criteria, and compatibility conflicts. Read-only.',
      parameters: {
        blueprint: {
          type: 'json',
          required: true,
          description: 'The blueprint object returned by recipe_plan_workflow.',
        },
      },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args, exec) {
        if (!isWorkflowBlueprint(args.blueprint)) {
          return '❌ blueprint 缺少必要字段（schemaVersion/id/goal/steps）。'
        }
        const catalog = await loadCapabilities(config.capabilitiesFile)
        const toolExists = (name: string): boolean => ctx.tools.get(name, exec.agent) !== undefined
        const known = await knownPlugins(ctx, catalog.capabilities, toolExists)
        const compat = await readCompatReport()
        const issues = validateBlueprint(args.blueprint, {
          toolExists,
          pluginKnown: (name) => known.has(name),
          scheduleAvailable: ctx.get('schedule') !== undefined,
          maxSteps: config.maxSteps,
          capabilities: catalog.capabilities,
          compatFindings: compat?.findings,
        })
        await audit('validate_workflow', issues.some((issue) => issue.level === 'error') ? 'fail' : 'ok', `${issues.length} issues`)
        return `# 蓝图校验\n\n${renderValidation(issues)}`
      },
      presentCall: () => ({ card: 'generic', title: 'Validate workflow', kind: 'read' }),
    }),
  )

  ctx.tools.register(
    defineTool({
      name: 'recipe_export_workflow',
      description:
        'Write a workflow blueprint and runbook to $DSH_HOME/experience-optimizer/recipe/blueprints as Markdown and/or JSON. Call only when the user asks to export. Does not create schedules or modify plugins.',
      parameters: {
        blueprint: {
          type: 'json',
          required: true,
          description: 'The blueprint object returned by recipe_plan_workflow.',
        },
        format: {
          type: 'string',
          enum: ['markdown', 'json', 'both'],
          description: 'Export format. Default both.',
        },
      },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args) {
        if (config.allowExport !== true) {
          return '❌ 当前配置禁止导出蓝图（allowExport: false）。'
        }
        if (!isWorkflowBlueprint(args.blueprint)) {
          return '❌ blueprint 缺少必要字段（schemaVersion/id/goal/steps）。'
        }
        const format = (args.format ?? 'both') as ExportFormat
        const result = await exportBlueprint(args.blueprint, format)
        await audit('export_workflow', 'ok', `exported ${args.blueprint.id}`)
        return [
          '# 蓝图已导出',
          '',
          result.markdownPath === undefined ? '' : `- Markdown：${result.markdownPath}`,
          result.jsonPath === undefined ? '' : `- JSON：${result.jsonPath}`,
          '',
          '可用 `present` 工具把 Markdown 文件交付给用户。',
        ]
          .filter((line) => line.length > 0)
          .join('\n')
      },
      presentCall: () => ({ card: 'generic', title: 'Export workflow', kind: 'other' }),
    }),
  )
}

function renderQuestion(
  goal: string,
  question: NonNullable<ReturnType<typeof nextQuestion>>,
  partial: Partial<WizardAnswers>,
): string {
  const answered = Object.entries(partial)
    .filter(([, value]) => value !== undefined)
    .map(([key]) => key)
  return [
    '# 还需要确认',
    '',
    `目标：${goal}`,
    '',
    `**${question.question}**`,
    '',
    '默认推测（可直接确认或修正）：',
    ...question.defaults.map((defaultValue) => `- ${defaultValue}`),
    '',
    `已回答字段：${answered.length === 0 ? '无' : answered.join(', ')}`,
    '',
    '请把用户回答填入 answers 后再次调用 `recipe_plan_workflow`；同一 goal 复用即可。',
  ].join('\n')
}

function renderBlueprint(
  blueprint: WorkflowBlueprint,
  issues: readonly ValidationIssue[],
): string {
  const lines: string[] = []
  lines.push(`# 工作流蓝图：${blueprint.goal}`)
  lines.push('')
  lines.push(`- 模板：${blueprint.template}`)
  lines.push(`- 蓝图 id：\`${blueprint.id}\``)
  lines.push(`- 最小插件集：${blueprint.minPluginSet.length === 0 ? '（无）' : blueprint.minPluginSet.join(', ')}`)
  lines.push('')
  lines.push('## 步骤')
  lines.push('')
  lines.push('| # | 意图 | 类型 | 能力 | 工具 | 依赖 | 确认 |')
  lines.push('|---|---|---|---|---|---|---|')
  for (const step of blueprint.steps) {
    lines.push(
      `| ${step.id} | ${escapeMarkdownCell(step.intent)} | ${step.kind} | ${step.capabilityId ?? '—'} | ${escapeMarkdownCell(step.toolNames.join(', '))} | ${step.dependsOn.join(', ') || '—'} | ${step.needsConfirm ? 'yes' : 'no'} |`,
    )
  }
  lines.push('')
  lines.push('## 权限与失败策略')
  lines.push('')
  lines.push(`- 权限：${blueprint.permissions.join(', ') || '无'}`)
  lines.push(`- 失败策略：${blueprint.failurePolicy}`)
  lines.push(`- 回滚：${blueprint.rollback}`)
  lines.push('')
  lines.push('## 验收')
  lines.push('')
  for (const item of blueprint.acceptance) lines.push(`- [ ] ${item}`)
  lines.push('')
  if (blueprint.uncertainties.length > 0) {
    lines.push('## 不确定性')
    lines.push('')
    for (const item of blueprint.uncertainties) lines.push(`- ${item}`)
    lines.push('')
  }
  lines.push('## 校验')
  lines.push('')
  lines.push(renderValidation(issues))
  lines.push('')
  lines.push('## 机器可读蓝图')
  lines.push('')
  lines.push(jsonBlock(blueprint, 20_000))
  lines.push('')
  lines.push(
    '下一步：可以调用 `recipe_validate_workflow` 重新校验，或调用 `recipe_export_workflow` 导出运行手册。',
  )
  return lines.join('\n')
}

function readAnswers(raw: unknown): Partial<WizardAnswers> {
  if (!isRecord(raw)) return {}
  const out: Partial<WizardAnswers> = {}
  if (typeof raw.scope === 'string') out.scope = raw.scope
  if (typeof raw.frequency === 'string') out.frequency = raw.frequency
  if (Array.isArray(raw.sources)) {
    out.sources = raw.sources.filter((item): item is string => typeof item === 'string')
  }
  if (typeof raw.outputFormat === 'string') out.outputFormat = raw.outputFormat
  if (typeof raw.delivery === 'string') out.delivery = raw.delivery
  if (typeof raw.onFailure === 'string') out.onFailure = raw.onFailure
  if (Array.isArray(raw.acceptance)) {
    out.acceptance = raw.acceptance.filter((item): item is string => typeof item === 'string')
  }
  return out
}

function isWorkflowBlueprint(value: unknown): value is WorkflowBlueprint {
  if (!isRecord(value)) return false
  return (
    value.schemaVersion === 1 &&
    typeof value.id === 'string' &&
    typeof value.goal === 'string' &&
    Array.isArray(value.steps)
  )
}

async function readCompatReport(): Promise<CompatReport | undefined> {
  return readJson<CompatReport>(dataDir('compat', 'report.json')).catch(() => undefined)
}

async function knownPlugins(
  ctx: Context,
  capabilities: readonly CapabilitySeam[],
  toolExists: (name: string) => boolean,
): Promise<Set<string>> {
  const known = new Set<string>()
  for (const capability of capabilities) {
    if (!capability.tools.some((tool) => toolExists(tool))) continue
    for (const plugin of capability.pluginIds) known.add(plugin)
  }
  const manager = ctx.get('pluginManager') as
    | { listBundles?: () => Promise<Array<{ name?: string }>> }
    | undefined
  if (typeof manager?.listBundles === 'function') {
    try {
      for (const bundle of await manager.listBundles()) {
        if (typeof bundle.name === 'string') known.add(bundle.name)
      }
    } catch {
      // The plugin manager may be unavailable or degraded; tool presence is still checked.
    }
  }
  return known
}

function blockedSubjects(report: CompatReport | undefined): Set<string> {
  const set = new Set<string>()
  for (const finding of report?.findings ?? []) {
    if (finding.severity !== 'error') continue
    for (const subject of finding.subjects) set.add(subject)
  }
  return set
}

async function readSuggestedDisable(profileId: string | undefined): Promise<string[]> {
  if (profileId === undefined || profileId.length === 0) return []
  const profile = await readJson<SlimProfile>(
    dataDir('trim', 'profiles', `${profileId.replace(/[^a-zA-Z0-9._-]/g, '_')}.json`),
  ).catch(() => undefined)
  if (profile === undefined) return []
  return profile.items
    .filter((item) => item.action === 'suggest-disable')
    .map((item) => item.name)
}

async function audit(action: string, result: 'ok' | 'fail' | 'skipped', summary: string): Promise<void> {
  await new AuditLog()
    .append({
      t: new Date().toISOString(),
      actor: 'recipe',
      action,
      subject: 'recipe',
      result,
      summary,
    })
    .catch(() => undefined)
}

export { renderBlueprintMarkdown, type CapabilitySeam }
