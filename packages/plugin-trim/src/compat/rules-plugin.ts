import {
  jaccard,
  normalizeLine,
  shingles,
  splitParagraphs,
  wordTokens,
} from 'dsh-shared-meta'
import type { CompatFinding } from 'dsh-shared-meta'
import type { BundleInfoLike, CompatContext, LoaderEntrySnapshot } from './model.ts'
import { makeFinding } from './finding.ts'
import { findConfigConflicts } from './patches.ts'
import { duplicateVersions } from './lockfile.ts'
import { manifestPeers, rootPackageName } from './manifests.ts'

const CORE_SERVICES = new Set([
  'tools',
  'sessions',
  'agents',
  'systemPrompt',
  'loader',
  'llm',
  'schedule',
  'pluginManager',
  'workingDirectory',
  'sandboxPolicy',
  'approval',
  'storage',
  'userQuestions',
  'jobs',
  'web',
  'mcp',
  'skills',
  'commands',
  'settings',
  'credentials',
  'authorization',
  'profileContext',
  'pluginInventory',
  'subagent',
  'workflow',
  'goal',
  'tokenMeter',
  'sessionProjections',
  'attachments',
  'spill',
  'terminal',
  'timeContext',
])

const REGISTRATION_FAILURE_RE =
  /duplicate|already registered|already provided|conflict|UNKNOWN_TOOL|tool .* exists/i

