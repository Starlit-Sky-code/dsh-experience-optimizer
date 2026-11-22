import type { Context } from '@deepseek-ai/cordis'
import type { IncomingMessage, ServerResponse } from 'node:http'
import {
  isSameOrigin,
  readJsonBody,
  sendError,
  sendJson,
} from 'dsh-shared-meta'
import { normalizeConfig } from './config.ts'
import type { Config } from './config.ts'
import { analyzeCompatibility } from './compat/analyze.ts'
import { getInventory, getPluginManager, resolveProfileFacts } from './compat/adapters.ts'
import { attachFindings, buildSlimProfile } from './draft.ts'
import { scanPlugins } from './scan.ts'
import { detectTask } from './task.ts'
import { saveDraft } from './store.ts'
import { applySlimProfile, ApplyRefusedError } from './apply.ts'
import { rollbackSlimProfile } from './rollback.ts'
import type { UsageLedger } from './usage.ts'
import type { TaskTag } from 'dsh-shared-meta'

const API_PREFIX = '/api/dsh-experience-optimizer'
const CLIENT_HEADER = 'x-dsh-trim-client'
const CURRENT_VERSION = '0.4.0'
let updateCache: { at: number; value: Record<string, unknown> } | undefined
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

interface WebServerLike {
  register(route: {
    kind: 'prefix'
    path: string
    handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void>
  }): () => void
}

/** Register the same-origin JSON API used by the Web client panel. */
export function registerTrimApi(ctx: Context, config: Config, ledger: UsageLedger): void {
  if (typeof ctx.inject !== 'function') return
  ctx.inject(['webServer'], (webCtx) => {
    const server = webCtx.get('webServer') as WebServerLike | undefined
    if (server === undefined) return
    webCtx.effect(
      () =>
        server.register({
          kind: 'prefix',
          path: API_PREFIX,
          handler: (req, res) => handleTrimRequest(req, res, ctx, config, ledger),
        }),
      'trim.webApi',
    )
  })
}

export async function handleTrimRequest(
  req: IncomingMessage,
  res: ServerResponse,
  ctx: Context,
  config: Config,
  ledger: UsageLedger,
): Promise<void> {
  const connection = ctx.get('connection') as
    | { requestRejection?: (request: { headers: typeof req.headers }) => 401 | 403 | undefined }
    | undefined
  if (connection === undefined || typeof connection.requestRejection !== 'function') {
    sendError(res, 401, 'authentication unavailable')
    return
  }
  let rejection: 401 | 403 | undefined
  try {
    rejection = connection.requestRejection({ headers: req.headers })
  } catch {
    sendError(res, 401, 'authentication failed')
    return
  }
  if (rejection !== undefined) {
    sendError(res, rejection, 'authentication required')
    return
  }
  if (!isSameOrigin(req)) {
    sendError(res, 403, 'cross-site request rejected')
    return
  }
  if (req.headers[CLIENT_HEADER] !== '1') {
    sendError(res, 403, 'client header required')
    return
  }
  const url = new URL(req.url ?? '/', 'http://localhost')
  const path = url.pathname.slice(API_PREFIX.length) || '/'
  try {
    if (req.method === 'GET' && path === '/overview') {
      sendJson(res, 200, { ok: true, data: await overview(ctx, config, ledger) })
      return
    }
    if (req.method === 'GET' && path === '/config') {
      sendJson(res, 200, { ok: true, data: publicConfig(ctx, config) })
      return
    }
    if (req.method === 'GET' && path === '/update') {
      sendJson(res, 200, { ok: true, data: await checkForUpdate() })
      return
    }
    if (req.method === 'POST' && path === '/config') {
      const body = await readJsonBody<Record<string, unknown>>(req)
      const patch = sanitizeConfigPatch(body)
      const next = await updateTrimConfig(ctx, patch)
      sendJson(res, 200, { ok: true, data: publicConfig(ctx, normalizeConfig(next)) })
      return
    }
    if (req.method === 'POST' && path === '/suggest') {
      const body = await readJsonBody<Record<string, unknown>>(req)
      sendJson(res, 200, { ok: true, data: await suggest(ctx, config, ledger, body) })
      return
    }
    if (req.method === 'POST' && path === '/apply') {
      const body = await readJsonBody<Record<string, unknown>>(req)
      sendJson(res, 200, { ok: true, data: await apply(ctx, config, body) })
      return
    }
    if (req.method === 'POST' && path === '/rollback') {
      const body = await readJsonBody<Record<string, unknown>>(req)
      sendJson(res, 200, { ok: true, data: await rollback(ctx, config, body) })
      return
    }
    sendError(res, 404, `unknown endpoint ${path}`)
  } catch (error) {
    sendError(res, 500, error instanceof Error ? error.message : String(error))
  }
}

