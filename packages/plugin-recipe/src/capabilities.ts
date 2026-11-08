import { dataDir, isRecord, readJson, uniq } from 'dsh-shared-meta'
import type { CapabilitySeam, WizardAnswers } from 'dsh-shared-meta'

/** Built-in capability seams. Tools are checked against the current agent scope at planning time. */
export const BUILT_IN_CAPABILITIES: CapabilitySeam[] = [
  {
    id: 'git-history',
    name: '读取 Git 历史',
    purpose: '读取指定范围/分支的 commit、diff 与变更统计',
    tools: ['bash'],
    trigger: 'manual',
    permissions: ['shell'],
    needsConfirm: false,
    keywords: ['git', 'commit', 'log', 'diff', '分支', '变更', '提交'],
    pluginIds: ['@deepseek-ai/dsh-tool-bash'],
  },
  {
    id: 'file-read',
    name: '读取文件',
    purpose: '读取、搜索和汇总工作区文件',
    tools: ['read', 'glob', 'grep'],
    trigger: 'manual',
    permissions: ['fs-read'],
    needsConfirm: false,
    keywords: ['读取', '查看', '文件', 'read', 'grep', '搜索文件'],
    pluginIds: ['@deepseek-ai/dsh-tool-fs', '@deepseek-ai/dsh-tool-fs-search'],
  },
  {
    id: 'file-write',
    name: '写入文件',
    purpose: '生成或修改 Markdown/文本产物',
    tools: ['write', 'edit'],
    trigger: 'manual',
    permissions: ['fs-write'],
    needsConfirm: false,
    keywords: ['生成', '写入', '保存', 'markdown', '文档', '报告', '文件'],
    pluginIds: ['@deepseek-ai/dsh-tool-fs'],
  },
  {
    id: 'web-research',
    name: '联网检索',
    purpose: '搜索网页并抓取资料',
    tools: ['web_search', 'web_fetch'],
    trigger: 'manual',
    permissions: ['network'],
    needsConfirm: false,
    keywords: ['搜索', '调研', '网页', '资料', 'search', 'fetch', 'research'],
    pluginIds: ['@deepseek-ai/dsh-tool-web'],
  },
  {
    id: 'schedule',
    name: '定时触发',
    purpose: '按周期创建并运行计划任务',
    tools: ['schedule_create'],
    trigger: 'schedule',
    permissions: ['schedule'],
    needsConfirm: true,
    keywords: ['每周', '每天', '定时', '自动', '周期', 'cron', 'schedule'],
    pluginIds: ['@deepseek-ai/dsh-tool-schedule'],
  },
  {
    id: 'present',
    name: '交付文件',
    purpose: '把生成的文件作为交付物展示/下载',
    tools: ['present'],
    trigger: 'manual',
    permissions: [],
    needsConfirm: false,
    keywords: ['交付', '展示', '文件', '下载', 'present'],
    pluginIds: ['@deepseek-ai/dsh-tool-present'],
  },
  {
    id: 'subagent',
    name: '并行/汇总',
    purpose: '把独立分析委派给子代理并汇总',
    tools: ['subagent', 'subagent_fork'],
    trigger: 'manual',
    permissions: ['delegation'],
    needsConfirm: false,
    keywords: ['汇总', '总结', '并行', '分析', 'subagent'],
    pluginIds: ['@deepseek-ai/dsh-tool-subagent'],
  },
  {
    id: 'workflow',
    name: '批量编排',
    purpose: '用脚本编排多个子任务',
    tools: ['workflow'],
    trigger: 'manual',
    permissions: ['delegation'],
    needsConfirm: false,
    keywords: ['批量', '多步', '编排', 'workflow'],
    pluginIds: ['@deepseek-ai/dsh-tool-workflow'],
  },
  {
    id: 'model-summary',
    name: '模型汇总',
    purpose: '由模型直接阅读材料并生成汇总（不新增工具）',
    tools: [],
    trigger: 'manual',
    permissions: [],
    needsConfirm: false,
    keywords: ['汇总', '总结', '摘要', '生成'],
    pluginIds: [],
    modelOnly: true,
  },
]

