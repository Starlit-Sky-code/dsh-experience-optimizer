import type { Context } from '@deepseek-ai/cordis'
import {
  AuditLog,
  dataDir,
  fileExists,
  writeJsonAtomic,
} from 'dsh-shared-meta'
import type {
  CompatAnalysisResult,
  CompatConfigLike,
} from './model.ts'
import { collectCompatContext } from './context.ts'
import {
  getInventory,
  getLoader,
  getPluginManager,
  getPromptAdapter,
  resolveProfileFacts,
  toCompatConfig,
} from './adapters.ts'
import { buildReport, renderReport, runCompatibilityRules } from './report.ts'

export type CompatScope = 'current' | 'profiles' | 'all'

export interface AnalyzeOptions {
  scope?: CompatScope
  includeInfo?: boolean
  maxFindings?: number
  writeReport?: boolean
  force?: boolean
  agent?: unknown
  toolSet?: unknown
}

interface CacheEntry {
  at: number
  result: CompatAnalysisResult
}

const cache = new Map<string, CacheEntry>()

/** Collect, analyze, render, and optionally persist a compatibility report. */
export async function analyzeCompatibility(
  ctx: Context,
  config: CompatConfigLike,
  options: AnalyzeOptions = {},
): Promise<CompatAnalysisResult> {
  const facts = resolveProfileFacts(ctx, options.agent)
  const scope = options.scope ?? 'current'
  const agentKey = agentId(options.agent)
  const includeInfo = options.includeInfo ?? config.compatIncludeInfo
  const maxFindings = clampInteger(options.maxFindings ?? config.compatMaxFindings, 1, 500)
  const key = `${facts.dir}|${scope}|${agentKey}|${includeInfo ? 1 : 0}|${maxFindings}`
  const ttl = Math.max(0, config.compatCacheTtlMs)
  const cached = cache.get(key)
  if (options.force !== true && cached !== undefined && Date.now() - cached.at < ttl) {
    if (
      options.writeReport !== false &&
      (cached.result.reportPath === undefined || !(await fileExists(cached.result.reportPath)))
    ) {
      const path = dataDir('compat', 'report.json')
      await writeJsonAtomic(path, cached.result.report).catch(() => undefined)
      const updated = { ...cached.result, reportPath: path }
      cache.set(key, { at: Date.now(), result: updated })
      return updated
    }
    return cached.result
  }

  const scopedConfig: CompatConfigLike = {
    ...toCompatConfig(config),
    compatScanAllProfiles: scope === 'profiles' || scope === 'all',
    compatReadWorkspace: scope !== 'profiles',
  }

  const context = await collectCompatContext({
    profileName: facts.name,
    profileDir: facts.dir,
    dshHome: facts.dshHome,
    cwd: facts.cwd,
    loader: getLoader(ctx),
    pluginManager: getPluginManager(ctx),
    inventory: getInventory(ctx),
    prompt: getPromptAdapter(ctx, options.agent),
    agent: options.agent,
    toolSet: options.toolSet,
    config: scopedConfig,
  })

  const findings = config.compatEnabled ? await runCompatibilityRules(context) : []
  if (!config.compatEnabled) context.diagnostics.push('compatibility analysis is disabled by config')

  const report = buildReport(context, findings, { includeInfo, maxFindings })
  const markdown = renderReport(report, { includeInfo, maxFindings })

  let reportPath: string | undefined
  if (options.writeReport !== false) {
    reportPath = dataDir('compat', 'report.json')
    await writeJsonAtomic(reportPath, report).catch((error) => {
      context.diagnostics.push(`failed to write compatibility report: ${errorText(error)}`)
    })
  }

  await new AuditLog()
    .append({
      t: new Date().toISOString(),
      actor: 'trim',
      action: 'analyze_compatibility',
      subject: facts.name,
      result: report.summary.error > 0 ? 'fail' : 'ok',
      summary: `${report.summary.error} error / ${report.summary.warn} warn / ${report.summary.info} info`,
      metrics: {
        error: report.summary.error,
        warn: report.summary.warn,
        info: report.summary.info,
        findings: report.findings.length,
      },
    })
    .catch(() => undefined)

  const result: CompatAnalysisResult = { report, findings, context, markdown, reportPath }
  cache.set(key, { at: Date.now(), result })
  return result
}

/** Drop any cached compatibility result. */
export function clearCompatibilityCache(): void {
  cache.clear()
}

/** Build a compact one-line summary for scan/suggest output. */
export function compatibilitySummary(result: CompatAnalysisResult): string {
  const { summary } = result.report
  return `${summary.error} error / ${summary.warn} warn / ${summary.info} info`
}

function agentId(agent: unknown): string {
  if (typeof agent !== 'object' || agent === null) return ''
  const id = (agent as { id?: unknown }).id
  return typeof id === 'string' ? id : ''
}

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, Math.trunc(value)))
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
