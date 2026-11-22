import { isRecord } from 'dsh-shared-meta'
import type {
  CompatEvidence,
  CompatFinding,
  CompactionParticipant,
  CompactionRole,
  CompactionStack,
} from 'dsh-shared-meta'
import type { CompatContext, LoaderEntrySnapshot } from './model.ts'
import { makeFinding } from './finding.ts'

const THRESHOLD_KEYS = [
  'thresholdRatio',
  'retainRatio',
  'retainTokens',
  'thresholdTokens',
  'triggerRatio',
  'compactThreshold',
] as const

const EMPTY_ROLES: Record<CompactionRole, number> = {
  backend: 0,
  pruner: 0,
  image: 0,
  command: 0,
  threshold: 0,
  archive: 0,
  participant: 0,
}

export interface CompactionInspection {
  stack: CompactionStack
  findings: CompatFinding[]
}

/** Read the profile's compaction stack without executing or changing anything. */
export function inspectCompactionStack(context: CompatContext): CompactionInspection {
  const descriptions = bundleDescriptions(context)
  const participants = dedupeParticipants(
    context.loaderEntries
      .filter((entry) => entry.source !== 'mcp')
      .map((entry) => participantOf(entry, descriptions)),
  ).sort((a, b) => a.moduleName.localeCompare(b.moduleName))

  const roles = { ...EMPTY_ROLES }
  for (const participant of participants) {
    if (participant.enabled) roles[participant.role] += 1
  }

  const activeBackends = participants.filter(
    (participant) =>
      participant.enabled &&
      participant.role === 'backend' &&
      participant.confidence !== 'low',
  )
  const findings: CompatFinding[] = []

  if (activeBackends.length > 1) {
    findings.push(
      makeFinding({
        domain: 'plugin-plugin',
        code: 'PP_COMPACTION_BACKEND_DUPLICATE',
        severity: 'warn',
        title: `${activeBackends.length} compaction backends are active at the same time`,
        subjects: activeBackends.map((participant) => participant.moduleName),
        confidence: 'high',
        evidence: activeBackends.flatMap((participant) => participant.evidence),
        fix: {
          kind: 'none',
          summary: 'keep one compaction backend and disable the others; only one should own the compaction service',
          safe: true,
          requiresConsent: false,
        },
      }),
    )
  }

  const hasBase = context.profile.bundles.some(
    (name) => name === '@deepseek-ai/dsh-base' || name === '@deepseek-ai/dsh-web-app',
  )
  if (hasBase && activeBackends.length === 0) {
    findings.push(
      makeFinding({
        domain: 'plugin-runtime',
        code: 'PP_COMPACTION_BACKEND_MISSING',
        severity: 'warn',
        title: 'No active compaction backend was detected',
        subjects: participants
          .filter((participant) => participant.role === 'backend')
          .map((participant) => participant.moduleName),
        confidence: 'medium',
        evidence: [
          {
            source: 'profile-file',
            ref: context.profile.dir,
            summary: 'the profile uses dsh-base/dsh-web-app but no active compaction backend is mounted',
          },
        ],
        fix: {
          kind: 'none',
          summary: 're-enable the built-in compaction row or mount one replacement backend',
          safe: false,
          requiresConsent: false,
        },
      }),
    )
  }

  const thresholdEntries = explicitThresholds(participants)
  if (thresholdEntries.length > 1) {
    const values = new Set(thresholdEntries.map((entry) => entry.value))
    if (values.size > 1) {
      findings.push(
        makeFinding({
          domain: 'plugin-plugin',
          code: 'PP_COMPACTION_THRESHOLD_CONFLICT',
          severity: 'warn',
          title: 'Multiple compaction thresholds are explicitly configured',
          subjects: [...new Set(thresholdEntries.map((entry) => entry.moduleName))],
          confidence: 'medium',
          evidence: thresholdEntries.map((entry) => ({
            source: 'loader' as const,
            ref: entry.moduleName,
            summary: `${entry.key}=${entry.value}`,
          })),
          fix: {
            kind: 'none',
            summary: 'keep one threshold owner, or align the values before trusting the trigger point',
            safe: true,
            requiresConsent: false,
          },
        }),
      )
    }
  }

  for (const entry of thresholdEntries) {
    if (entry.value < 0.2 || entry.value > 0.95) {
      findings.push(
        makeFinding({
          domain: 'plugin-runtime',
          code: 'PP_COMPACTION_THRESHOLD_OUT_OF_RANGE',
          severity: 'warn',
          title: `Compaction threshold ${entry.value} is outside the safe range`,
          subjects: [entry.moduleName],
          confidence: 'high',
          evidence: [
            {
              source: 'loader',
              ref: entry.moduleName,
              summary: `${entry.key}=${entry.value}`,
            },
          ],
          fix: {
            kind: 'none',
            summary: 'use a threshold between 0.2 and 0.95; very low values compact too often and very high values risk overflow',
            safe: false,
            requiresConsent: false,
          },
        }),
      )
    }
  }

  if (roles.pruner > 0 && activeBackends.length === 0) {
    findings.push(
      makeFinding({
        domain: 'plugin-plugin',
        code: 'PP_COMPACTION_PRUNE_WITHOUT_BACKEND',
        severity: 'info',
        title: 'A tool-result pruner is active without a compaction backend',
        subjects: participants
          .filter((participant) => participant.enabled && participant.role === 'pruner')
          .map((participant) => participant.moduleName),
        confidence: 'medium',
        evidence: [
          {
            source: 'loader',
            ref: 'tool-result-pruner',
            summary: 'pruning can trim tool results, but conversation compaction still has no backend',
          },
        ],
        fix: {
          kind: 'none',
          summary: 'mount one compaction backend if long sessions should be summarized automatically',
          safe: true,
          requiresConsent: false,
        },
      }),
    )
  }

  const notes: string[] = []
  if (participants.length === 0) {
    notes.push('No compaction rows were detected in the current profile.')
  } else if (activeBackends.length === 1) {
    notes.push('One compaction backend is active; the stack looks coherent.')
  }
  if (activeBackends.length > 1) {
    notes.push('Only one backend should own the compaction service; the others may be dead or conflicting.')
  }

  const stack: CompactionStack = {
    health: participants.length === 0
      ? 'absent'
      : findings.some((finding) => finding.severity === 'error')
        ? 'error'
        : findings.some((finding) => finding.severity === 'warn')
          ? 'warn'
          : 'ok',
    roles,
    backendCount: roles.backend,
    effectiveModule: activeBackends.length === 1 ? activeBackends[0].moduleName : null,
    participants,
    findings: findings.map((finding) => finding.code),
    notes,
    criticalModules: [...new Set(activeBackends.map((participant) => participant.moduleName))],
  }

  return { stack, findings }
}

