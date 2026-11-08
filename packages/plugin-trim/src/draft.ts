import { newId } from 'dsh-shared-meta'
import type { SlimItem, SlimProfile, TaskProfile } from 'dsh-shared-meta'
import type { Config } from './config.ts'
import type { ScanResult } from './scan.ts'
import { computeOverlapSet, scoreBundle, scoreEntry } from './score.ts'
import { sortFindings } from './compat/finding.ts'

export interface DraftOptions {
  includeReview?: boolean
  maxDisable?: number
  mode?: Config['mode']
}

/** Build a local, reversible slim-profile draft. Does not change plugin state. */
export function buildSlimProfile(
  scan: ScanResult,
  task: TaskProfile,
  config: Config,
  options: DraftOptions = {},
): SlimProfile {
  const overlap = computeOverlapSet(scan)
  const items: SlimItem[] = []
  for (const bundle of scan.bundles) {
    if (!bundle.enabled && bundle.availability === 'missing') continue
    items.push(scoreBundle(scan, task, bundle, overlap))
  }
  for (const entry of scan.entries) {
    if (entry.bundleName === undefined || entry.patchId === undefined) continue
    items.push(scoreEntry(scan, task, entry, overlap))
  }

  const bundleDisables = new Set(
    items
      .filter((item) => item.kind === 'bundle' && item.action === 'suggest-disable')
      .map((item) => item.bundleName)
      .filter((name): name is string => name !== undefined),
  )
  let filtered = items.filter(
    (item) => !(item.kind === 'entry' && item.bundleName !== undefined && bundleDisables.has(item.bundleName)),
  )

  if (options.includeReview === false) {
    filtered = filtered.filter((item) => item.action !== 'review')
  }

  const maxDisable = Math.max(0, options.maxDisable ?? 20)
  let disableCount = 0
  filtered = filtered.filter((item) => {
    if (item.action !== 'suggest-disable') return true
    disableCount++
    return disableCount <= maxDisable
  })

  filtered.sort(compareItems)

  const summary = {
    keep: filtered.filter((item) => item.action === 'keep').length,
    enable: filtered.filter((item) => item.action === 'enable').length,
    disable: filtered.filter((item) => item.action === 'suggest-disable').length,
    review: filtered.filter((item) => item.action === 'review').length,
    protected: filtered.filter((item) => item.protected).length,
  }

  return {
    schemaVersion: 1,
    id: newId('slim'),
    createdAt: new Date().toISOString(),
    task,
    mode: options.mode ?? config.mode,
    items: filtered,
    dedupe: scan.dedupe,
    summary,
    status: 'draft',
  }
}

/** Items eligible for apply: low-risk disables/enables and not protected. */
export function applicableItems(profile: SlimProfile): SlimItem[] {
  return profile.items.filter(
    (item) =>
      item.protected === false &&
      item.risk === 'low' &&
      (item.action === 'suggest-disable' || item.action === 'enable'),
  )
}

const ACTION_RANK: Record<SlimItem['action'], number> = {
  'suggest-disable': 0,
  enable: 1,
  review: 2,
  'disable-if-unused': 3,
  keep: 4,
}

function compareItems(a: SlimItem, b: SlimItem): number {
  const action = ACTION_RANK[a.action] - ACTION_RANK[b.action]
  if (action !== 0) return action
  const risk = riskRank(a.risk) - riskRank(b.risk)
  if (risk !== 0) return risk
  return a.name.localeCompare(b.name)
}

function riskRank(risk: SlimItem['risk']): number {
  return risk === 'low' ? 0 : risk === 'medium' ? 1 : 2
}

/** Keep the compat findings attached to an item for rendering. */
export function attachFindings(
  profile: SlimProfile,
  scan: ScanResult,
): SlimProfile {
  const byId = new Map(scan.bundles.map((bundle) => [`bundle:${bundle.name}`, bundle.findings]))
  for (const entry of scan.entries) byId.set(`entry:${entry.entryId}`, entry.findings)
  return {
    ...profile,
    items: profile.items.map((item) => ({
      ...item,
      findings: sortFindings(byId.get(item.id) ?? []),
    })),
  }
}
