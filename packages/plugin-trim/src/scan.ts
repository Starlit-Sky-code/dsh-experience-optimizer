import {
  estimateTokens,
  uniq,
} from 'dsh-shared-meta'
import type {
  BundleProfile,
  DedupeGroup,
  Evidence,
  GuardStatus,
  PluginProfile,
  TaskProfile,
  UsageStats,
} from 'dsh-shared-meta'
import type {
  CompatAnalysisResult,
  PluginInventorySnapshotLike,
  PluginManagerLike,
} from './compat/model.ts'
import type { Config } from './config.ts'
import { findingsBySubject } from './compat/finding.ts'
import { rootPackageName } from './compat/manifests.ts'
import { buildProtection } from './protect.ts'
import { ownerOfSection, ownerOfTool } from './tool-owners.ts'
import { dedupeSections } from './dedupe.ts'
import { mergeUsage, usageForOwner, type UsageLedger } from './usage.ts'
import { extractFromAgent } from './task.ts'

export interface SectionCost {
  name: string
  owner?: string
  tokens: number
  chars: number
  source: 'section' | 'context'
}

export interface ToolCost {
  name: string
  owner?: string
  tokens: number
}

export interface ScanResult {
  managementAvailable: boolean
  compat: {
    summary: CompatAnalysisResult['report']['summary']
    topFindings: CompatAnalysisResult['findings']
    reportPath?: string
  }
  bundles: BundleProfile[]
  entries: PluginProfile[]
  context: {
    totalTokens: number
    byOwner: Record<string, number>
    sections: SectionCost[]
    tools: ToolCost[]
    unattributedTokens: number
  }
  presetModules: string[]
  usage: {
    byTool: Record<string, UsageStats>
    byOwner: Record<string, UsageStats>
  }
  dedupe: DedupeGroup[]
  diagnostics: string[]
}

export interface ScanOptions {
  config: Config
  compat: CompatAnalysisResult
  pluginManager?: PluginManagerLike
  inventory?: PluginInventorySnapshotLike
  usageLedger?: UsageLedger
  task?: TaskProfile
  sessionToolNames?: string[]
  agent?: unknown
}