/** Plugin ↔ plugin conflicts: services, rows, configs, MCP, registration, overlap, versions. */
export async function runPluginRules(context: CompatContext): Promise<CompatFinding[]> {
  const findings: CompatFinding[] = []
  const entries = context.loaderEntries.filter((entry) => entry.enabled)
  const scopeOf = (entry: LoaderEntrySnapshot): string =>
    entry.source === 'preset' ? (entry.presetId ?? 'preset') : (entry.parentId ?? 'root')

  // -- services ------------------------------------------------------------
  const providers = new Map<string, LoaderEntrySnapshot[]>()
  for (const entry of entries) {
    for (const service of entry.provide) {
      const list = providers.get(service) ?? []
      list.push(entry)
      providers.set(service, list)
    }
  }

  for (const [service, list] of providers) {
    const byScope = new Map<string, LoaderEntrySnapshot[]>()
    for (const entry of list) {
      const scope = scopeOf(entry)
      const scoped = byScope.get(scope) ?? []
      scoped.push(entry)
      byScope.set(scope, scoped)
    }
    for (const [scope, scoped] of byScope) {
      if (scoped.length <= 1) continue
      findings.push(
        makeFinding({
          domain: 'plugin-plugin',
          code: 'PP_SERVICE_DUPLICATE',
          severity: 'error',
          title: `service "${service}" is provided by multiple plugins`,
          subjects: scoped.map((entry) => entry.moduleName),
          confidence: 'high',
          evidence: [
            {
              source: 'loader',
              ref: scope,
              summary: scoped.map((entry) => entry.moduleName).join(', '),
            },
          ],
          fix: {
            kind: 'disable',
            summary: 'disable one provider; keep the service owner that the deployment depends on',
            safe: false,
            requiresConsent: true,
            target: scoped[0]?.moduleName,
          },
        }),
      )
    }
  }

  const providedAnywhere = new Set(providers.keys())
  for (const entry of entries) {
    if (entry.inject.length === 0) continue
    if (entry.fiberState !== 'pending' && entry.fiberState !== 'failed') continue
    const missing = entry.inject.filter(
      (service) => !providedAnywhere.has(service) && !CORE_SERVICES.has(service),
    )
    if (missing.length === 0) continue
    findings.push(
      makeFinding({
        domain: 'plugin-plugin',
        code: 'PP_SERVICE_MISSING',
        severity: entry.fiberState === 'failed' ? 'error' : 'warn',
        title: `${entry.moduleName} is waiting for missing services`,
        subjects: [entry.moduleName],
        confidence: 'medium',
        evidence: [
          {
            source: 'loader',
            ref: entry.id,
            summary: `required ${missing.join(', ')}; fiber ${entry.fiberState}${entry.diagnostic === undefined ? '' : ` (${entry.diagnostic})`}`,
          },
        ],
        fix: {
          kind: 'enable',
          summary: 'enable or install a provider for the missing service, or disable the consumer',
          safe: false,
          requiresConsent: true,
        },
      }),
    )
  }

  for (const finding of detectServiceCycles(entries, providers)) findings.push(finding)

  // -- rows and configs ----------------------------------------------------
  const enabledBundles = context.bundles.filter(
    (bundle) => bundle.enabled && bundle.error === undefined,
  )
  const rows = new Map<string, string[]>()
  for (const bundle of enabledBundles) {
    for (const row of bundle.rows) {
      const list = rows.get(row.rowId) ?? []
      list.push(bundle.name)
      rows.set(row.rowId, list)
    }
  }
  for (const [rowId, names] of rows) {
    const unique = [...new Set(names)]
    if (unique.length <= 1) continue
    findings.push(
      makeFinding({
        domain: 'plugin-plugin',
        code: 'PP_ROW_DUPLICATE',
        severity: 'error',
        title: `row "${rowId}" is declared by multiple enabled bundles`,
        subjects: unique,
        confidence: 'high',
        evidence: [
          {
            source: 'plugin-manager',
            ref: rowId,
            summary: `declared by ${unique.join(', ')}`,
          },
        ],
        fix: {
          kind: 'disable',
          summary: 'disable one of the bundles declaring this row',
          safe: false,
          requiresConsent: true,
          target: unique[0],
        },
      }),
    )
  }

  const officialLayers = new Set(
    enabledBundles.filter((bundle) => bundle.official || bundle.name.startsWith('@deepseek-ai/dsh-')).map((bundle) => bundle.name),
  )
  const conflicts = findConfigConflicts(context.profile.patchRows, {
    skipLayer: (layer) =>
      !context.config.compatStrictOfficialOverrides &&
      (officialLayers.has(layer) || layer === 'root'),
  }).filter((conflict) => {
    const bundleLayers = conflict.layers.filter((layer) => layer !== 'profile' && layer !== 'home')
    return bundleLayers.length >= 2
  })
  for (const conflict of conflicts) {
    findings.push(
      makeFinding({
        domain: 'plugin-plugin',
        code: 'PP_CONFIG_CONFLICT',
        severity: 'warn',
        title: `row "${conflict.id}" has conflicting configuration across bundles`,
        subjects: conflict.layers,
        confidence: 'medium',
        evidence: [
          {
            source: 'profile-file',
            ref: conflict.id,
            summary: `layers ${conflict.layers.join(', ')} set different config values`,
          },
        ],
        fix: {
          kind: 'edit-patch',
          summary: 'keep one layer authoritative and remove or align the other configuration',
          safe: false,
          requiresConsent: true,
        },
      }),
    )
  }

  // -- MCP server namespaces ----------------------------------------------
  const mcp = context.loaderEntries.filter(
    (entry) => entry.source === 'mcp' && typeof entry.mcpServerName === 'string',
  )
  const byServer = new Map<string, LoaderEntrySnapshot[]>()
  for (const entry of mcp) {
    const name = entry.mcpServerName ?? ''
    const list = byServer.get(name) ?? []
    list.push(entry)
    byServer.set(name, list)
  }
  for (const [serverName, list] of byServer) {
    if (list.length <= 1) continue
    findings.push(
      makeFinding({
        domain: 'plugin-plugin',
        code: 'PP_MCP_SERVER_DUPLICATE',
        severity: 'error',
        title: `MCP server name "${serverName}" is used more than once`,
        subjects: list.map((entry) => entry.moduleName),
        confidence: 'high',
        evidence: [
          {
            source: 'loader',
            ref: serverName,
            summary: 'MCP tool names are mcp__<serverName>__<tool>; duplicate names collide',
          },
        ],
        fix: {
          kind: 'rename',
          summary: 'give each MCP server a unique name or disable one entry',
          safe: false,
          requiresConsent: true,
        },
      }),
    )
  }
  for (const entry of mcp) {
    if (entry.fiberState !== 'failed') continue
    findings.push(
      makeFinding({
        domain: 'plugin-plugin',
        code: 'PP_MCP_STARTUP_FAILED',
        severity: 'warn',
        title: `MCP server "${entry.mcpServerName ?? entry.id}" failed to start`,
        subjects: [entry.moduleName],
        confidence: 'medium',
        evidence: [
          {
            source: 'plugin-manager',
            ref: entry.id,
            summary: entry.diagnostic ?? 'MCP fiber is in failed state',
          },
        ],
        fix: {
          kind: 'edit-patch',
          summary: 'fix the MCP transport/command/network configuration',
          safe: false,
          requiresConsent: true,
        },
      }),
    )
  }

  // -- runtime registration failures --------------------------------------
  for (const entry of context.loaderEntries) {
    if (entry.fiberState !== 'failed' || entry.diagnostic === undefined) continue
    if (!REGISTRATION_FAILURE_RE.test(entry.diagnostic)) continue
    findings.push(
      makeFinding({
        domain: 'plugin-plugin',
        code: 'PP_RUNTIME_REGISTRATION_FAILED',
        severity: 'error',
        title: `${entry.moduleName} failed while registering a tool, service, or prompt section`,
        subjects: [entry.moduleName],
        confidence: 'high',
        evidence: [
          {
            source: 'plugin-manager',
            ref: entry.id,
            summary: entry.diagnostic,
          },
        ],
        fix: {
          kind: 'disable',
          summary: 'inspect the diagnostic; disable one side of the registration conflict',
          safe: false,
          requiresConsent: true,
          target: entry.moduleName,
        },
      }),
    )
  }

  // -- duplicate package versions -----------------------------------------
  if (context.lockfile !== undefined) {
    for (const duplicate of duplicateVersions(context.lockfile)) {
      if (duplicate.name.startsWith('@deepseek-ai/dsh')) continue
      findings.push(
        makeFinding({
          domain: 'plugin-plugin',
          code: 'PP_PACKAGE_VERSION_DUPLICATE',
          severity: 'warn',
          title: `multiple versions of ${duplicate.name} are installed`,
          subjects: [duplicate.name],
          confidence: 'high',
          evidence: [
            {
              source: 'lockfile',
              ref: context.lockfile.path,
              summary: duplicate.versions.join(', '),
            },
          ],
          fix: {
            kind: 'update',
            summary: 'deduplicate with pnpm overrides or align the dependent plugins',
            safe: false,
            requiresConsent: true,
          },
        }),
      )
    }
  }

  // -- capability / prompt overlap ----------------------------------------
  findings.push(...capabilityOverlap(enabledBundles))
  if (context.prompt !== undefined) {
    findings.push(...promptOverlap(context))
  }

  // -- missing peer bundles ------------------------------------------------
  const knownModules = new Set<string>([
    ...context.bundles.flatMap((bundle) => bundle.rows.map((row) => rootPackageName(row.moduleName))),
    ...context.entriesInfo.map((entry) => rootPackageName(entry.moduleName)),
    ...context.manifests.keys(),
  ])
  for (const bundle of enabledBundles) {
    if (bundle.availability !== 'profile') continue
    const manifest = context.manifests.get(rootPackageName(bundle.name))
    if (manifest === undefined) continue
    const bundleNames = new Set(context.bundles.map((item) => rootPackageName(item.name)))
    for (const [peer, range] of Object.entries(manifestPeers(manifest))) {
      if (peer === '@deepseek-ai/dsh') continue
      if (!peer.startsWith('@deepseek-ai/dsh-')) continue
      if (bundleNames.has(peer)) continue
      if (knownModules.has(peer)) continue
      findings.push(
        makeFinding({
          domain: 'plugin-plugin',
          code: 'PP_MISSING_PEER_BUNDLE',
          severity: 'warn',
          title: `${bundle.name} expects peer ${peer} which is not in this profile`,
          subjects: [bundle.name, peer],
          confidence: 'medium',
          evidence: [
            {
              source: 'manifest',
              ref: `${bundle.name}@${bundle.version ?? 'unknown'}`,
              summary: `peerDependencies ${peer}: ${range}`,
            },
          ],
          fix: {
            kind: 'enable',
            summary: 'install or select the peer bundle if the plugin needs it',
            safe: false,
            requiresConsent: true,
          },
        }),
      )
    }
  }

  return findings
}

