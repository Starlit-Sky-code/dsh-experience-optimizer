import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import {
  AuditLog,
  escapeMarkdownCell,
  jsonBlock,
  truncate,
} from 'dsh-shared-meta'
import type {
  ApplyResult,
  RollbackResult,
  SlimItem,
  SlimProfile,
  TaskTag,
} from 'dsh-shared-meta'
import type { Config } from './config.ts'
import { analyzeCompatibility } from './compat/analyze.ts'
import { getInventory, getPluginManager, resolveProfileFacts } from './compat/adapters.ts'
import { attachFindings, buildSlimProfile } from './draft.ts'
import { detectTask, extractFromAgent } from './task.ts'
import { scanPlugins, type ScanResult } from './scan.ts'
import { applySlimProfile, ApplyRefusedError } from './apply.ts'
import { rollbackSlimProfile } from './rollback.ts'
import { saveDraft } from './store.ts'
import type { UsageLedger } from './usage.ts'

export interface TrimToolDeps {
  config: Config
  ledger: UsageLedger
}

const TASK_TAGS: TaskTag[] = [
  'bugfix',
  'feature',
  'review',
  'docs',
  'release',
  'report',
  'research',
  'unknown',
]

/** Register all trim model-facing tools. */
export function registerTrimTools(ctx: Context, deps: TrimToolDeps): void {
  registerScanTool(ctx, deps)
  registerSuggestTool(ctx, deps)
  registerApplyTool(ctx, deps)
  registerRollbackTool(ctx, deps)
}

function registerScanTool(ctx: Context, deps: TrimToolDeps): void {
  ctx.tools.register(
    defineTool({
      name: 'trim_scan_plugins',
      description:
        'Read-only scan of installed DSH bundles/entries, current prompt context cost, usage, dedupe groups, and a compatibility summary. Use when the user asks which plugins are consuming context or wants a plugin inventory. Does not change plugin state.',
      parameters: {
        detail: {
          type: 'string',
          enum: ['summary', 'full'],
          description: 'summary shows top rows; full shows more entries. Default summary.',
        },
        maxRows: {
          type: 'integer',
          description: 'Maximum rows per table, 1..100. Default 20.',
        },
      },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args, exec) {
        const compat = await analyzeCompatibility(ctx, deps.config, {
          scope: 'current',
          includeInfo: true,
          writeReport: false,
          agent: exec.agent,
          toolSet: exec.toolSet,
        })
        const sessionToolNames = extractFromAgent(exec.agent).toolNames
        const scan = await scanPlugins({
          config: deps.config,
          compat,
          pluginManager: getPluginManager(ctx),
          inventory: await inventoryOf(ctx),
          usageLedger: deps.ledger,
          agent: exec.agent,
          sessionToolNames,
        })
        await audit('scan_plugins', 'ok', `scanned ${scan.bundles.length} bundles`)
        return renderScan(scan, args.detail === 'full' ? 100 : Math.min(100, Math.max(1, args.maxRows ?? 20)))
      },
      presentCall: () => ({ card: 'generic', title: 'Scan plugin context', kind: 'read' }),
    }),
  )
}

