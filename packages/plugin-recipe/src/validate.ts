import type {
  CapabilitySeam,
  CompatFinding,
  ValidationIssue,
  WorkflowBlueprint,
} from 'dsh-shared-meta'

export interface ValidateDeps {
  toolExists: (name: string) => boolean
  pluginKnown: (name: string) => boolean
  scheduleAvailable: boolean
  maxSteps: number
  capabilities: readonly CapabilitySeam[]
  compatFindings?: readonly CompatFinding[]
}

/** Validate a blueprint for dependencies, capabilities, permissions, failure handling, and compat. */
export function validateBlueprint(
  blueprint: WorkflowBlueprint,
  deps: ValidateDeps,
): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const steps = Array.isArray(blueprint.steps) ? blueprint.steps : []
  if (steps.length === 0) {
    issues.push({ level: 'error', code: 'EMPTY_STEPS', message: '蓝图没有步骤' })
  }
  if (steps.length > deps.maxSteps) {
    issues.push({
      level: 'warn',
      code: 'TOO_MANY_STEPS',
      message: `步骤数 ${steps.length} 超过上限 ${deps.maxSteps}，建议拆分`,
    })
  }

  const ids = new Set<string>()
  for (const step of steps) {
    if (ids.has(step.id)) {
      issues.push({ level: 'error', code: 'DUPLICATE_STEP_ID', message: `重复步骤 id ${step.id}`, stepId: step.id })
    }
    ids.add(step.id)
  }

  const capabilityIds = new Set(deps.capabilities.map((capability) => capability.id))
  for (const step of steps) {
    for (const dependency of step.dependsOn) {
      if (!ids.has(dependency)) {
        issues.push({
          level: 'error',
          code: 'BAD_DEP',
          message: `${step.id} 依赖不存在的 ${dependency}`,
          stepId: step.id,
        })
      }
    }
    if (step.capabilityId !== null && !capabilityIds.has(step.capabilityId)) {
      issues.push({
        level: 'error',
        code: 'MISSING_CAPABILITY',
        message: `${step.id} 使用未知能力 ${step.capabilityId}`,
        stepId: step.id,
      })
    }
    for (const tool of step.toolNames) {
      if (!deps.toolExists(tool)) {
        issues.push({
          level: 'error',
          code: 'MISSING_TOOL',
          message: `${step.id} 需要的工具 ${tool} 在当前 scope 不可用`,
          stepId: step.id,
        })
      }
    }
    for (const plugin of step.pluginIds) {
      if (!deps.pluginKnown(plugin)) {
        issues.push({
          level: 'warn',
          code: 'PLUGIN_NOT_FOUND',
          message: `${step.id} 的插件 ${plugin} 不在当前 profile 中（可能由 preset 提供）`,
          stepId: step.id,
        })
      }
    }
  }

  if (hasCycle(steps)) {
    issues.push({ level: 'error', code: 'CYCLE', message: '步骤依赖存在环' })
  }

  if (steps.some((step) => step.kind === 'schedule') && !deps.scheduleAvailable) {
    issues.push({
      level: 'error',
      code: 'NO_SCHEDULE_SERVICE',
      message: '蓝图包含定时步骤，但当前 profile 没有 schedule 服务',
    })
  }
  if (steps.some((step) => step.kind === 'schedule') && blueprint.failurePolicy.trim().length === 0) {
    issues.push({
      level: 'warn',
      code: 'SCHEDULE_NO_FAILURE',
      message: '定时任务缺少失败策略',
    })
  }
  if (steps.some((step) => /发送|交付|deliver|send|notify/i.test(step.intent)) && !steps.some((step) => step.needsConfirm)) {
    issues.push({
      level: 'warn',
      code: 'SEND_NO_CONFIRM',
      message: '发送/交付步骤建议人工确认',
    })
  }
  if (steps.some((step) => /写入|生成|write|render/i.test(step.intent)) && blueprint.rollback.trim().length === 0) {
    issues.push({ level: 'warn', code: 'WRITE_NO_ROLLBACK', message: '写文件步骤缺少回滚说明' })
  }
  if (blueprint.acceptance.length === 0) {
    issues.push({ level: 'warn', code: 'NO_ACCEPTANCE', message: '缺少验收标准' })
  }
  if (
    blueprint.permissions.some((permission) =>
      ['external-send', 'shell'].includes(permission),
    ) &&
    !steps.some((step) => step.needsConfirm)
  ) {
    issues.push({
      level: 'warn',
      code: 'HIGH_RISK_PERMISSION',
      message: '存在高权限步骤但没有人工确认点',
    })
  }

  for (const finding of deps.compatFindings ?? []) {
    const intersects = steps.some(
      (step) =>
        step.pluginIds.some((plugin) => finding.subjects.includes(plugin)) ||
        step.toolNames.some((tool) => finding.subjects.includes(tool)),
    )
    if (!intersects) continue
    issues.push({
      level: finding.severity === 'error' ? 'error' : 'warn',
      code: finding.severity === 'error' ? 'COMPAT_CONFLICT' : 'COMPAT_WARN',
      message: `${finding.code}: ${finding.title}`,
    })
  }

  return issues
}

function hasCycle(steps: WorkflowBlueprint['steps']): boolean {
  const byId = new Map(steps.map((step) => [step.id, step]))
  const state = new Map<string, 'visiting' | 'done'>()
  const visit = (id: string): boolean => {
    const current = state.get(id)
    if (current === 'visiting') return true
    if (current === 'done') return false
    const step = byId.get(id)
    if (step === undefined) return false
    state.set(id, 'visiting')
    for (const dependency of step.dependsOn) {
      if (visit(dependency)) return true
    }
    state.set(id, 'done')
    return false
  }
  for (const step of steps) if (visit(step.id)) return true
  return false
}

/** Render a validation result as a compact Markdown report. */
export function renderValidation(issues: readonly ValidationIssue[]): string {
  if (issues.length === 0) return '✅ 校验通过：未发现 error 或 warn。'
  const errors = issues.filter((issue) => issue.level === 'error')
  const warnings = issues.filter((issue) => issue.level === 'warn')
  const lines: string[] = []
  lines.push(`> ${errors.length} error / ${warnings.length} warn`)
  lines.push('')
  lines.push('| level | code | step | message |')
  lines.push('|---|---|---|---|')
  for (const issue of issues.slice(0, 50)) {
    lines.push(
      `| ${issue.level} | ${issue.code} | ${issue.stepId ?? '—'} | ${issue.message.replace(/\|/g, '\\|')} |`,
    )
  }
  return lines.join('\n')
}
