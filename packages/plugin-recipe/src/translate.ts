import { newId, uniq } from 'dsh-shared-meta'
import type {
  CapabilitySeam,
  WizardAnswers,
  WorkflowBlueprint,
  WorkflowStep,
} from 'dsh-shared-meta'
import { defaultsFor, isAutomated } from './wizard.ts'

export interface TranslateOptions {
  available: Set<string>
  suggestedDisable?: readonly string[]
}

/** Translate a business goal plus answers into a workflow blueprint. */
export function translateGoal(
  goal: string,
  answers: WizardAnswers,
  capabilities: readonly CapabilitySeam[],
  options: TranslateOptions,
): WorkflowBlueprint {
  const filled = defaultsFor(goal, answers)
  const weekly = /周报|weekly|report|汇报/i.test(goal) && /git|commit|代码|变更|项目/i.test(goal)
  const steps = weekly
    ? weeklyReportSteps(filled, capabilities, options)
    : genericSteps(filled, capabilities, options)
  const uncertainties = collectUncertainties(filled, steps, capabilities, options)
  const selected = capabilities.filter((capability) =>
    steps.some((step) => step.capabilityId === capability.id),
  )
  const permissions = uniq(selected.flatMap((capability) => capability.permissions))
  const acceptance = uniq([
    ...(filled.acceptance ?? []),
    ...(weekly ? ['包含指定分支与时间范围', '发送前人工确认'] : []),
  ])
  return {
    schemaVersion: 1,
    id: newId('wf'),
    createdAt: new Date().toISOString(),
    goal,
    template: weekly ? 'weekly-report' : 'generic',
    answers: filled,
    steps,
    minPluginSet: uniq(steps.flatMap((step) => step.pluginIds)),
    suggestedDisable: [...(options.suggestedDisable ?? [])],
    permissions,
    failurePolicy: [
      filled.onFailure ?? '保留草稿并在对话中通知',
      '采集步骤最多重试一次；外部发送不静默重试',
    ].join('；'),
    acceptance,
    rollback: weekly
      ? '停用 schedule 任务；保留已生成的周报文件；不修改仓库；恢复原插件配置。'
      : '停用 schedule 任务；保留已生成文件；恢复原插件配置。',
    uncertainties,
  }
}

function weeklyReportSteps(
  answers: WizardAnswers,
  capabilities: readonly CapabilitySeam[],
  options: TranslateOptions,
): WorkflowStep[] {
  const steps: WorkflowStep[] = []
  const git = find(capabilities, 'git-history')
  if (git !== undefined && options.available.has(git.id)) {
    steps.push(
      toolStep('s1', '读取指定时间范围与分支的 Git log/diff', git, [], false, [
        '时间范围',
        '分支',
      ], ['commit 列表', 'diff 统计']),
    )
  }
  const summary = find(capabilities, 'model-summary')
  if (summary !== undefined) {
    steps.push({
      id: 's2',
      intent: '按模块/作者汇总 commit、风险与待办',
      kind: 'model',
      capabilityId: summary.id,
      toolNames: [],
      pluginIds: [],
      dependsOn: steps.map((step) => step.id),
      needsConfirm: false,
      inputs: ['commit 列表', 'diff 统计'],
      outputs: ['周报正文草稿'],
      onFailure: '保留上下文，提示用户补充数据',
    })
  }
  const write = find(capabilities, 'file-write')
  if (write !== undefined && options.available.has(write.id)) {
    steps.push(
      toolStep('s3', '生成 Markdown 周报文件', write, lastIds(steps), false, ['周报正文草稿'], ['Markdown 文件']),
    )
  }
  const delivery = chooseDelivery(answers, capabilities, options)
  if (delivery !== undefined) {
    steps.push(
      toolStep('s4', '交付/发送周报', delivery, lastIds(steps), true, ['Markdown 文件'], ['交付结果']),
    )
  }
  if (isAutomated(answers.goal, answers)) {
    const schedule = find(capabilities, 'schedule')
    if (schedule !== undefined && options.available.has(schedule.id)) {
      steps.push(
        toolStep('s5', '创建每周定时任务', schedule, lastIds(steps), true, ['完整工作流'], ['schedule 任务 id']),
      )
    }
  }
  return steps
}