function registerSuggestTool(ctx: Context, deps: TrimToolDeps): void {
  ctx.tools.register(
    defineTool({
      name: 'trim_suggest_profile',
      description:
        'Build a read-only slim-profile draft for the current task: which plugins to keep, enable, disable, or review, with explainable evidence, compatibility findings, and dedupe suggestions. Writes only a local draft; never changes plugin enablement. Call trim_apply_profile only after the user explicitly approves the returned profileId.',
      parameters: {
        taskTag: {
          type: 'string',
          enum: TASK_TAGS,
          description: 'Optional explicit task tag; overrides text detection.',
        },
        goal: {
          type: 'string',
          description: 'Optional task goal when the user states it explicitly.',
        },
        includeReview: {
          type: 'boolean',
          description: 'Include review-only items. Default true.',
        },
        maxDisable: {
          type: 'integer',
          description: 'Maximum disable suggestions, 0..100. Default 20.',
        },
      },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args, exec) {
        const task = detectTask({
          explicit: args.taskTag,
          goal: args.goal,
          agent: exec.agent,
        })
        const compat = await analyzeCompatibility(ctx, deps.config, {
          scope: 'current',
          includeInfo: true,
          writeReport: true,
          agent: exec.agent,
          toolSet: exec.toolSet,
        })
        const scan = await scanPlugins({
          config: deps.config,
          compat,
          pluginManager: getPluginManager(ctx),
          inventory: await inventoryOf(ctx),
          usageLedger: deps.ledger,
          task,
          agent: exec.agent,
        })
        let profile = buildSlimProfile(scan, task, deps.config, {
          includeReview: args.includeReview,
          maxDisable: args.maxDisable,
        })
        profile = attachFindings(profile, scan)
        let saved = true
        try {
          await saveDraft(profile, deps.config.maxDrafts)
        } catch {
          saved = false
        }
        await audit(
          'suggest_profile',
          saved ? 'ok' : 'fail',
          `draft ${profile.id}: ${profile.summary.disable} disable / ${profile.summary.enable} enable / ${profile.summary.review} review`,
        )
        return renderSuggest(profile, scan, saved)
      },
      presentCall: () => ({ card: 'generic', title: 'Suggest slim profile', kind: 'read' }),
    }),
  )
}

function registerApplyTool(ctx: Context, deps: TrimToolDeps): void {
  ctx.tools.register(
    defineTool({
      name: 'trim_apply_profile',
      description:
        'Apply low-risk keep/enable/disable items from a saved slim-profile draft. Requires confirm: true and must be called only after the user explicitly approved the exact profileId and items in this conversation. Protected/core/preset items are never changed. Returns a rollback token. Only low-risk disables/enables are applied; compatibility errors can block an item.',
      parameters: {
        profileId: {
          type: 'string',
          required: true,
          description: 'The profileId returned by trim_suggest_profile.',
        },
        confirm: {
          type: 'boolean',
          required: true,
          description: 'Must be true only after explicit user approval of the exact draft.',
        },
        items: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional subset of item ids to apply. Omit to apply all eligible items.',
        },
      },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args, exec) {
        if (args.confirm !== true) {
          return '❌ 应用精简方案需要用户明确确认：请先让用户批准具体的 profileId 与 items，再调用 `trim_apply_profile({ profileId, confirm: true })`。'
        }
        const manager = getPluginManager(ctx)
        if (manager === undefined) {
          return '❌ 当前 profile 没有可用的 pluginManager，无法应用精简方案。请改用 `trim_scan_plugins` 只读查看。'
        }
        const compat = await analyzeCompatibility(ctx, deps.config, {
          scope: 'current',
          includeInfo: true,
          writeReport: true,
          force: true,
          agent: exec.agent,
          toolSet: exec.toolSet,
        })
        try {
          const result = await applySlimProfile(args.profileId, {
            confirm: args.confirm,
            items: args.items,
            manager,
            maxDrafts: deps.config.maxDrafts,
            findings: compat.findings,
            profileName: resolveProfileFacts(ctx, exec.agent).name,
          })
          await audit('apply_profile', 'ok', `applied ${result.items.length} items`)
          return renderApply(result)
        } catch (error) {
          if (error instanceof ApplyRefusedError) return `❌ ${error.message}`
          return `❌ 应用失败：${error instanceof Error ? error.message : String(error)}`
        }
      },
      presentCall: () => ({ card: 'generic', title: 'Apply slim profile', kind: 'other' }),
    }),
  )
}

