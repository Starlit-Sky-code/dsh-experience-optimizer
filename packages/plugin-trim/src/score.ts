import {
  clamp,
  jaccard,
  round,
  shingles,
  wordTokens,
} from 'dsh-shared-meta'
import type {
  BundleProfile,
  Evidence,
  PluginProfile,
  SlimItem,
  TaskProfile,
} from 'dsh-shared-meta'
import type { ScanResult } from './scan.ts'
import type { Config } from './config.ts'

const WEIGHTS = {
  taskMatch: 0.35,
  usage: 0.25,
  overlapPenalty: 0.2,
  costPenalty: 0.15,
} as const

/** Names of enabled bundles whose descriptions substantially overlap another enabled bundle. */
export function computeOverlapSet(scan: ScanResult): Set<string> {
  const bundles = scan.bundles.filter(
    (bundle) => bundle.enabled && typeof bundle.description === 'string' && bundle.description.length > 20,
  )
  const overlap = new Set<string>()
  for (let i = 0; i < bundles.length; i++) {
    const left = bundles[i]
    if (left?.description === undefined) continue
    const leftShingles = shingles(wordTokens(left.description), 3)
    for (let j = i + 1; j < bundles.length; j++) {
      const right = bundles[j]
      if (right?.description === undefined) continue
      if (jaccard(leftShingles, shingles(wordTokens(right.description), 3)) < 0.55) continue
      overlap.add(left.name)
      overlap.add(right.name)
    }
  }
  return overlap
}

export function scoreBundle(
  scan: ScanResult,
  task: TaskProfile,
  bundle: BundleProfile,
  overlap: Set<string>,
  policy: Config['suggestionPolicy'] = 'conservative',
): SlimItem {
  return scoreCommon(policy, {
    scan,
    task,
    overlap,
    id: `bundle:${bundle.name}`,
    kind: 'bundle',
    name: bundle.name,
    bundleName: bundle.name,
    enabled: bundle.enabled,
    protectedItem: bundle.protected,
    guardStatus: bundle.guardStatus,
    contextTokens: bundle.contextTokens,
    usageCalls: bundle.usage.calls,
    usageSuccesses: bundle.usage.successes,
    usageSessionCalls: bundle.usage.sessionCalls,
    description: bundle.description,
    findings: bundle.findings,
  })
}

export function scoreEntry(
  scan: ScanResult,
  task: TaskProfile,
  entry: PluginProfile,
  overlap: Set<string>,
  policy: Config['suggestionPolicy'] = 'conservative',
): SlimItem {
  const parent = scan.bundles.find((bundle) => bundle.name === entry.bundleName)
  return scoreCommon(policy, {
    scan,
    task,
    overlap,
    id: `entry:${entry.entryId}`,
    kind: 'entry',
    name: entry.entryId,
    bundleName: entry.bundleName,
    enabled: entry.enabled,
    protectedItem: entry.protected || parent?.protected === true || entry.patchId === undefined,
    guardStatus: entry.guardStatus,
    contextTokens: entry.contextTokens,
    usageCalls: entry.usage.calls,
    usageSuccesses: entry.usage.successes,
    usageSessionCalls: entry.usage.sessionCalls,
    description: parent?.description,
    findings: entry.findings,
    moduleName: entry.moduleName,
    fiberPhase: entry.fiberPhase,
  })
}

interface ScoreInput {
  scan: ScanResult
  task: TaskProfile
  overlap: Set<string>
  id: string
  kind: 'bundle' | 'entry'
  name: string
  bundleName?: string
  enabled: boolean
  protectedItem: boolean
  guardStatus: string
  contextTokens: number
  usageCalls: number
  usageSuccesses: number
  usageSessionCalls: number
  description?: string
  findings: Array<{ code: string; severity: string; title: string }>
  moduleName?: string
  fiberPhase?: string | null
}