export interface CapabilityCatalog {
  capabilities: CapabilitySeam[]
  diagnostics: string[]
}

/** Load built-ins plus an optional user catalog from disk. */
export async function loadCapabilities(path?: string): Promise<CapabilityCatalog> {
  const diagnostics: string[] = []
  const catalog = new Map(BUILT_IN_CAPABILITIES.map((capability) => [capability.id, capability]))
  const file = path !== undefined && path.length > 0 ? path : dataDir('capabilities.json')
  const custom = await readJson<unknown>(file).catch((error) => {
    diagnostics.push(`capabilities file unreadable: ${error instanceof Error ? error.message : String(error)}`)
    return undefined
  })
  if (custom !== undefined) {
    const list = Array.isArray(custom)
      ? custom
      : isRecord(custom) && Array.isArray(custom.capabilities)
        ? custom.capabilities
        : []
    if (list.length === 0) diagnostics.push(`capabilities file has no capabilities array: ${file}`)
    for (const raw of list) {
      const capability = normalizeCapability(raw)
      if (capability === undefined) {
        diagnostics.push(`ignored malformed capability in ${file}`)
        continue
      }
      catalog.set(capability.id, capability)
    }
  }
  return { capabilities: [...catalog.values()], diagnostics }
}

function normalizeCapability(value: unknown): CapabilitySeam | undefined {
  if (!isRecord(value)) return undefined
  if (typeof value.id !== 'string' || typeof value.name !== 'string') return undefined
  return {
    id: value.id,
    name: value.name,
    purpose: typeof value.purpose === 'string' ? value.purpose : value.name,
    tools: Array.isArray(value.tools)
      ? value.tools.filter((item): item is string => typeof item === 'string')
      : [],
    trigger:
      value.trigger === 'schedule' || value.trigger === 'event' ? value.trigger : 'manual',
    permissions: Array.isArray(value.permissions)
      ? value.permissions.filter((item): item is string => typeof item === 'string')
      : [],
    needsConfirm: value.needsConfirm === true,
    keywords: Array.isArray(value.keywords)
      ? value.keywords.filter((item): item is string => typeof item === 'string')
      : [],
    pluginIds: Array.isArray(value.pluginIds)
      ? value.pluginIds.filter((item): item is string => typeof item === 'string')
      : [],
    modelOnly: value.modelOnly === true,
  }
}

/** Capabilities whose tools are currently available; model-only seams are always available. */
export function availableCapabilities(
  capabilities: readonly CapabilitySeam[],
  toolExists: (name: string) => boolean,
): CapabilitySeam[] {
  return capabilities.filter(
    (capability) =>
      capability.modelOnly === true ||
      capability.tools.length === 0 ||
      capability.tools.some((tool) => toolExists(tool)),
  )
}

/** Score capabilities by keyword presence in the goal and answers. */
export function matchCapabilities(
  capabilities: readonly CapabilitySeam[],
  goal: string,
  answers: WizardAnswers,
): CapabilitySeam[] {
  const text = [
    goal,
    answers.scope,
    answers.frequency,
    answers.outputFormat,
    answers.delivery,
    answers.onFailure,
    ...(answers.sources ?? []),
    ...(answers.acceptance ?? []),
  ]
    .filter((item): item is string => typeof item === 'string')
    .join(' ')
    .toLowerCase()
  return capabilities
    .map((capability) => {
      let score = 0
      for (const keyword of capability.keywords) {
        if (text.includes(keyword.toLowerCase())) score += keyword.length >= 3 ? 1.5 : 1
      }
      return { capability, score }
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.capability)
}

/** Unique plugin package set for tool-bearing capabilities. */
export function minPluginSet(capabilities: readonly CapabilitySeam[]): string[] {
  return uniq(capabilities.flatMap((capability) => capability.pluginIds))
}

/** Unique permissions for the selected capabilities. */
export function permissionsOf(capabilities: readonly CapabilitySeam[]): string[] {
  return uniq(capabilities.flatMap((capability) => capability.permissions))
}
