import {
  dataDir,
  escapeMarkdownCell,
  jsonBlock,
  slugify,
  writeJsonAtomic,
  writeTextAtomic,
} from 'dsh-shared-meta'
import type { WorkflowBlueprint, WorkflowStep } from 'dsh-shared-meta'

export type ExportFormat = 'markdown' | 'json' | 'both'

export interface ExportResult {
  id: string
  markdownPath?: string
  jsonPath?: string
}

/** Write a blueprint to the DSH data directory. */
export async function exportBlueprint(
  blueprint: WorkflowBlueprint,
  format: ExportFormat = 'both',
): Promise<ExportResult> {
  const base = `${slugify(blueprint.id)}`
  const directory = dataDir('recipe', 'blueprints')
  const result: ExportResult = { id: blueprint.id }
  if (format === 'markdown' || format === 'both') {
    const path = `${directory}/${base}.md`
    await writeTextAtomic(path, renderBlueprintMarkdown(blueprint))
    result.markdownPath = path
  }
  if (format === 'json' || format === 'both') {
    const path = `${directory}/${base}.json`
    await writeJsonAtomic(path, blueprint)
    result.jsonPath = path
  }
  return result
}

/** Render the human runbook plus a machine-readable JSON block. */
export function renderBlueprintMarkdown(blueprint: WorkflowBlueprint): string {
  const lines: string[] = []
  lines.push(`# 工作流蓝图：${blueprint.goal}`)
  lines.push('')
  lines.push(`- 蓝图 id：\`${blueprint.id}\``)
  lines.push(`- 模板：${blueprint.template}`)
  lines.push(`- 生成时间：${blueprint.createdAt}`)
  lines.push('')
  lines.push('## 1. 目标复述')
  lines.push('')
  lines.push(blueprint.goal)
  lines.push('')
  lines.push('## 2. 步骤')
  lines.push('')
  lines.push('| # | 意图 | 类型 | 能力 | 工具/插件 | 依赖 | 人工确认 | 失败处理 |')
  lines.push('|---|---|---|---|---|---|---|---|')
  for (const step of blueprint.steps) {
    lines.push(stepRow(step))
  }
  lines.push('')
  lines.push('## 3. 数据流')
  lines.push('')
  for (const step of blueprint.steps) {
    lines.push(
      `- ${step.id}：${step.inputs.join(' + ') || '—'} → ${step.outputs.join(' + ') || '—'}`,
    )
  }
  lines.push('')
  lines.push('## 4. 最小插件集')
  lines.push('')
  if (blueprint.minPluginSet.length === 0) lines.push('- （无）')
  for (const plugin of blueprint.minPluginSet) lines.push(`- ${plugin}`)
  lines.push('')
  if (blueprint.suggestedDisable.length > 0) {
    lines.push('### 建议禁用')
    lines.push('')
    for (const item of blueprint.suggestedDisable) lines.push(`- ${item}`)
    lines.push('')
  }
  lines.push('## 5. 权限与风险')
  lines.push('')
  if (blueprint.permissions.length === 0) lines.push('- （无额外权限）')
  for (const permission of blueprint.permissions) lines.push(`- ${permission}`)
  lines.push('')
  lines.push('## 6. 运行手册')
  lines.push('')
  lines.push('1. 确认上表的人工确认点与权限。')
  lines.push('2. 先手动运行一次采集与生成步骤，检查时间范围、分支与输出内容。')
  lines.push('3. 确认无误后再创建/启用定时任务。')
  lines.push('4. 失败时按“失败处理”保留草稿并在对话中通知，不静默重试外部发送。')
  lines.push('')
  lines.push('## 7. 验收清单')
  lines.push('')
  for (const item of blueprint.acceptance) lines.push(`- [ ] ${item}`)
  lines.push('')
  lines.push('## 8. 回滚')
  lines.push('')
  lines.push(blueprint.rollback)
  lines.push('')
  lines.push('## 9. 不确定性')
  lines.push('')
  for (const item of blueprint.uncertainties) lines.push(`- ${item}`)
  lines.push('')
  lines.push('## 10. 机器可读蓝图')
  lines.push('')
  lines.push(jsonBlock(blueprint, 20_000))
  return lines.join('\n')
}

function stepRow(step: WorkflowStep): string {
  const tools = step.toolNames.length > 0 ? step.toolNames.join(', ') : '（模型步骤）'
  const plugins = step.pluginIds.length > 0 ? ` / ${step.pluginIds.join(', ')}` : ''
  return `| ${step.id} | ${escapeMarkdownCell(step.intent)} | ${step.kind} | ${step.capabilityId ?? '—'} | ${escapeMarkdownCell(tools + plugins)} | ${step.dependsOn.join(', ') || '—'} | ${step.needsConfirm ? 'yes' : 'no'} | ${escapeMarkdownCell(step.onFailure)} |`
}
