import {
  AuditLog,
  randomToken,
} from 'dsh-shared-meta'
import type {
  ApplyItemResult,
  ApplyResult,
  ApplySnapshot,
  CompatFinding,
  SlimItem,
} from 'dsh-shared-meta'
import type { ChangeResultLike, PluginManagerLike } from './compat/model.ts'
import { findingsBySubject } from './compat/finding.ts'
import { applicableItems } from './draft.ts'
import { loadDraft, saveDraft, saveSnapshot } from './store.ts'

export class ApplyRefusedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ApplyRefusedError'
  }
}

export interface ApplyOptions {
  confirm: boolean
  items?: string[]
  manager: PluginManagerLike
  maxDrafts: number
  findings?: readonly CompatFinding[]
  profileName?: string
}

const CONFLICT_FIX_CODES = new Set([
  'PP_SERVICE_DUPLICATE',
  'PP_ROW_DUPLICATE',
  'PP_MCP_SERVER_DUPLICATE',
  'PP_RUNTIME_REGISTRATION_FAILED',
  'RT_PLATFORM_UNSUPPORTED',
  'RT_ENGINE_UNMET',
  'RT_PEER_UNMET',
  'RT_PREFLIGHT_DENIED',
])

/** Apply low-risk items from a saved draft, with a crash-safe snapshot and automatic rollback. */
export async function applySlimProfile(
  profileId: string,
  options: ApplyOptions,
): Promise<ApplyResult> {
  if (options.confirm !== true) {
    throw new ApplyRefusedError(
      'apply requires confirm: true; ask the user to explicitly approve the exact profileId and items first',
    )
  }
  const draft = await loadDraft(profileId)
  if (draft === undefined) throw new Error(`unknown slim profile: ${profileId}`)

  const desiredIds = options.items === undefined ? undefined : new Set(options.items)
  let candidates = applicableItems(draft).filter(
    (item) => desiredIds === undefined || desiredIds.has(item.id),
  )
  if (candidates.length === 0) return { profileId, items: [] }

  const [bundles, entries] = await Promise.all([
    options.manager.listBundles(),
    options.manager.listPlugins(),
  ])
  const bundleEnabled = new Map(bundles.map((bundle) => [bundle.name, bundle.enabled]))
  const entryEnabled = new Map(entries.map((entry) => [entry.entryId, entry.enabled]))
  const freshFindings = findingsBySubject(options.findings ?? [])

  // A bundle disable supersedes entry operations under it.
  const disabledBundles = new Set(
    candidates
      .filter((item) => item.kind === 'bundle' && item.action === 'suggest-disable')
      .map((item) => item.bundleName)
      .filter((name): name is string => name !== undefined),
  )
  candidates = candidates.filter(
    (item) => !(item.kind === 'entry' && item.bundleName !== undefined && disabledBundles.has(item.bundleName)),
  )

  const token = randomToken()
  const snapshot: ApplySnapshot = {
    schemaVersion: 1,
    token,
    profileId,
    profileName: options.profileName,
    createdAt: new Date().toISOString(),
    status: 'pending',
    items: candidates.map((item) => ({
      id: item.id,
      kind: item.kind,
      name: item.name,
      previousEnabled: currentEnabled(item, bundleEnabled, entryEnabled),
      desiredEnabled: item.action === 'enable',
      status: 'pending',
    })),
  }
  await saveSnapshot(snapshot, options.maxDrafts)

  const results: ApplyItemResult[] = []
  let restartRequired = false
  let failed = false

  for (let index = 0; index < candidates.length; index++) {
    const item = candidates[index]!
    const snapshotItem = snapshot.items[index]
    if (snapshotItem === undefined) continue
    const current = currentEnabled(item, bundleEnabled, entryEnabled)
    if (current !== item.observedEnabled) {
      results.push({
        id: item.id,
        kind: item.kind,
        name: item.name,
        status: 'stale',
        error: 'plugin state changed since the draft was created',
      })
      snapshotItem.status = 'skipped'
      await saveSnapshot(snapshot, options.maxDrafts)
      continue
    }
    if (current === snapshotItem.desiredEnabled) {
      results.push({
        id: item.id,
        kind: item.kind,
        name: item.name,
        status: 'skipped',
        error: 'already in the desired state',
      })
      snapshotItem.status = 'skipped'
      await saveSnapshot(snapshot, options.maxDrafts)
      continue
    }
    if (item.protected) {
      results.push({ id: item.id, kind: item.kind, name: item.name, status: 'skipped', error: 'protected' })
      snapshotItem.status = 'skipped'
      await saveSnapshot(snapshot, options.maxDrafts)
      continue
    }
    const blocked = blockedByCompat(item, [
      ...(freshFindings.get(item.name) ?? []),
      ...(item.bundleName === undefined ? [] : (freshFindings.get(item.bundleName) ?? [])),
    ])
    if (blocked !== undefined) {
      results.push({
        id: item.id,
        kind: item.kind,
        name: item.name,
        status: 'blocked-by-compat',
        error: blocked,
      })
      snapshotItem.status = 'skipped'
      await saveSnapshot(snapshot, options.maxDrafts)
      continue
    }

    let change: ChangeResultLike
    try {
      change = await applyOne(item, options.manager)
    } catch (error) {
      change = {
        changed: false,
        application: 'failed',
        error: { diagnostic: error instanceof Error ? error.message : String(error) },
      }
    }
    const status = mapStatus(change)
    if (status === 'failed') {
      failed = true
      snapshotItem.status = 'failed'
      snapshotItem.application = change.application
      snapshotItem.error = change.error?.diagnostic ?? change.error?.code
      results.push({
        id: item.id,
        kind: item.kind,
        name: item.name,
        status: 'failed',
        application: change.application,
        error: snapshotItem.error,
      })
    } else {
      snapshotItem.status = 'applied'
      snapshotItem.application = change.application
      results.push({
        id: item.id,
        kind: item.kind,
        name: item.name,
        status,
        application: change.application,
        fixKind: fixKindFor(item, [
          ...(freshFindings.get(item.name) ?? []),
          ...(item.bundleName === undefined ? [] : (freshFindings.get(item.bundleName) ?? [])),
        ]),
      })
      if (change.application === 'restart-required') restartRequired = true
      if (item.kind === 'bundle') bundleEnabled.set(item.name, snapshotItem.desiredEnabled)
      else entryEnabled.set(item.name, snapshotItem.desiredEnabled)
    }
    await saveSnapshot(snapshot, options.maxDrafts)
    if (failed) break
  }

  if (failed) {
    await autoRollback(snapshot, options.manager)
    snapshot.status = 'partial'
    await saveSnapshot(snapshot, options.maxDrafts)
    draft.status = 'partial'
    await saveDraft(draft, options.maxDrafts).catch(() => undefined)
    await audit(profileId, 'apply', 'fail', 'applied then rolled back after a failure', results.length)
    return { profileId, token, items: results, rolledBack: true, restartRequired }
  }

  snapshot.status = 'applied'
  await saveSnapshot(snapshot, options.maxDrafts)
  draft.status = 'applied'
  await saveDraft(draft, options.maxDrafts).catch(() => undefined)
  await audit(
    profileId,
    'apply',
    'ok',
    `applied ${results.filter((item) => item.status !== 'skipped').length} items`,
    results.length,
  )
  return { profileId, token, items: results, restartRequired }
}