/** Normalize plugin metadata, prompt costs, usage, and compat findings into one scan result. */
export async function scanPlugins(options: ScanOptions): Promise<ScanResult> {
  const { config, compat } = options
  const protection = buildProtection({
    bundles: compat.context.bundles,
    entries: compat.context.entriesInfo,
    inventory: options.inventory,
    extraProtect: config.protect,
    pinned: config.pinned,
  })
  const findingsMap = findingsBySubject(compat.findings)

  const sections: SectionCost[] = [
    ...(compat.context.prompt?.sections ?? []).map((section) => ({
      name: section.name,
      owner: ownerOfSection(section.name) ?? 'unattributed',
      tokens: estimateTokens(section.text),
      chars: section.text.length,
      source: 'section' as const,
    })),
    ...(compat.context.prompt?.contexts ?? []).map((section) => ({
      name: section.name,
      owner: ownerOfSection(section.name) ?? 'unattributed',
      tokens: estimateTokens(section.text),
      chars: section.text.length,
      source: 'context' as const,
    })),
  ]

  const tools: ToolCost[] = (compat.context.prompt?.tools ?? []).map((tool) => ({
    name: tool.name,
    owner: ownerOfTool(tool.name, config.toolOwners) ?? 'unattributed',
    tokens: estimateTokens(JSON.stringify(tool.parameters ?? {}) + (tool.description ?? '')),
  }))

  const byOwner: Record<string, number> = {}
  for (const section of sections) addCost(byOwner, section.owner ?? 'unattributed', section.tokens)
  for (const tool of tools) addCost(byOwner, tool.owner ?? 'unattributed', tool.tokens)
  const totalTokens = Object.values(byOwner).reduce((sum, value) => sum + value, 0)

  const toolsByOwner = new Map<string, string[]>()
  for (const tool of tools) {
    if (tool.owner === undefined) continue
    const list = toolsByOwner.get(tool.owner) ?? []
    list.push(tool.name)
    toolsByOwner.set(tool.owner, list)
  }

  const usageAggregate =
    options.usageLedger === undefined ? new Map<string, UsageStats>() : await options.usageLedger.aggregate()
  const sessionToolNames = options.sessionToolNames ?? extractFromAgent(options.agent).toolNames
  options.usageLedger?.addSessionUsage(usageAggregate, sessionToolNames)
  const usageByTool: Record<string, UsageStats> = Object.fromEntries(usageAggregate)
  const usageByOwner: Record<string, UsageStats> = {}
  for (const [owner, names] of toolsByOwner) {
    usageByOwner[owner] = usageForOwner(usageAggregate, owner, names)
  }

  const bundles: BundleProfile[] = compat.context.bundles.map((bundle) => {
    const rowModuleNames = uniq(bundle.rows.map((row) => rootPackageName(row.moduleName)))
    const findings = uniqFindings([
      ...(findingsMap.get(bundle.name) ?? []),
      ...rowModuleNames.flatMap((name) => findingsMap.get(name) ?? []),
    ])
    const usage = mergeBundleUsage(usageByOwner, rowModuleNames)
    return {
      name: bundle.name,
      version: bundle.version,
      description: bundle.description,
      enabled: bundle.enabled,
      installed: bundle.installed,
      availability: bundle.availability,
      official: bundle.official,
      optional: bundle.optional,
      removable: bundle.removable,
      readOnlyReason: bundle.readOnlyReason,
      guardStatus: guardStatusFor(findings, protection.protectedBundlePredicate(bundle)),
      rowModuleNames,
      contextTokens: rowModuleNames.reduce((sum, name) => sum + (byOwner[name] ?? 0), 0),
      usage,
      protected: protection.protectedBundlePredicate(bundle),
      findings,
    }
  })

  const bundleByEntry = new Map<string, string>()
  for (const bundle of compat.context.bundles) {
    for (const row of bundle.rows) {
      if (row.entryId !== undefined) bundleByEntry.set(row.entryId, bundle.name)
    }
  }

  const entries: PluginProfile[] = compat.context.entriesInfo.map((entry) => {
    const root = rootPackageName(entry.moduleName)
    const findings = findingsMap.get(entry.moduleName) ?? findingsMap.get(root) ?? []
    const usage = mergeBundleUsage(usageByOwner, [root])
    return {
      entryId: entry.entryId,
      moduleName: entry.moduleName,
      bundleName: bundleByEntry.get(entry.entryId),
      enabled: entry.enabled,
      fiberPhase: entry.fiberPhase,
      diagnostic: entry.diagnostic,
      patchId: entry.patchId,
      readOnlyReason: entry.readOnlyReason,
      guardStatus: guardStatusFor(findings, protection.protectedEntryPredicate(entry)),
      contextTokens: byOwner[root] ?? 0,
      usage,
      protected: protection.protectedEntryPredicate(entry),
      findings,
    }
  })

  const presetModules = uniq([
    ...(options.inventory?.agentPresets ?? []).flatMap((preset) =>
      preset.rows.map((row) => row.moduleName),
    ),
    ...compat.context.loaderEntries
      .filter((entry) => entry.source === 'preset')
      .map((entry) => entry.moduleName),
  ])

  const dedupe =
    config.enableDedupe && compat.context.prompt !== undefined
      ? dedupeSections(
          [...compat.context.prompt.sections, ...compat.context.prompt.contexts],
          { persistExcerpts: config.persistExcerpts },
        )
      : []

  return {
    managementAvailable: options.pluginManager !== undefined,
    compat: {
      summary: compat.report.summary,
      topFindings: compat.findings.slice(0, 5),
      reportPath: compat.reportPath,
    },
    bundles,
    entries,
    context: {
      totalTokens,
      byOwner,
      sections,
      tools,
      unattributedTokens: byOwner.unattributed ?? 0,
    },
    presetModules,
    usage: { byTool: usageByTool, byOwner: usageByOwner },
    dedupe,
    diagnostics: [...compat.context.diagnostics],
  }
}

export function evidenceFromScan(scan: ScanResult, subject: string): Evidence[] {
  const evidence: Evidence[] = []
  const bundle = scan.bundles.find((item) => item.name === subject)
  if (bundle !== undefined) {
    if (bundle.contextTokens > 0) {
      evidence.push({
        kind: 'cost',
        summary: `可归属上下文约 ${bundle.contextTokens} tokens`,
        weight: 0.15,
      })
    }
    if (bundle.usage.calls > 0 || bundle.usage.sessionCalls > 0) {
      evidence.push({
        kind: 'usage',
        summary: `近 ${bundle.usage.calls} 次历史调用，会话内 ${bundle.usage.sessionCalls} 次`,
        weight: 0.25,
      })
    }
    for (const finding of bundle.findings.slice(0, 3)) {
      evidence.push({ kind: 'compat', summary: `${finding.code}: ${finding.title}`, weight: 0.5 })
    }
  }
  return evidence
}

function addCost(map: Record<string, number>, owner: string, tokens: number): void {
  map[owner] = (map[owner] ?? 0) + tokens
}

function mergeBundleUsage(
  usageByOwner: Record<string, UsageStats>,
  owners: readonly string[],
): UsageStats {
  let total: UsageStats = { calls: 0, successes: 0, sessionCalls: 0 }
  for (const owner of owners) {
    const stats = usageByOwner[owner]
    if (stats !== undefined) total = mergeUsage(total, stats)
  }
  return total
}

function guardStatusFor(
  findings: readonly { severity: string; code: string }[],
  protectedItem: boolean,
): GuardStatus {
  if (protectedItem) return 'protected'
  if (findings.some((finding) => finding.severity === 'error' && finding.code.startsWith('RT_'))) {
    return 'incompatible'
  }
  if (findings.some((finding) => finding.severity === 'error')) return 'warn'
  if (findings.some((finding) => finding.severity === 'warn')) return 'warn'
  return 'ok'
}

function uniqFindings<T extends { id: string }>(items: readonly T[]): T[] {
  const map = new Map<string, T>()
  for (const item of items) map.set(item.id, item)
  return [...map.values()]
}