export function compareVersions(left: string, right: string): number {
  const parse = (value: string): number[] =>
    value.replace(/^v/, '').split('-')[0].split('.').map((part) => Number.parseInt(part, 10) || 0)
  const a = parse(left)
  const b = parse(right)
  for (let index = 0; index < Math.max(a.length, b.length); index++) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0)
    if (difference !== 0) return difference > 0 ? 1 : -1
  }
  return 0
}

async function checkForUpdate(): Promise<Record<string, unknown>> {
  if (updateCache !== undefined && Date.now() - updateCache.at < 60_000) return updateCache.value
  const base = {
    current: CURRENT_VERSION,
    package: 'dsh-plugin-trim',
    url: 'https://www.npmjs.com/package/dsh-plugin-trim',
  }
  try {
    const response = await fetch('https://registry.npmjs.org/dsh-plugin-trim/latest', {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(4000),
    })
    if (!response.ok) throw new Error(`registry HTTP ${response.status}`)
    const metadata = (await response.json()) as { version?: unknown }
    const latest = typeof metadata.version === 'string' ? metadata.version : undefined
    if (latest === undefined) throw new Error('registry response has no version')
    const value = {
      ...base,
      latest,
      updateAvailable: compareVersions(latest, CURRENT_VERSION) > 0,
      checkedAt: new Date().toISOString(),
    }
    updateCache = { at: Date.now(), value }
    return value
  } catch (error) {
    return {
      ...base,
      latest: null,
      updateAvailable: false,
      error: error instanceof Error ? error.message : String(error),
      checkedAt: new Date().toISOString(),
    }
  }
}

/** Validate the mutable config fields accepted from the authenticated Web UI. */
export function sanitizeConfigPatch(input: unknown): Partial<Config> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('config patch must be an object')
  }
  const raw = input as Record<string, unknown>
  const patch: Partial<Config> = {}
  if ('mode' in raw) {
    if (raw.mode !== 'advise' && raw.mode !== 'auto-safe') throw new Error('invalid mode')
    patch.mode = raw.mode
  }
  if ('approvalMode' in raw) {
    if (raw.approvalMode !== 'always' && raw.approvalMode !== 'risk-based') throw new Error('invalid approvalMode')
    patch.approvalMode = raw.approvalMode
  }
  if ('suggestionPolicy' in raw) {
    if (raw.suggestionPolicy !== 'conservative' && raw.suggestionPolicy !== 'balanced') throw new Error('invalid suggestionPolicy')
    patch.suggestionPolicy = raw.suggestionPolicy
  }
  if ('approvalThreshold' in raw) {
    const value = Number(raw.approvalThreshold)
    if (!Number.isInteger(value) || value < 1 || value > 100) throw new Error('invalid approvalThreshold')
    patch.approvalThreshold = value
  }
  if ('trackUsage' in raw) {
    if (typeof raw.trackUsage !== 'boolean') throw new Error('invalid trackUsage')
    patch.trackUsage = raw.trackUsage
  }
  if ('usageRetentionDays' in raw) {
    const value = Number(raw.usageRetentionDays)
    if (!Number.isInteger(value) || value < 1 || value > 365) throw new Error('invalid usageRetentionDays')
    patch.usageRetentionDays = value
  }
  if ('maxDrafts' in raw) {
    const value = Number(raw.maxDrafts)
    if (!Number.isInteger(value) || value < 1 || value > 200) throw new Error('invalid maxDrafts')
    patch.maxDrafts = value
  }
  if ('protect' in raw) patch.protect = stringList(raw.protect, 'protect')
  if ('pinned' in raw) patch.pinned = stringList(raw.pinned, 'pinned')
  if (Object.keys(patch).length === 0) throw new Error('config patch is empty')
  return patch
}