function registerRollbackTool(ctx: Context, deps: TrimToolDeps): void {
  ctx.tools.register(
    defineTool({
      name: 'trim_rollback_profile',
      description:
        'Restore plugin enablement from a previous trim apply snapshot. Omit token to use the latest snapshot. Skips items already restored or changed outside trim. Returns per-item results.',
      parameters: {
        token: {
          type: 'string',
          description: 'Rollback token returned by trim_apply_profile. Omit for the latest snapshot.',
        },
      },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args) {
        const manager = getPluginManager(ctx)
        if (manager === undefined) {
          return '❌ 当前 profile 没有可用的 pluginManager，无法回滚。'
        }
        try {
          const result = await rollbackSlimProfile({
            token: args.token,
            manager,
            maxDrafts: deps.config.maxDrafts,
            profileName: resolveProfileFacts(ctx).name,
          })
          await audit('rollback_profile', 'ok', `restored ${result.items.filter((item) => item.status === 'restored').length} items`)
          return renderRollback(result)
        } catch (error) {
          return `❌ 回滚失败：${error instanceof Error ? error.message : String(error)}`
        }
      },
      presentCall: () => ({ card: 'generic', title: 'Rollback slim profile', kind: 'other' }),
    }),
  )
}

async function inventoryOf(ctx: Context) {
  const adapter = getInventory(ctx)
  if (adapter === undefined) return undefined
  try {
    return await adapter.list()
  } catch {
    return undefined
  }
}

async function audit(action: string, result: 'ok' | 'fail' | 'skipped', summary: string): Promise<void> {
  await new AuditLog()
    .append({
      t: new Date().toISOString(),
      actor: 'trim',
      action,
      subject: 'trim',
      result,
      summary,
    })
    .catch(() => undefined)
}

function renderScan(scan: ScanResult, maxRows: number): string {
  const lines: string[] = []
  lines.push('# 插件与上下文扫描')
  lines.push('')
  lines.push(`- 管理可用：${scan.managementAvailable ? '是' : '否（只读模式）'}`)
  lines.push(
    `- 兼容性：${scan.compat.summary.error} error / ${scan.compat.summary.warn} warn / ${scan.compat.summary.info} info`,
  )
  lines.push(
    `- 可归属上下文：${scan.context.totalTokens} tokens（未归属 ${scan.context.unattributedTokens}）`,
  )
  lines.push('')

  if (scan.compat.topFindings.length > 0) {
    lines.push('## 兼容性摘要')
    lines.push('')
    for (const finding of scan.compat.topFindings) {
      lines.push(`- **${finding.severity.toUpperCase()} ${finding.code}** ${finding.title}`)
    }
    lines.push('')
  }

  lines.push('## 上下文成本 Top')
  lines.push('')
  lines.push('| 名称 | 类型 | owner | tokens |')
  lines.push('|---|---|---|---|')
  const costs = [
    ...scan.context.sections.map((section) => ({
      name: section.name,
      kind: section.source,
      owner: section.owner ?? 'unattributed',
      tokens: section.tokens,
    })),
    ...scan.context.tools.map((tool) => ({
      name: tool.name,
      kind: 'tool',
      owner: tool.owner ?? 'unattributed',
      tokens: tool.tokens,
    })),
  ]
    .sort((a, b) => b.tokens - a.tokens)
    .slice(0, maxRows)
  for (const cost of costs) {
    lines.push(
      `| ${escapeMarkdownCell(cost.name)} | ${cost.kind} | ${escapeMarkdownCell(cost.owner)} | ${cost.tokens} |`,
    )
  }
  if (costs.length === 0) lines.push('| （无可归属项） | — | — | 0 |')
  lines.push('')

  lines.push('## Bundles')
  lines.push('')
  lines.push('| bundle | enabled | protected | guard | tokens | calls | 描述 |')
  lines.push('|---|---|---|---|---|---|---|')
  const sortedBundles = [...scan.bundles].sort(
    (a, b) => b.contextTokens - a.contextTokens || Number(b.enabled) - Number(a.enabled),
  )
  for (const bundle of sortedBundles.slice(0, maxRows)) {
    lines.push(
      `| ${escapeMarkdownCell(bundle.name)} | ${bundle.enabled ? 'yes' : 'no'} | ${bundle.protected ? 'yes' : 'no'} | ${bundle.guardStatus} | ${bundle.contextTokens} | ${bundle.usage.calls + bundle.usage.sessionCalls} | ${escapeMarkdownCell(truncate(bundle.description ?? '', 80))} |`,
    )
  }
  if (scan.bundles.length === 0) lines.push('| （无） | — | — | — | 0 | 0 | — |')
  lines.push('')

  lines.push('## Entries')
  lines.push('')
  lines.push('| entry | module | enabled | phase | guard | tokens |')
  lines.push('|---|---|---|---|---|---|')
  const sortedEntries = [...scan.entries].sort((a, b) => b.contextTokens - a.contextTokens)
  for (const entry of sortedEntries.slice(0, maxRows)) {
    lines.push(
      `| ${escapeMarkdownCell(entry.entryId)} | ${escapeMarkdownCell(entry.moduleName)} | ${entry.enabled ? 'yes' : 'no'} | ${entry.fiberPhase ?? '—'} | ${entry.guardStatus} | ${entry.contextTokens} |`,
    )
  }
  if (scan.entries.length === 0) lines.push('| （无） | — | — | — | — | 0 |')
  lines.push('')

  if (scan.presetModules.length > 0) {
    lines.push('## Agent preset 提供（trim 不可单独开关）')
    lines.push('')
    lines.push(
      `- ${scan.presetModules.slice(0, 30).join(', ')}${scan.presetModules.length > 30 ? ` … 共 ${scan.presetModules.length} 个` : ''}`,
    )
    lines.push('')
  }

  if (scan.dedupe.length > 0) {
    lines.push('## 跨插件 prompt 重复')
    lines.push('')
    lines.push('| 权威 section | 其他 section | 冲突 | 说明 |')
    lines.push('|---|---|---|---|')
    for (const group of scan.dedupe.slice(0, 10)) {
      const others = group.members.filter((member) => member.section !== group.authority).map((member) => member.section)
      lines.push(
        `| ${escapeMarkdownCell(group.authority)} | ${escapeMarkdownCell(others.join(', '))} | ${group.conflict ? 'yes' : 'no'} | ${escapeMarkdownCell(group.reason)} |`,
      )
    }
    lines.push('')
  }

  if (scan.diagnostics.length > 0) {
    lines.push('## 诊断')
    lines.push('')
    for (const diagnostic of scan.diagnostics.slice(0, 20)) lines.push(`- ${diagnostic}`)
    lines.push('')
  }

  lines.push(
    jsonBlock(
      {
        bundles: scan.bundles.length,
        entries: scan.entries.length,
        totalTokens: scan.context.totalTokens,
        unattributedTokens: scan.context.unattributedTokens,
        compat: scan.compat.summary,
        dedupeGroups: scan.dedupe.length,
      },
      4000,
    ),
  )
  lines.push('')
  lines.push('> 未修改任何插件状态。需要可执行建议时调用 `trim_suggest_profile`。')
  return lines.join('\n')
}