function participantOf(
  entry: LoaderEntrySnapshot,
  descriptions: Map<string, { bundleName: string; description?: string }>,
): CompactionParticipant | undefined {
  const bundle = descriptions.get(entry.moduleName)
  const classified = classify(entry, bundle?.description)
  if (classified === undefined) return undefined
  const thresholds = thresholdsOf(entry.config)
  return {
    id: entry.id,
    moduleName: entry.moduleName,
    bundleName: bundle?.bundleName,
    role: classified.role,
    enabled: entry.enabled && entry.fiberState !== 'failed' && entry.fiberState !== 'unloading',
    confidence: classified.confidence,
    evidence: [
      {
        source: 'loader',
        ref: entry.id,
        summary: `${entry.moduleName} → ${classified.role} (${classified.confidence})`,
      },
    ],
    ...(thresholds.length > 0 ? { thresholds } : {}),
  }
}

function classify(
  entry: LoaderEntrySnapshot,
  description: string | undefined,
): { role: CompactionRole; confidence: 'high' | 'medium' | 'low' } | undefined {
  const name = entry.moduleName.toLowerCase()
  const id = entry.id.toLowerCase()
  const provided = entry.provide.map((service) => service.toLowerCase())
  const text = `${name} ${id} ${description ?? ''}`

  if (provided.includes('compaction') || provided.includes('ctx.compaction')) {
    return { role: 'backend', confidence: 'high' }
  }
  if (name.includes('compaction-tool-result-pruner') || name.includes('tool-result-pruner') || name.includes('context-fold')) {
    return { role: 'pruner', confidence: 'high' }
  }
  if (name.includes('compaction-image-offload') || name.includes('image-offload')) {
    return { role: 'image', confidence: 'high' }
  }
  if (name.includes('command-compact')) {
    return { role: 'command', confidence: 'high' }
  }
  if (name.includes('compaction-basic') || id === 'compaction-basic') {
    return { role: 'backend', confidence: 'high' }
  }
  if (
    name.includes('compact-suite') ||
    name.includes('compact-tuner') ||
    name.includes('compact-threshold') ||
    name.includes('compaction-threshold')
  ) {
    return { role: 'threshold', confidence: 'medium' }
  }
  if (
    name.includes('compaction-weave') ||
    name === 'dsh-argp' ||
    name.startsWith('dsh-argp/') ||
    name.includes('context-zip') ||
    (name.includes('ctxopt-compaction') && !name.includes('pruner'))
  ) {
    return { role: 'backend', confidence: 'medium' }
  }
  if (thresholdsOf(entry.config).length > 0) {
    return { role: 'threshold', confidence: 'medium' }
  }
  if (/context compaction|compaction (engine|backend|policy)|上下文压缩/i.test(description ?? '')) {
    return { role: 'backend', confidence: 'medium' }
  }
  if (/compact|compaction|压缩|摘要/i.test(text)) {
    return { role: 'participant', confidence: 'low' }
  }
  return undefined
}

function thresholdsOf(config: unknown): Array<{ key: string; value: number }> {
  if (!isRecord(config)) return []
  const out: Array<{ key: string; value: number }> = []
  for (const key of THRESHOLD_KEYS) {
    const value = config[key]
    if (typeof value === 'number' && Number.isFinite(value)) out.push({ key, value })
  }
  return out
}

function explicitThresholds(participants: readonly CompactionParticipant[]) {
  const out: Array<{ moduleName: string; key: string; value: number }> = []
  for (const participant of participants) {
    if (!participant.enabled) continue
    for (const threshold of participant.thresholds ?? []) {
      if (threshold.key !== 'thresholdRatio' && threshold.key !== 'triggerRatio' && threshold.key !== 'compactThreshold') continue
      out.push({ moduleName: participant.moduleName, ...threshold })
    }
  }
  return out
}

function bundleDescriptions(
  context: CompatContext,
): Map<string, { bundleName: string; description?: string }> {
  const map = new Map<string, { bundleName: string; description?: string }>()
  for (const bundle of context.bundles) {
    for (const row of bundle.rows) {
      map.set(row.moduleName, { bundleName: bundle.name, description: bundle.description })
    }
  }
  return map
}

function dedupeParticipants(
  participants: Array<CompactionParticipant | undefined>,
): CompactionParticipant[] {
  const byModule = new Map<string, CompactionParticipant>()
  for (const participant of participants) {
    if (participant === undefined) continue
    const existing = byModule.get(participant.moduleName)
    if (existing === undefined || (!existing.enabled && participant.enabled)) {
      byModule.set(participant.moduleName, participant)
    }
  }
  return [...byModule.values()]
}
