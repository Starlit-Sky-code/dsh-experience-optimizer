import {
  escapeMarkdownCell,
  jsonBlock,
} from 'dsh-shared-meta'
import type {
  CompatDomain,
  CompatFinding,
  CompatReport,
  CompatSeverity,
} from 'dsh-shared-meta'
import type { CompatContext } from './model.ts'
import { dedupeFindings, sortFindings } from './finding.ts'
import { runRuntimeRules } from './rules-runtime.ts'
import { runPluginRules } from './rules-plugin.ts'
import { runProfileRules } from './rules-profile.ts'

export interface ReportOptions {
  includeInfo: boolean
  maxFindings: number
}

/** Run every compatibility rule against one collected context. */
export async function runCompatibilityRules(
  context: CompatContext,
): Promise<CompatFinding[]> {
  const [runtime, plugin, profile] = await Promise.all([
    runRuntimeRules(context),
    runPluginRules(context),
    runProfileRules(context),
  ])
  return sortFindings(dedupeFindings([...runtime, ...plugin, ...profile]))
}

/** Build the serializable report. */
export function buildReport(
  context: CompatContext,
  findings: readonly CompatFinding[],
  options: ReportOptions,
): CompatReport {
  const sorted = sortFindings(findings)
  const selected = sorted.slice(0, options.maxFindings)
  const byDomain: Record<CompatDomain, number> = {
    'plugin-plugin': 0,
    'plugin-runtime': 0,
    profile: 0,
    workspace: 0,
  }
  let error = 0
  let warn = 0
  let info = 0
  for (const finding of sorted) {
    byDomain[finding.domain] += 1
    if (finding.severity === 'error') error++
    else if (finding.severity === 'warn') warn++
    else info++
  }
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    runtime: { ...context.runtime },
    profile: {
      name: context.profile.name,
      dir: context.profile.dir,
      bundles: [...context.profile.bundles],
    },
    findings: selected,
    summary: { error, warn, info, byDomain },
    profiles: context.profiles.map((profile) => ({
      name: profile.name,
      dir: profile.dir,
      bundles: [...profile.bundles],
      versions: { ...profile.manifestVersions },
      exemptions: { ...profile.exemptions },
      compatibilityWarnings: [...profile.compatibilityWarnings],
      findings: [],
    })),
    workspaces: [
      {
        cwd: context.workspace.cwd,
        instructionFiles: [...context.workspace.instructionFiles],
        mcpEntries: context.loaderEntries
          .filter((entry) => entry.source === 'mcp' && typeof entry.mcpServerName === 'string')
          .map((entry) => entry.mcpServerName as string),
        findings: [],
      },
    ],
    diagnostics: [...context.diagnostics],
    truncated: sorted.length > selected.length,
    totalFindings: sorted.length,
  }
}

const SEVERITY_LABEL: Record<CompatSeverity, string> = { error: 'E', warn: 'W', info: 'I' }

/** Render a bounded Markdown matrix plus detailed findings. */
export function renderReport(report: CompatReport, options: ReportOptions): string {
  const lines: string[] = []
  lines.push('# 兼容性报告')
  lines.push('')
  lines.push(
    `- 运行时：DSH ${report.runtime.dshVersion} / Node ${report.runtime.nodeVersion} / ${report.runtime.platform}-${report.runtime.arch}`,
  )
  lines.push(`- Profile：${report.profile.name}（${report.profile.bundles.length} 个 bundle）`)
  lines.push(
    `- 发现：${report.summary.error} error / ${report.summary.warn} warn / ${report.summary.info} info${
      report.truncated ? `（已截断，共 ${report.totalFindings ?? report.findings.length} 条）` : ''
    }`,
  )
  lines.push('')

  const visible = report.findings.filter((finding) => options.includeInfo || finding.severity !== 'info')
  if (visible.length === 0) {
    lines.push('未发现需要处理的兼容性问题。')
  } else {
    lines.push('## 兼容性矩阵')
    lines.push('')
    lines.push('| 主体 | 运行时 | 插件间 | Profile/工作区 |')
    lines.push('|---|---|---|---|')
    const subjects = [...new Set(visible.flatMap((finding) => finding.subjects))]
      .sort((a, b) => a.localeCompare(b))
      .slice(0, 30)
    for (const subject of subjects) {
      const row: string[] = [escapeMarkdownCell(subject)]
      for (const domain of ['plugin-runtime', 'plugin-plugin', 'profile'] as const) {
        const matches = visible.filter(
          (finding) => finding.domain === domain && finding.subjects.includes(subject),
        )
        row.push(
          matches.length === 0
            ? '—'
            : matches
                .slice(0, 2)
                .map((finding) => `${SEVERITY_LABEL[finding.severity]}:${finding.code}`)
                .join('<br>'),
        )
      }
      lines.push(`| ${row.join(' | ')} |`)
    }
    lines.push('')
    lines.push('图例：E=error，W=warn，I=info，—=无发现。')
    lines.push('')

    lines.push('## 详细发现')
    lines.push('')
    for (const finding of visible) {
      lines.push(`### ${SEVERITY_LABEL[finding.severity]} ${finding.code} · ${finding.title}`)
      lines.push('')
      lines.push(`- 领域：${finding.domain}`)
      lines.push(`- 主体：${finding.subjects.join(', ')}`)
      lines.push(`- 置信度：${finding.confidence}`)
      for (const evidence of finding.evidence) {
        lines.push(
          `- 证据（${evidence.source}${evidence.ref === undefined ? '' : ` · ${evidence.ref}`}）：${evidence.summary}`,
        )
      }
      if (finding.fix !== undefined) {
        lines.push(
          `- 修复建议：${finding.fix.summary}${finding.fix.requiresConsent ? '（需要用户确认）' : ''}`,
        )
      }
      lines.push('')
    }
  }

  const lowConfidence = [
    ...new Set(
      report.findings
        .filter((finding) => finding.confidence === 'low')
        .flatMap((finding) => finding.subjects),
    ),
  ]
  if (lowConfidence.length > 0) {
    lines.push('## 低置信度发现（需人工确认）')
    lines.push('')
    for (const item of lowConfidence.slice(0, 20)) lines.push(`- ${item}`)
    lines.push('')
  }

  if (report.diagnostics.length > 0) {
    lines.push('## 未完成的分析')
    lines.push('')
    for (const diagnostic of report.diagnostics.slice(0, 20)) lines.push(`- ${diagnostic}`)
    lines.push('')
  }

  lines.push('## 机器可读摘要')
  lines.push('')
  lines.push(
    jsonBlock(
      {
        summary: report.summary,
        findings: visible.map((finding) => ({
          code: finding.code,
          severity: finding.severity,
          domain: finding.domain,
          subjects: finding.subjects,
          confidence: finding.confidence,
          fix: finding.fix,
        })),
      },
      8000,
    ),
  )
  return lines.join('\n')
}