function renderSuggest(profile: SlimProfile, scan: ScanResult, saved = true): string {
  const lines: string[] = []
  lines.push('# 精简方案草稿')
  lines.push('')
  if (!saved) {
    lines.push('⚠️ 草稿未能写入本地数据目录；以下建议仍可阅读，但无法通过 trim_apply_profile 应用。请检查 DSH_HOME 权限。')
    lines.push('')
  }
  lines.push(
    `- 任务：**${profile.task.tag}**（置信度 ${profile.task.confidence.toFixed(2)}，来源 ${profile.task.source}）`,
  )
  lines.push(`- 摘要：保留 ${profile.summary.keep} / 启用 ${profile.summary.enable} / 禁用 ${profile.summary.disable} / 复核 ${profile.summary.review} / 受保护 ${profile.summary.protected}`)
  lines.push(`- 兼容性：${scan.compat.summary.error} error / ${scan.compat.summary.warn} warn / ${scan.compat.summary.info} info`)
  if (!scan.managementAvailable) {
    lines.push('')
    lines.push('⚠️ 当前 profile 没有可用的 pluginManager；本方案仅供只读参考，无法通过 trim_apply_profile 应用。')
  }
  lines.push('')
  lines.push('## 任务证据')
  lines.push('')
  for (const evidence of profile.task.evidence.slice(0, 6)) {
    lines.push(`- ${evidence.summary}`)
  }
  lines.push('')

  const actionable = profile.items.filter((item) => item.action !== 'keep').slice(0, 30)
  if (actionable.length > 0) {
    lines.push('## 建议')
    lines.push('')
    lines.push('| item | action | risk | score | 关键证据 |')
    lines.push('|---|---|---|---|---|')
    for (const item of actionable) {
      lines.push(
        `| ${escapeMarkdownCell(item.id)} | ${item.action} | ${item.risk} | ${item.score} | ${escapeMarkdownCell(item.evidence.slice(0, 3).map((evidence) => evidence.summary).join('；'))} |`,
      )
    }
    lines.push('')
  } else {
    lines.push('没有需要变更的项；当前插件集合看起来已经合适。')
    lines.push('')
  }

  if (profile.dedupe.length > 0) {
    lines.push('## 去重建议')
    lines.push('')
    for (const group of profile.dedupe.slice(0, 10)) {
      lines.push(
        `- 保留 **${group.authority}**；其余 ${group.members.filter((member) => member.section !== group.authority).map((member) => member.section).join(', ')}（${group.conflict ? '存在冲突，仅标记' : '建议引用/摘要'}）`,
      )
    }
    lines.push('')
  }

  lines.push('## 可应用项')
  lines.push('')
  const eligible = profile.items.filter(
    (item) =>
      item.protected === false &&
      item.risk === 'low' &&
      (item.action === 'suggest-disable' || item.action === 'enable'),
  )
  if (eligible.length === 0) {
    lines.push('没有低风险可应用项；以上建议仅供人工复核。')
  } else {
    for (const item of eligible) lines.push(`- ${item.id}：${item.action}`)
  }
  lines.push('')
  lines.push(`profileId: \`${profile.id}\``)
  lines.push('')
  lines.push('> 未修改任何插件状态。仅在用户明确同意上述 profileId 与具体 items 后，才调用 `trim_apply_profile({ profileId, confirm: true })`。')
  lines.push('')
  lines.push(
    jsonBlock(
      {
        profileId: profile.id,
        task: profile.task,
        summary: profile.summary,
        eligible: eligible.map((item) => ({ id: item.id, action: item.action })),
        compat: scan.compat.summary,
      },
      6000,
    ),
  )
  return lines.join('\n')
}