function detectServiceCycles(
  entries: readonly LoaderEntrySnapshot[],
  providers: Map<string, LoaderEntrySnapshot[]>,
): CompatFinding[] {
  const findings: CompatFinding[] = []
  const byId = new Map<string, LoaderEntrySnapshot>()
  for (const entry of entries) byId.set(entry.id, entry)

  const edges = new Map<string, Set<string>>()
  for (const entry of entries) {
    for (const service of entry.inject) {
      for (const provider of providers.get(service) ?? []) {
        if (provider.id === entry.id) continue
        const targets = edges.get(entry.id) ?? new Set<string>()
        targets.add(provider.id)
        edges.set(entry.id, targets)
      }
    }
  }

  const state = new Map<string, 'visiting' | 'done'>()
  const path: string[] = []
  const seenCycles = new Set<string>()

  const visit = (id: string): void => {
    if (findings.length > 20) return
    const current = state.get(id)
    if (current === 'visiting') {
      const start = path.indexOf(id)
      if (start < 0) return
      const cycle = path.slice(start)
      if (cycle.length > 5) return
      const key = [...cycle].sort().join('|')
      if (seenCycles.has(key)) return
      seenCycles.add(key)
      const subjects = cycle.map((entryId) => byId.get(entryId)?.moduleName ?? entryId)
      findings.push(
        makeFinding({
          domain: 'plugin-plugin',
          code: 'PP_SERVICE_CYCLE',
          severity: 'warn',
          title: 'possible service dependency cycle detected',
          subjects,
          confidence: 'low',
          evidence: [
            {
              source: 'loader',
              ref: cycle.join(' -> '),
              summary: 'plugins depend on services provided by each other',
            },
          ],
          fix: {
            kind: 'reorder',
            summary: 'break the dependency cycle by reordering or disabling one plugin',
            safe: false,
            requiresConsent: true,
          },
        }),
      )
      return
    }
    if (current === 'done') return
    state.set(id, 'visiting')
    path.push(id)
    for (const target of edges.get(id) ?? []) visit(target)
    path.pop()
    state.set(id, 'done')
  }

  for (const entry of entries) visit(entry.id)
  return findings
}

