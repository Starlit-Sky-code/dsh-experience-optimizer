import { AuditLog } from 'dsh-shared-meta'
import type {
  ApplySnapshot,
  RollbackItemResult,
  RollbackResult,
} from 'dsh-shared-meta'
import type { PluginManagerLike } from './compat/model.ts'
import { loadDraft, loadSnapshot, listSnapshots, saveDraft, saveSnapshot } from './store.ts'

export interface RollbackOptions {
  token?: string
  manager: PluginManagerLike
  maxDrafts: number
  profileName?: string
}

/** Restore a previous apply snapshot, skipping state changed outside trim. */
export async function rollbackSlimProfile(
  options: RollbackOptions,
): Promise<RollbackResult> {
  const token = options.token ?? (await latestToken(options.profileName))
  if (token === undefined) throw new Error('no rollback snapshot found')
  const snapshot = await loadSnapshot(token)
  if (snapshot === undefined) throw new Error(`unknown rollback token: ${token}`)

  const [bundles, entries] = await Promise.all([
    options.manager.listBundles(),
    options.manager.listPlugins(),
  ])
  const bundleEnabled = new Map(bundles.map((bundle) => [bundle.name, bundle.enabled]))
  const entryEnabled = new Map(entries.map((entry) => [entry.entryId, entry.enabled]))

  const results: RollbackItemResult[] = []
  for (const item of [...snapshot.items].reverse()) {
    if (item.status !== 'applied' && item.status !== 'failed') {
      results.push({
        id: item.id,
        kind: item.kind,
        name: item.name,
        status: 'skipped',
      })
      continue
    }
    const current = item.kind === 'bundle'
      ? (bundleEnabled.get(item.name) ?? item.desiredEnabled)
      : (entryEnabled.get(item.name) ?? item.desiredEnabled)
    const pendingRestart = item.application === 'restart-required'
    const matchesPrevious = current === item.previousEnabled
    const matchesDesired = current === item.desiredEnabled
    if (matchesPrevious && !pendingRestart) {
      results.push({
        id: item.id,
        kind: item.kind,
        name: item.name,
        status: 'already-restored',
      })
      continue
    }
    if (!matchesPrevious && !matchesDesired) {
      results.push({
        id: item.id,
        kind: item.kind,
        name: item.name,
        status: 'externally-changed',
      })
      continue
    }
    try {
      if (item.kind === 'bundle') {
        if (typeof options.manager.setBundleEnabled !== 'function') {
          throw new Error('plugin manager cannot set bundles')
        }
        await options.manager.setBundleEnabled(item.name, item.previousEnabled)
        bundleEnabled.set(item.name, item.previousEnabled)
      } else {
        if (typeof options.manager.setPluginEnabled !== 'function') {
          throw new Error('plugin manager cannot set plugins')
        }
        await options.manager.setPluginEnabled(item.name, item.previousEnabled)
        entryEnabled.set(item.name, item.previousEnabled)
      }
      results.push({
        id: item.id,
        kind: item.kind,
        name: item.name,
        status: 'restored',
      })
      item.status = 'skipped'
    } catch (error) {
      results.push({
        id: item.id,
        kind: item.kind,
        name: item.name,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  snapshot.status = 'rolled-back'
  await saveSnapshot(snapshot, options.maxDrafts)
  const draft = await loadDraft(snapshot.profileId)
  if (draft !== undefined) {
    draft.status = 'rolled-back'
    await saveDraft(draft, options.maxDrafts).catch(() => undefined)
  }

  await new AuditLog()
    .append({
      t: new Date().toISOString(),
      actor: 'trim',
      action: 'rollback',
      subject: snapshot.profileId,
      result: results.some((item) => item.status === 'failed') ? 'fail' : 'ok',
      summary: `restored ${results.filter((item) => item.status === 'restored').length} items`,
      metrics: { items: results.length },
    })
    .catch(() => undefined)

  return { token, items: results }
}

async function latestToken(profileName?: string): Promise<string | undefined> {
  const files = await listSnapshots()
  for (const file of files) {
    const token = file.replace(/\.json$/, '').split(/[\\/]/).pop()
    if (token === undefined) continue
    if (profileName === undefined) return token
    try {
      const snapshot = await loadSnapshot(token)
      if (snapshot?.profileName === profileName) return token
    } catch {
      // Skip a corrupt snapshot and try the next one.
    }
  }
  return undefined
}

/** Read a snapshot for diagnostics without changing state. */
export async function readSnapshot(token: string): Promise<ApplySnapshot | undefined> {
  return loadSnapshot(token)
}