function renderApply(result: ApplyResult): string {
  const lines: string[] = []
  lines.push('# 应用结果')
  lines.push('')
  lines.push('| item | status | application | 说明 |')
  lines.push('|---|---|---|---|')
  for (const item of result.items) {
    lines.push(
      `| ${escapeMarkdownCell(item.id)} | ${item.status} | ${item.application ?? '—'} | ${escapeMarkdownCell(item.error ?? item.fixKind ?? '')} |`,
    )
  }
  if (result.items.length === 0) lines.push('| （无可应用项） | — | — | — |')
  lines.push('')
  if (result.token !== undefined) lines.push(`rollbackToken: \`${result.token}\``)
  if (result.rolledBack === true) lines.push('⚠️ 应用中途失败，已自动回滚本次已成功项。')
  if (result.restartRequired === true) lines.push('⚠️ 部分变更需要重启 DSH 后生效。')
  lines.push('')
  if (result.token !== undefined) {
    lines.push('如需恢复：`trim_rollback_profile({ token })`。')
  }
  return lines.join('\n')
}

function renderRollback(result: RollbackResult): string {
  const lines: string[] = []
  lines.push('# 回滚结果')
  lines.push('')
  lines.push('| item | status | 说明 |')
  lines.push('|---|---|---|')
  for (const item of result.items) {
    lines.push(`| ${escapeMarkdownCell(item.id)} | ${item.status} | ${escapeMarkdownCell(item.error ?? '')} |`)
  }
  if (result.items.length === 0) lines.push('| （无） | — | — |')
  lines.push('')
  lines.push(`token: \`${result.token}\``)
  return lines.join('\n')
}

export function renderItemLine(item: SlimItem): string {
  return `${item.action} ${item.name} (${item.risk})`
}
