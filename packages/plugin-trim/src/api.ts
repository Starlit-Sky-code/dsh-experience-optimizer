import type { Context } from '@deepseek-ai/cordis'
import type { IncomingMessage, ServerResponse } from 'node:http'
import {
  isSameOrigin,
  readJsonBody,
  sendError,
  sendJson,
} from 'dsh-shared-meta'
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
          handler: (req, res) => handle(req, res, ctx, config, ledger),
        }),
      'trim.webApi',
    )
  })
}

async function handle(
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
  const url = new URL(req.url ?? '/', 'http://localhost')
  const path = url.pathname.slice(API_PREFIX.length) || '/'
  try {
    if (req.method === 'GET' && path === '/overview') {
      sendJson(res, 200, { ok: true, data: await overview(ctx, config, ledger) })
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