function scoreCommon(policy: Config['suggestionPolicy'], input: ScoreInput): SlimItem {
  const evidence: Evidence[] = []

  if (input.protectedItem) {
    return {
      id: input.id,
      kind: input.kind,
      name: input.name,
      bundleName: input.bundleName,
      action: 'keep',
      risk: 'low',
      score: 1,
      evidence: [{ kind: 'user-pref', summary: '核心/管理/preset/用户锁定项，受保护', weight: 1 }],
      observedEnabled: input.enabled,
      protected: true,
      reason: '受保护项不参与裁剪',
      findings: [],
    }
  }

  if (input.guardStatus === 'incompatible') {
    return {
      id: input.id,
      kind: input.kind,
      name: input.name,
      bundleName: input.bundleName,
      action: 'review',
      risk: 'high',
      score: -1,
      evidence: [
        { kind: 'guard', summary: '运行时不兼容或启动失败；不自动启用/禁用', weight: 1 },
        ...compatEvidence(input.findings),
      ],
      observedEnabled: input.enabled,
      protected: false,
      reason: '先处理兼容性 error，再考虑启用或禁用',
      findings: [],
    }
  }

  const text = `${input.name} ${input.description ?? ''} ${input.moduleName ?? ''}`.toLowerCase()
  const matched = input.task.tag === 'unknown' ? [] : input.task.keywords.filter((keyword) => text.includes(keyword))
  const taskMatch = clamp(matched.length * 0.4, 0, 1)
  if (matched.length > 0) {
    evidence.push({
      kind: 'task-match',
      summary: `匹配任务关键词：${matched.slice(0, 5).join('、')}`,
      weight: WEIGHTS.taskMatch * taskMatch,
    })
  }

  const successRate = input.usageCalls > 0 ? input.usageSuccesses / input.usageCalls : 0.5
  const historical = Math.min(1, input.usageCalls / 20) * successRate
  const session = Math.min(1, input.usageSessionCalls / 5) * 0.8
  const usage = Math.max(historical, session)
  const anyUsage = Object.values(input.scan.usage.byTool).some(
    (stats) => stats.calls + stats.sessionCalls > 0,
  )
  const usageState: 'used' | 'unused' | 'unknown' =
    input.usageCalls + input.usageSessionCalls > 0
      ? 'used'
      : anyUsage
        ? 'unused'
        : 'unknown'
  if (usageState === 'used') {
    evidence.push({
      kind: 'usage',
      summary: `历史调用 ${input.usageCalls}，会话内 ${input.usageSessionCalls}，成功率 ${round(successRate, 2)}`,
      weight: WEIGHTS.usage * usage,
    })
  } else if (usageState === 'unused') {
    evidence.push({
      kind: 'usage',
      summary: '使用账本有活动，但本插件在保留窗口内 0 次调用',
      weight: 0,
    })
  } else {
    evidence.push({
      kind: 'usage',
      summary: '使用账本无记录（未开启 trackUsage 或尚未产生调用）',
      weight: 0,
    })
  }

  const overlap = input.overlap.has(input.name) || (input.bundleName !== undefined && input.overlap.has(input.bundleName))
  if (overlap) {
    evidence.push({ kind: 'overlap', summary: '描述/能力与其他插件重叠', weight: -WEIGHTS.overlapPenalty })
  }

  const cost = Math.min(1, input.contextTokens / 4000)
  if (input.contextTokens > 0) {
    evidence.push({
      kind: 'cost',
      summary: `可归属上下文约 ${input.contextTokens} tokens`,
      weight: -WEIGHTS.costPenalty * cost,
    })
  } else {
    evidence.push({ kind: 'cost', summary: '没有可归属的 host 上下文成本', weight: 0 })
  }

  const periodic = detectPeriodic(input)
  if (periodic) {
    evidence.push({
      kind: 'guard',
      summary: '检测到周期/触发器语义；不自动建议关闭，只进入人工复核',
      weight: 0.4,
    })
  }

  for (const finding of input.findings.slice(0, 4)) {
    evidence.push({
      kind: 'compat',
      summary: `${finding.code}: ${finding.title}`,
      weight: finding.severity === 'error' ? 0.5 : 0.2,
    })
  }

  let score =
    WEIGHTS.taskMatch * taskMatch +
    WEIGHTS.usage * usage -
    WEIGHTS.overlapPenalty * (overlap ? 1 : 0) -
    WEIGHTS.costPenalty * cost
  score = round(clamp(score, -1, 1), 3)

  let action: SlimItem['action']
  const hasError = input.findings.some((finding) => finding.severity === 'error')
  if (input.enabled) {
    if (taskMatch >= 0.8 && !hasError) action = 'keep'
    else if (score >= 0.5) action = 'keep'
    else if (score >= 0.25) action = 'disable-if-unused'
    else if (score >= 0.05) action = 'review'
    else action = 'suggest-disable'
  } else {
    const enableScore = taskMatch * 0.8 + usage * 0.2
    action = taskMatch > 0 && enableScore >= 0.6 ? 'enable' : 'review'
  }

  let risk: SlimItem['risk'] = 'low'
  if (input.task.confidence < 0.6) risk = 'high'
  else if (hasError) risk = 'medium'
  else if (input.guardStatus === 'warn') risk = 'medium'
  else if (input.fiberPhase === 'pending' || input.fiberPhase === 'failed') risk = 'medium'

  if (action === 'suggest-disable' && risk !== 'low') action = 'review'
  if (action === 'enable' && risk === 'high') action = 'review'
  if (action === 'enable' && hasError) action = 'review'

  let guard = ''
  if (action === 'suggest-disable') {
    if (periodic) {
      action = 'review'
      guard = '疑似周期/触发器插件，已阻止自动建议关闭'
    } else if (usageState === 'used') {
      action = 'review'
      guard = '已有使用记录，不自动建议关闭'
    } else if (usageState === 'unknown' && policy === 'conservative') {
      action = 'review'
      guard = '使用账本无记录，证据不足'
    } else if (
      policy === 'conservative' &&
      (input.contextTokens <= 0 || input.task.confidence < 0.75 || taskMatch > 0)
    ) {
      action = 'review'
      guard = '证据不足：需要窗口内 0 调用、非周期、有上下文成本且任务高置信'
    }
  }
  if (input.task.tag === 'unknown' && action === 'suggest-disable') action = 'review'
  if (input.task.confidence < 0.6 && action === 'suggest-disable') action = 'review'

  const strong =
    usageState === 'unused' &&
    !periodic &&
    input.contextTokens > 0 &&
    input.task.confidence >= 0.75 &&
    taskMatch === 0
  const evidenceLevel: 'strong' | 'weak' | 'insufficient' = strong
    ? 'strong'
    : periodic || usageState === 'unknown' || input.task.confidence < 0.6
      ? 'insufficient'
      : 'weak'

  return {
    id: input.id,
    kind: input.kind,
    name: input.name,
    bundleName: input.bundleName,
    action,
    risk,
    score,
    evidence,
    observedEnabled: input.enabled,
    protected: false,
    periodic,
    usageState,
    evidenceLevel,
    estimatedTokens: action === 'suggest-disable' || action === 'disable-if-unused' ? input.contextTokens : 0,
    reason: reasonFor(action, input, taskMatch, usage, cost, guard),
    findings: [],
  }
}