function capabilityOverlap(
  bundles: readonly BundleInfoLike[],
): CompatFinding[] {
  const findings: CompatFinding[] = []
  const withText = bundles
    .filter((bundle) => typeof bundle.description === 'string' && bundle.description.length > 20)
    .slice(0, 50)
  for (let i = 0; i < withText.length; i++) {
    const left = withText[i]
    if (left === undefined || left.description === undefined) continue
    const leftShingles = shingles(wordTokens(left.description), 3)
    for (let j = i + 1; j < withText.length; j++) {
      const right = withText[j]
      if (right === undefined || right.description === undefined) continue
      const similarity = jaccard(leftShingles, shingles(wordTokens(right.description), 3))
      if (similarity < 0.55) continue
      findings.push(
        makeFinding({
          domain: 'plugin-plugin',
          code: 'PP_CAPABILITY_OVERLAP',
          severity: 'info',
          title: `${left.name} and ${right.name} describe overlapping capabilities`,
          subjects: [left.name, right.name],
          confidence: 'medium',
          evidence: [
            {
              source: 'plugin-manager',
              ref: left.name,
              summary: `description similarity ${similarity.toFixed(2)}`,
            },
          ],
          fix: {
            kind: 'none',
            summary: 'review whether both bundles are needed for this task',
            safe: true,
            requiresConsent: false,
          },
        }),
      )
    }
  }
  return findings
}

function promptOverlap(context: CompatContext): CompatFinding[] {
  const sections = [...(context.prompt?.sections ?? []), ...(context.prompt?.contexts ?? [])]
  const paragraphs: Array<{ section: string; text: string; normalized: string }> = []
  for (const section of sections.slice(0, 200)) {
    for (const text of splitParagraphs(section.text).slice(0, 20)) {
      const normalized = normalizeLine(text)
      if (normalized.length < 20) continue
      paragraphs.push({ section: section.name, text, normalized })
    }
  }
  if (paragraphs.length === 0) return []

  const findings: CompatFinding[] = []
  const byNormalized = new Map<string, typeof paragraphs>()
  for (const paragraph of paragraphs) {
    const list = byNormalized.get(paragraph.normalized) ?? []
    list.push(paragraph)
    byNormalized.set(paragraph.normalized, list)
  }
  for (const [, list] of byNormalized) {
    const sectionsInGroup = [...new Set(list.map((item) => item.section))]
    if (sectionsInGroup.length <= 1) continue
    const conflict = hasConflictingNumbersOrNegation(list.map((item) => item.text))
    findings.push(
      makeFinding({
        domain: 'plugin-plugin',
        code: 'PP_PROMPT_OVERLAP',
        severity: conflict ? 'warn' : 'info',
        title: conflict
          ? 'overlapping prompt rules contain conflicting values'
          : 'duplicate prompt text appears in multiple sections',
        subjects: sectionsInGroup,
        confidence: 'medium',
        evidence: [
          {
            source: 'prompt',
            ref: sectionsInGroup.join(', '),
            summary: list[0]?.text.slice(0, 120) ?? '',
          },
        ],
        fix: {
          kind: 'none',
          summary: conflict
            ? 'resolve the semantic conflict manually; do not auto-merge'
            : 'keep one authoritative section and remove or reference the duplicate',
          safe: !conflict,
          requiresConsent: false,
        },
      }),
    )
    if (findings.length >= 20) break
  }
  return findings
}

function hasConflictingNumbersOrNegation(texts: readonly string[]): boolean {
  const negations = /\b(not|never|no|禁止|不得|不要|必须|always|must)\b/i
  const numbers = /\d+/g
  const first = texts[0] ?? ''
  const firstNumbers = new Set(first.match(numbers) ?? [])
  for (const text of texts.slice(1)) {
    const current = new Set(text.match(numbers) ?? [])
    if (firstNumbers.size !== current.size) return true
    for (const value of firstNumbers) if (!current.has(value)) return true
    if (negations.test(first) !== negations.test(text)) return true
  }
  return false
}
