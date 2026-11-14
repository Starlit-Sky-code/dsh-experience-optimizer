import type { Context } from '@deepseek-ai/cordis'
import type { IncomingMessage, ServerResponse } from 'node:http'
import {
  dataDir,
  isSameOrigin,
  readJson,
  readJsonBody,
  sendError,
  sendJson,
} from 'dsh-shared-meta'
import type { CompatReport, WorkflowBlueprint } from 'dsh-shared-meta'
import type { Config } from './config.ts'
import { availableCapabilities, loadCapabilities } from './capabilities.ts'
import { defaultsFor, isWorkflowGoal } from './wizard.ts'
import { translateGoal } from './translate.ts'
import { validateBlueprint } from './validate.ts'
import { exportBlueprint, type ExportFormat } from './export.ts'

const API_PREFIX = '/api/dsh-experience-optimizer/recipe'

interface WebServerLike {
  register(route: {
    kind: 'prefix'
    path: string
    handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void>
  }): () => void
}

/** Register the recipe panel API used by the Web client. */
export function registerRecipeApi(ctx: Context, config: Config): void {
  if (typeof ctx.inject !== 'function') return
  ctx.inject(['webServer'], (webCtx) => {
    const server = webCtx.get('webServer') as WebServerLike | undefined
    if (server === undefined) return
    webCtx.effect(
      () =>
        server.register({
          kind: 'prefix',
          path: API_PREFIX,
          handler: (req, res) => handle(req, res, ctx, config),
        }),
      'recipe.webApi',
    )
  })
}

async function handle(
  req: IncomingMessage,
  res: ServerResponse,
  ctx: Context,
  config: Config,
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
    if (req.method === 'POST' && path === '/plan') {
      const body = await readJsonBody<Record<string, unknown>>(req)
      sendJson(res, 200, { ok: true, data: await plan(ctx, config, body) })
      return
    }
    if (req.method === 'POST' && path === '/export') {
      const body = await readJsonBody<Record<string, unknown>>(req)
      sendJson(res, 200, { ok: true, data: await exportRunbook(ctx, config, body) })
      return
    }
    sendError(res, 404, `unknown endpoint ${path}`)
  } catch (error) {
    sendError(res, 500, error instanceof Error ? error.message : String(error))
  }
}

async function plan(
  ctx: Context,
  config: Config,
  body: Record<string, unknown>,
): Promise<unknown> {
  const goal = typeof body.goal === 'string' ? body.goal.trim() : ''
  if (goal.length === 0) throw new Error('goal is required')
  const rawAnswers = isRecord(body.answers) ? body.answers : {}
  const answers = defaultsFor(goal, {
    goal,
    scope: stringValue(rawAnswers.scope),
    frequency: stringValue(rawAnswers.frequency),
    sources: stringArray(rawAnswers.sources),
    outputFormat: stringValue(rawAnswers.outputFormat),
    delivery: stringValue(rawAnswers.delivery),
    onFailure: stringValue(rawAnswers.onFailure),
    acceptance: stringArray(rawAnswers.acceptance),
  })
  const catalog = await loadCapabilities(config.capabilitiesFile)
  const toolExists = (name: string): boolean =>
    catalog.capabilities.some((capability) => capability.tools.includes(name)) ||
    ctx.tools.get(name) !== undefined
  const compat = await readCompatReport()
  const blocked = blockedSubjects(compat)
  const capabilities = availableCapabilities(catalog.capabilities, toolExists).filter(
    (capability) =>
      !capability.pluginIds.some((plugin) => blocked.has(plugin)) &&
      !capability.tools.some((tool) => blocked.has(tool)),
  )
  const available = new Set(capabilities.map((capability) => capability.id))
  const blueprint = translateGoal(goal, answers, catalog.capabilities, {
    available,
    suggestedDisable: [],
  })
  if (blocked.size > 0) {
    blueprint.uncertainties.push(
      `兼容性报告存在 error，以下主体被排除：${[...blocked].slice(0, 10).join(', ')}`,
    )
  }
  for (const diagnostic of catalog.diagnostics) blueprint.uncertainties.push(diagnostic)
  blueprint.uncertainties = [...new Set(blueprint.uncertainties)]
  const known = await knownPlugins(ctx, catalog.capabilities, toolExists)
  const issues = validateBlueprint(blueprint, {
    toolExists,
    pluginKnown: (name) => known.has(name),
    scheduleAvailable: ctx.get('schedule') !== undefined,
    maxSteps: config.maxSteps,
    capabilities: catalog.capabilities,
    compatFindings: compat?.findings,
  })
  return {
    goal,
    isWorkflow: isWorkflowGoal(goal),
    blueprint,
    issues,
    capabilities: capabilities.map((capability) => ({
      id: capability.id,
      name: capability.name,
      tools: capability.tools,
      permissions: capability.permissions,
    })),
    note: 'UI 预览按内置能力目录判断工具可用性；精确的 agent-scope 校验以 recipe_plan_workflow 工具为准。',
  }
}

async function exportRunbook(
  ctx: Context,
  config: Config,
  body: Record<string, unknown>,
): Promise<unknown> {
  if (!config.allowExport) throw new Error('export is disabled by config')
  if (!isWorkflowBlueprint(body.blueprint)) throw new Error('blueprint is invalid')
  const format = body.format === 'markdown' || body.format === 'json' || body.format === 'both'
    ? (body.format as ExportFormat)
    : 'both'
  return exportBlueprint(body.blueprint, format)
}

async function readCompatReport(): Promise<CompatReport | undefined> {
  return readJson<CompatReport>(dataDir('compat', 'report.json')).catch(() => undefined)
}

function blockedSubjects(report: CompatReport | undefined): Set<string> {
  const set = new Set<string>()
  for (const finding of report?.findings ?? []) {
    if (finding.severity !== 'error') continue
    for (const subject of finding.subjects) set.add(subject)
  }
  return set
}

async function knownPlugins(
  ctx: Context,
  capabilities: readonly { tools: string[]; pluginIds: string[] }[],
  toolExists: (name: string) => boolean,
): Promise<Set<string>> {
  const known = new Set<string>()
  for (const capability of capabilities) {
    if (!capability.tools.some((tool) => toolExists(tool))) continue
    for (const plugin of capability.pluginIds) known.add(plugin)
  }
  const manager = ctx.get('pluginManager') as
    | { listBundles?: () => Promise<Array<{ name?: string }>> }
    | undefined
  if (typeof manager?.listBundles === 'function') {
    try {
      for (const bundle of await manager.listBundles()) {
        if (typeof bundle.name === 'string') known.add(bundle.name)
      }
    } catch {
      // Tool presence is still checked by validateBlueprint.
    }
  }
  return known
}

function isWorkflowBlueprint(value: unknown): value is WorkflowBlueprint {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { schemaVersion?: unknown }).schemaVersion === 1 &&
    typeof (value as { id?: unknown }).id === 'string' &&
    typeof (value as { goal?: unknown }).goal === 'string' &&
    Array.isArray((value as { steps?: unknown }).steps)
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function stringArray(value: unknown): string[] | undefined {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : undefined
}