function compatEvidence(findings: Array<{ code: string; title: string }>): Evidence[] {
  return findings.slice(0, 4).map((finding) => ({
    kind: 'compat' as const,
    summary: `${finding.code}: ${finding.title}`,
    weight: 0.5,
  }))
}

function reasonFor(
  action: SlimItem['action'],
  input: ScoreInput,
  taskMatch: number,
  usage: number,
  cost: number,
  guard: string,
): string {
  if (guard.length > 0) return `${guard}；${reasonForBase(action, input, taskMatch, usage, cost)}`
  return reasonForBase(action, input, taskMatch, usage, cost)
}

function reasonForBase(
  action: SlimItem['action'],
  input: ScoreInput,
  taskMatch: number,
  usage: number,
  cost: number,
): string {
  switch (action) {
    case 'keep':
      return `任务匹配 ${round(taskMatch, 2)}、使用 ${round(usage, 2)}、成本 ${round(cost, 2)}，收益可覆盖成本`
    case 'enable':
      return '已禁用但与当前任务强相关；可在确认后启用'
    case 'suggest-disable':
      return `任务匹配低、使用 ${round(usage, 2)}、成本 ${round(cost, 2)}，建议临时禁用`
    case 'disable-if-unused':
      return '边际收益偏低；若本任务未使用可禁用'
    case 'review':
    default:
      return input.task.confidence < 0.6
        ? '任务识别置信度不足，只建议人工复核'
        : '证据不足或存在兼容性风险，建议人工复核'
  }
}


const PERIODIC_HINTS = [
  'schedule', 'cron', 'timer', 'reminder', 'periodic', 'interval', 'recurring',
  'daily', 'weekly', 'monthly', 'hourly', 'calendar', 'digest', 'webhook',
  'trigger', 'subscription', 'watch', 'dream',
  '定时', '周期', '每月', '每周', '每日', '每小时', '提醒', '日程', '日历',
  '月报', '周报', '日报', '订阅', '触发器', '轮询', '梦整理', '梦境',
]

function detectPeriodic(input: ScoreInput): boolean {
  const text = `${input.name} ${input.description ?? ''} ${input.moduleName ?? ''}`.toLowerCase()
  return PERIODIC_HINTS.some((hint) => text.includes(hint))
}