async function applyOne(item: SlimItem, manager: PluginManagerLike): Promise<ChangeResultLike> {
  const enabled = item.action === 'enable'
  if (item.kind === 'bundle') {
    if (typeof manager.setBundleEnabled !== 'function') throw new Error('plugin manager cannot set bundles')
    return manager.setBundleEnabled(item.name, enabled)
  }
  if (typeof manager.setPluginEnabled !== 'function') throw new Error('plugin manager cannot set plugins')
  return manager.setPluginEnabled(item.name, enabled)
}

async function autoRollback(snapshot: ApplySnapshot, manager: PluginManagerLike): Promise<void> {
  for (const item of [...snapshot.items].reverse()) {
    if (item.status !== 'applied') continue
    try {
      if (item.kind === 'bundle') {
        await manager.setBundleEnabled?.(item.name, item.previousEnabled)
      } else {
        await manager.setPluginEnabled?.(item.name, item.previousEnabled)
      }
      item.status = 'skipped'
      item.error = 'rolled back after a later failure'
    } catch {
      // Keep the applied status so a later manual rollback can retry.
    }
  }
}

function mapStatus(change: ChangeResultLike): ApplyItemResult['status'] {
  if (change.application === 'applied') return 'applied'
  if (change.application === 'restart-required') return 'applied-pending-restart'
  return 'failed'
}

function currentEnabled(
  item: SlimItem,
  bundles: Map<string, boolean>,
  entries: Map<string, boolean>,
): boolean {
  return item.kind === 'bundle'
    ? (bundles.get(item.name) ?? item.observedEnabled)
    : (entries.get(item.name) ?? item.observedEnabled)
}

function blockedByCompat(item: SlimItem, findings: readonly CompatFinding[]): string | undefined {
  const errors = [...item.findings, ...findings].filter((finding) => finding.severity === 'error')
  if (errors.length === 0) return undefined
  if (item.action === 'enable') {
    return `enabling would collide with ${errors.map((finding) => finding.code).join(', ')}`
  }
  if (errors.every((finding) => CONFLICT_FIX_CODES.has(finding.code))) return undefined
  return `compatibility error is not safe to auto-resolve: ${errors.map((finding) => finding.code).join(', ')}`
}

function fixKindFor(item: SlimItem, findings: readonly CompatFinding[]): ApplyItemResult['fixKind'] {
  if (item.action !== 'suggest-disable') return undefined
  const combined = [...item.findings, ...findings]
  if (combined.some((finding) => finding.code.startsWith('PP_'))) return 'conflict'
  if (combined.some((finding) => finding.code.startsWith('RT_'))) return 'workaround'
  return undefined
}

async function audit(
  subject: string,
  action: string,
  result: 'ok' | 'fail' | 'skipped',
  summary: string,
  count: number,
): Promise<void> {
  await new AuditLog()
    .append({
      t: new Date().toISOString(),
      actor: 'trim',
      action,
      subject,
      result,
      summary,
      metrics: { items: count },
    })
    .catch(() => undefined)
}