function stringList(value: unknown, field: string): string[] {
  if (!Array.isArray(value)) throw new Error(`invalid ${field}`)
  return value
    .map((item) => typeof item === 'string' ? item.trim() : '')
    .filter(Boolean)
    .slice(0, 200)
}

interface LoaderLike {
  entries(): Iterable<{ options?: { id?: string; name?: string; config?: Record<string, unknown> } }>
  update(id: string, options: { config: Record<string, unknown> }): Promise<unknown>
}

/** Write the validated patch through the DSH loader so the profile patch remains authoritative. */
export async function updateTrimConfig(ctx: Context, patch: Partial<Config>): Promise<Config> {
  const loader = ctx.get('loader') as LoaderLike | undefined
  if (!loader || typeof loader.entries !== 'function' || typeof loader.update !== 'function') {
    throw new Error('loader unavailable; config was not written')
  }
  let entry: { options?: { id?: string; name?: string; config?: Record<string, unknown> } } | undefined
  for (const candidate of loader.entries()) {
    if (candidate.options?.id === 'dsh-plugin-trim' || candidate.options?.name === 'dsh-plugin-trim') {
      entry = candidate
      break
    }
  }
  if (!entry?.options?.id) throw new Error('plugin entry not found; config was not written')
  const current = entry.options.config && typeof entry.options.config === 'object'
    ? entry.options.config
    : {}
  const next = { ...current, ...patch }
  await loader.update(entry.options.id, { config: next })
  return normalizeConfig(next as Partial<Config>)
}

export function publicConfig(ctx: Context, config: Config): unknown {
  const profile = resolveProfileFacts(ctx)
  return {
    profile: profile.name,
    profileDir: profile.dir,
    mode: config.mode,
    approvalMode: config.approvalMode,
    suggestionPolicy: config.suggestionPolicy,
    approvalThreshold: config.approvalThreshold,
    protect: [...config.protect],
    pinned: [...config.pinned],
    trackUsage: config.trackUsage,
    usageRetentionDays: config.usageRetentionDays,
    maxDrafts: config.maxDrafts,
  }
}

async function overview(ctx: Context, config: Config, ledger: UsageLedger): Promise<unknown> {
  const compat = await analyzeCompatibility(ctx, config, {
    scope: 'current',
    includeInfo: true,
    writeReport: false,
  })
  const scan = await scanPlugins({
    config,
    compat,
    pluginManager: getPluginManager(ctx),
    inventory: await inventoryOf(ctx),
    usageLedger: ledger,
  })
  const byOwner = Object.entries(scan.context.byOwner)
    .map(([owner, tokens]) => ({ owner, tokens }))
    .sort((a, b) => b.tokens - a.tokens)
    .slice(0, 12)
  return {
    runtime: compat.report.runtime,
    profile: compat.report.profile,
    compat: compat.report.summary,
    findings: compat.findings.map(toFinding),
    context: {
      totalTokens: scan.context.totalTokens,
      unattributedTokens: scan.context.unattributedTokens,
      topSections: [...scan.context.sections]
        .sort((a, b) => b.tokens - a.tokens)
        .slice(0, 12),
      topTools: [...scan.context.tools].sort((a, b) => b.tokens - a.tokens).slice(0, 12),
      byOwner,
    },
    bundles: [...scan.bundles]
      .sort((a, b) => b.contextTokens - a.contextTokens)
      .slice(0, 80)
      .map((bundle) => ({
        name: bundle.name,
        version: bundle.version,
        enabled: bundle.enabled,
        protected: bundle.protected,
        guardStatus: bundle.guardStatus,
        contextTokens: bundle.contextTokens,
        usage: bundle.usage,
        description: bundle.description,
      })),
    entries: [...scan.entries]
      .sort((a, b) => b.contextTokens - a.contextTokens)
      .slice(0, 60)
      .map((entry) => ({
        entryId: entry.entryId,
        moduleName: entry.moduleName,
        bundleName: entry.bundleName,
        enabled: entry.enabled,
        fiberPhase: entry.fiberPhase,
        guardStatus: entry.guardStatus,
        contextTokens: entry.contextTokens,
      })),
    dedupe: scan.dedupe,
    managementAvailable: scan.managementAvailable,
    recipeAvailable: scan.bundles.some(
      (bundle) => bundle.name === 'dsh-plugin-recipe' && bundle.enabled,
    ),
    diagnostics: scan.diagnostics,
  }
}

