import type {
  CheckResult,
  CheckStatus,
  CompatFinding,
  Verdict,
  VerdictAction,
} from 'dsh-shared-meta'
import type { CompatAnalysisResult } from './compat/model.ts'
import type { ScanResult } from './scan.ts'

const LOAD_CODES = new Set([
  'RT_PREFLIGHT_DENIED',
  'RT_ENGINE_MISMATCH',
  'PP_MISSING_PEER_BUNDLE',
  'PP_RUNTIME_REGISTRATION_FAILED',
  'PP_MCP_STARTUP_FAILED',
  'PP_PACKAGE_VERSION_DUPLICATE',
])

/** Build the top-level checkup verdict without changing any plugin state. */
export function buildVerdict(compat: CompatAnalysisResult, scan: ScanResult): Verdict {
  const checks: CheckResult[] = [
    loadCheck(compat.findings, scan),
    compatCheck(compat.findings),
    contextCheck(scan),
    compactionCheck(scan),
  ]
  const overall: Verdict['overall'] = checks.some((check) => check.status === 'error')
    ? 'risk'
    : checks.some((check) => check.status === 'warn')
      ? 'attention'
      : 'ok'
  const pending = checks.filter((check) => check.status === 'warn' || check.status === 'error').length
  const headline = overall === 'risk'
    ? '有阻断项'
    : overall === 'attention'
      ? `需处理 ${pending} 项`
      : '通过'

  return {
    overall,
    headline,
    checks,
    actions: actionsFor(checks),
  }
}

function loadCheck(findings: readonly CompatFinding[], scan: ScanResult): CheckResult {
  const relevant = findings.filter((finding) => LOAD_CODES.has(finding.code))
  const status = worstStatus(relevant)
  return {
    id: 'load',
    status: scan.diagnostics.length > 0 && status === 'ok' ? 'warn' : status,
    label: '加载',
    detail: relevant.length > 0
      ? `${relevant.length} 个加载/运行时问题`
      : scan.diagnostics.length > 0
        ? '部分元数据不可用'
        : '插件行已加载',
    count: relevant.length,
  }
}

function compatCheck(findings: readonly CompatFinding[]): CheckResult {
  const relevant = findings.filter(
    (finding) => !finding.code.startsWith('PP_COMPACTION_') && !LOAD_CODES.has(finding.code),
  )
  const status = worstStatus(relevant)
  return {
    id: 'compat',
    status,
    label: '兼容',
    detail: relevant.length > 0 ? `${relevant.length} 项发现` : '未发现冲突',
    count: relevant.length,
  }
}

function contextCheck(scan: ScanResult): CheckResult {
  const total = scan.context.totalTokens
  const topOwner = Object.entries(scan.context.byOwner)
    .sort((a, b) => b[1] - a[1])[0]
  const detail = total > 0
    ? `${total.toLocaleString('en-US')} tokens` + (topOwner === undefined ? '' : ` · Top 1 ${topOwner[0]}`)
    : '暂无可归属上下文'
  if (scan.dedupe.length > 0) {
    return {
      id: 'context',
      status: 'warn',
      label: '上下文',
      detail: `${scan.dedupe.length} 组重复提示词`,
      count: scan.dedupe.length,
    }
  }
  return {
    id: 'context',
    status: total > 0 ? 'ok' : 'info',
    label: '上下文',
    detail,
  }
}

function compactionCheck(scan: ScanResult): CheckResult {
  const health = scan.compaction?.health
  if (health === 'error') {
    return { id: 'compaction', status: 'error', label: '压缩链路', detail: '存在冲突' }
  }
  if (health === 'warn') {
    return {
      id: 'compaction',
      status: 'warn',
      label: '压缩链路',
      detail: `${scan.compaction?.backendCount ?? 0} 个后端 / 需确认`,
      count: scan.compaction?.backendCount ?? 0,
    }
  }
  if (health === 'ok') {
    return {
      id: 'compaction',
      status: 'ok',
      label: '压缩链路',
      detail: `${scan.compaction?.backendCount ?? 0} 个后端`,
    }
  }
  return { id: 'compaction', status: 'info', label: '压缩链路', detail: '未检测到' }
}

function worstStatus(findings: readonly CompatFinding[]): CheckStatus {
  if (findings.some((finding) => finding.severity === 'error')) return 'error'
  if (findings.some((finding) => finding.severity === 'warn')) return 'warn'
  if (findings.some((finding) => finding.severity === 'info')) return 'info'
  return 'ok'
}

function actionsFor(checks: readonly CheckResult[]): VerdictAction[] {
  const actions: VerdictAction[] = []
  if (checks.some((check) => check.id === 'load' && (check.status === 'error' || check.status === 'warn'))) {
    actions.push({ id: 'load', label: '查看加载问题', target: 'compat' })
  }
  if (checks.some((check) => check.id === 'compat' && (check.status === 'error' || check.status === 'warn'))) {
    actions.push({ id: 'compat', label: '处理兼容性', target: 'compat' })
  }
  if (checks.some((check) => check.id === 'compaction' && (check.status === 'error' || check.status === 'warn'))) {
    actions.push({ id: 'compaction', label: '查看压缩链路', target: 'compaction' })
  }
  if (actions.length < 3) {
    actions.push({ id: 'draft', label: '生成瘦身方案', target: 'draft' })
  }
  return actions.slice(0, 3)
}
