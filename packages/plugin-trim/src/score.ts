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
): SlimItem {
  return scoreCommon({
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
): SlimItem {
  const parent = scan.bundles.find((bundle) => bundle.name === entry.bundleName)
  return scoreCommon({
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

function scoreCommon(input: ScoreInput): SlimItem {
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
  if (input.usageCalls > 0 || input.usageSessionCalls > 0) {
    evidence.push({
      kind: 'usage',
      summary: `历史调用 ${input.usageCalls}，会话内 ${input.usageSessionCalls}，成功率 ${round(successRate, 2)}`,
      weight: WEIGHTS.usage * usage,
    })
  } else {
    evidence.push({ kind: 'usage', summary: '没有可用使用记录', weight: 0 })
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

  if (input.task.tag === 'unknown' && action === 'suggest-disable') action = 'review'
  if (input.task.confidence < 0.6 && action === 'suggest-disable') action = 'review'

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
    reason: reasonFor(action, input, taskMatch, usage, cost),
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