async function suggest(
  ctx: Context,
  config: Config,
  ledger: UsageLedger,
  body: Record<string, unknown>,
): Promise<unknown> {
  const taskTag = typeof body.taskTag === 'string' && TASK_TAGS.includes(body.taskTag as TaskTag)
    ? (body.taskTag as TaskTag)
    : undefined
  const goal = typeof body.goal === 'string' ? body.goal : undefined
  const task = detectTask({ explicit: taskTag, goal })
  const compat = await analyzeCompatibility(ctx, config, {
    scope: 'current',
    includeInfo: true,
    writeReport: true,
  })
  const scan = await scanPlugins({
    config,
    compat,
    pluginManager: getPluginManager(ctx),
    inventory: await inventoryOf(ctx),
    usageLedger: ledger,
    task,
  })
  let profile = buildSlimProfile(scan, task, config, {
    includeReview: body.includeReview !== false,
    maxDisable: typeof body.maxDisable === 'number' ? body.maxDisable : undefined,
  })
  profile = attachFindings(profile, scan)
  await saveDraft(profile, config.maxDrafts)
  return {
    profile,
    compat: compat.report.summary,
    scan: {
      totalTokens: scan.context.totalTokens,
      unattributedTokens: scan.context.unattributedTokens,
      managementAvailable: scan.managementAvailable,
    },
    findings: compat.findings.map(toFinding),
  }
}

async function apply(
  ctx: Context,
  config: Config,
  body: Record<string, unknown>,
): Promise<unknown> {
  if (body.confirm !== true) throw new ApplyRefusedError('confirm must be true')
  const profileId = typeof body.profileId === 'string' ? body.profileId : ''
  if (profileId.length === 0) throw new Error('profileId is required')
  const manager = getPluginManager(ctx)
  if (manager === undefined) throw new Error('pluginManager is unavailable')
  const items = Array.isArray(body.items)
    ? body.items.filter((item): item is string => typeof item === 'string')
    : undefined
  const compat = await analyzeCompatibility(ctx, config, {
    scope: 'current',
    includeInfo: true,
    writeReport: true,
    force: true,
  })
  return applySlimProfile(profileId, {
    confirm: true,
    items,
    manager,
    maxDrafts: config.maxDrafts,
    findings: compat.findings,
    profileName: resolveProfileFacts(ctx).name,
  })
}

async function rollback(
  ctx: Context,
  config: Config,
  body: Record<string, unknown>,
): Promise<unknown> {
  const manager = getPluginManager(ctx)
  if (manager === undefined) throw new Error('pluginManager is unavailable')
  const token = typeof body.token === 'string' && body.token.length > 0 ? body.token : undefined
  return rollbackSlimProfile({
    token,
    manager,
    maxDrafts: config.maxDrafts,
    profileName: resolveProfileFacts(ctx).name,
  })
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

function toFinding(finding: {
  code: string
  severity: string
  domain: string
  title: string
  subjects: string[]
  confidence: string
  fix?: unknown
  evidence: unknown[]
}) {
  return {
    code: finding.code,
    severity: finding.severity,
    domain: finding.domain,
    title: finding.title,
    subjects: finding.subjects,
    confidence: finding.confidence,
    fix: finding.fix,
    evidence: finding.evidence,
  }
}