function genericSteps(
  answers: WizardAnswers,
  capabilities: readonly CapabilitySeam[],
  options: TranslateOptions,
): WorkflowStep[] {
  const steps: WorkflowStep[] = []
  const selected = capabilities.filter(
    (capability) =>
      capability.id !== 'schedule' &&
      capability.id !== 'model-summary' &&
      options.available.has(capability.id) &&
      capability.keywords.some((keyword) => answers.goal.toLowerCase().includes(keyword.toLowerCase())),
  )
  for (const capability of selected.slice(0, 6)) {
    steps.push(
      toolStep(
        `s${steps.length + 1}`,
        capability.purpose,
        capability,
        lastIds(steps),
        capability.needsConfirm,
        ['工作区/输入数据'],
        [capability.name],
      ),
    )
  }
  if (steps.length > 0 && /汇总|总结|报告|summary|report/i.test(answers.goal)) {
    const summary = find(capabilities, 'model-summary')
    if (summary !== undefined) {
      steps.push({
        id: `s${steps.length + 1}`,
        intent: '汇总上一步结果并生成可读内容',
        kind: 'model',
        capabilityId: summary.id,
        toolNames: [],
        pluginIds: [],
        dependsOn: lastIds(steps),
        needsConfirm: false,
        inputs: ['上一步输出'],
        outputs: ['汇总文本'],
        onFailure: '保留中间结果并提示用户',
      })
    }
  }
  if (isAutomated(answers.goal, answers)) {
    const schedule = find(capabilities, 'schedule')
    if (schedule !== undefined && options.available.has(schedule.id)) {
      steps.push(
        toolStep(
          `s${steps.length + 1}`,
          '创建定时任务',
          schedule,
          lastIds(steps),
          true,
          ['完整工作流'],
          ['schedule 任务 id'],
        ),
      )
    }
  }
  return steps
}

function toolStep(
  id: string,
  intent: string,
  capability: CapabilitySeam,
  dependsOn: string[],
  needsConfirm: boolean,
  inputs: string[],
  outputs: string[],
): WorkflowStep {
  return {
    id,
    intent,
    kind: capability.trigger === 'schedule' ? 'schedule' : 'tool',
    capabilityId: capability.id,
    toolNames: [...capability.tools],
    pluginIds: [...capability.pluginIds],
    dependsOn: [...dependsOn],
    needsConfirm: needsConfirm || capability.needsConfirm,
    inputs,
    outputs,
    onFailure:
      capability.trigger === 'schedule'
        ? '停用本次运行并通知用户'
        : '保留草稿；采集步骤最多重试一次',
  }
}

function collectUncertainties(
  answers: WizardAnswers,
  steps: readonly WorkflowStep[],
  capabilities: readonly CapabilitySeam[],
  options: TranslateOptions,
): string[] {
  const uncertainties: string[] = []
  if (steps.length === 0) {
    uncertainties.push('没有匹配到可用能力；请补充目标、数据来源或安装对应工具插件')
  }
  if (find(capabilities, 'git-history') === undefined || !options.available.has('git-history')) {
    if (/git|commit|代码|变更/i.test(answers.goal)) uncertainties.push('缺少 Git 读取能力（bash 工具不可用）')
  }
  if (find(capabilities, 'file-write') === undefined || !options.available.has('file-write')) {
    if (/markdown|文档|报告|周报/i.test(answers.goal)) uncertainties.push('缺少文件写入能力（write/edit 工具不可用）')
  }
  if (isAutomated(answers.goal, answers) && !steps.some((step) => step.kind === 'schedule')) {
    uncertainties.push('用户要求自动化，但当前没有可用的 schedule 能力')
  }
  if (!steps.some((step) => step.needsConfirm) && /发送|通知|邮件|钉钉|delivery/i.test(answers.delivery ?? '')) {
    uncertainties.push('外部发送步骤缺少人工确认')
  }
  uncertainties.push(
    'agent preset 自带的工具由 preset 提供，trim 不能单独开关；蓝图按“当前可用”生成',
  )
  return uniq(uncertainties)
}

function chooseDelivery(
  answers: WizardAnswers,
  capabilities: readonly CapabilitySeam[],
  options: TranslateOptions,
): CapabilitySeam | undefined {
  const requested = (answers.delivery ?? '').toLowerCase()
  const custom = capabilities.find(
    (capability) =>
      capability.id !== 'present' &&
      (requested.includes(capability.id.toLowerCase()) ||
        requested.includes(capability.name.toLowerCase()) ||
        capability.keywords.some((keyword) => requested.includes(keyword.toLowerCase()))),
  )
  if (custom !== undefined && options.available.has(custom.id)) return custom
  const present = find(capabilities, 'present')
  if (present !== undefined && options.available.has(present.id)) return present
  return undefined
}

function find(capabilities: readonly CapabilitySeam[], id: string): CapabilitySeam | undefined {
  return capabilities.find((capability) => capability.id === id)
}

function lastIds(steps: readonly WorkflowStep[]): string[] {
  if (steps.length === 0) return []
  const last = steps[steps.length - 1]
  return last === undefined ? [] : [last.id]
}
