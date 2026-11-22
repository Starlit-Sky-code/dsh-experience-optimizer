import { dataDir, readJson, writeJsonAtomic } from 'dsh-shared-meta'
import type { ScanResult } from './scan.ts'

export interface CheckupRecord {
  at: string
  attributed: number
  total: number
  owners: Array<{ owner: string; tokens: number }>
  enabledBundles: string[]
  compat: { error: number; warn: number; info: number }
  counts: { bundles: number; entries: number; tools: number; sections: number }
}

export interface HistoryDiff {
  from?: string
  to: string
  addedBundles: string[]
  removedBundles: string[]
  attributedDelta: number
  totalDelta: number
  ownerDeltas: Array<{ owner: string; delta: number }>
}

export interface CheckupHistory {
  schemaVersion: 1
  profile: string
  records: CheckupRecord[]
}

export interface HistoryResult {
  records: CheckupRecord[]
  diff?: HistoryDiff
  skipped: boolean
}

const MAX_RECORDS = 60
const THROTTLE_MS = 10 * 60 * 1000

/** Record one checkup snapshot, throttled to avoid writing on every open. */
export async function recordCheckup(input: {
  profile: string
  scan: ScanResult
  force?: boolean
  now?: number
}): Promise<HistoryResult> {
  const now = input.now ?? Date.now()
  return withLock(async () => {
    const state = await readState(input.profile)
    const last = state.records[state.records.length - 1]
    if (
      input.force !== true &&
      last !== undefined &&
      now - Date.parse(last.at) < THROTTLE_MS
    ) {
      return { records: state.records, diff: diffRecords(state.records.at(-2), last), skipped: true }
    }

    const record = snapshotRecord(input.scan, now)
    const previous = last
    state.records.push(record)
    if (state.records.length > MAX_RECORDS) state.records = state.records.slice(-MAX_RECORDS)
    await saveState(state)
    return { records: state.records, diff: diffRecords(previous, record), skipped: false }
  })
}

/** Read the stored history without recording a new snapshot. */
export async function readHistory(profile: string): Promise<CheckupHistory> {
  return readState(profile)
}

function snapshotRecord(scan: ScanResult, now: number): CheckupRecord {
  const owners = Object.entries(scan.context.byOwner)
    .filter(([owner]) => owner !== 'unattributed')
    .map(([owner, tokens]) => ({ owner, tokens }))
    .sort((a, b) => b.tokens - a.tokens)
    .slice(0, 8)
  return {
    at: new Date(now).toISOString(),
    attributed: Math.max(0, scan.context.totalTokens - scan.context.unattributedTokens),
    total: scan.context.totalTokens,
    owners,
    enabledBundles: scan.bundles.filter((bundle) => bundle.enabled).map((bundle) => bundle.name).sort(),
    compat: {
      error: scan.compat.summary.error,
      warn: scan.compat.summary.warn,
      info: scan.compat.summary.info,
    },
    counts: {
      bundles: scan.bundles.length,
      entries: scan.entries.length,
      tools: scan.context.tools.length,
      sections: scan.context.sections.length,
    },
  }
}

function diffRecords(previous: CheckupRecord | undefined, current: CheckupRecord): HistoryDiff | undefined {
  if (previous === undefined) return undefined
  const previousBundles = new Set(previous.enabledBundles)
  const currentBundles = new Set(current.enabledBundles)
  const ownerDelta = new Map<string, number>()
  const owners = new Set([
    ...previous.owners.map((owner) => owner.owner),
    ...current.owners.map((owner) => owner.owner),
  ])
  for (const owner of owners) {
    const before = previous.owners.find((item) => item.owner === owner)?.tokens ?? 0
    const after = current.owners.find((item) => item.owner === owner)?.tokens ?? 0
    if (after !== before) ownerDelta.set(owner, after - before)
  }
  return {
    from: previous.at,
    to: current.at,
    addedBundles: [...currentBundles].filter((name) => !previousBundles.has(name)).sort(),
    removedBundles: [...previousBundles].filter((name) => !currentBundles.has(name)).sort(),
    attributedDelta: current.attributed - previous.attributed,
    totalDelta: current.total - previous.total,
    ownerDeltas: [...ownerDelta.entries()]
      .map(([owner, delta]) => ({ owner, delta }))
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 5),
  }
}

function pathFor(profile: string): string {
  return dataDir('trim', 'history', `${safeId(profile)}.json`)
}

async function readState(profile: string): Promise<CheckupHistory> {
  try {
    const state = await readJson<CheckupHistory>(pathFor(profile))
    if (state !== undefined && state.schemaVersion === 1 && Array.isArray(state.records)) {
      return { ...state, profile }
    }
  } catch {
    // A corrupt history must not block the checkup.
  }
  return { schemaVersion: 1, profile, records: [] }
}

async function saveState(state: CheckupHistory): Promise<void> {
  await writeJsonAtomic(pathFor(state.profile), state)
}

function safeId(value: string): string {
  const safe = value.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120)
  return safe.length > 0 ? safe : 'default'
}

let queue: Promise<unknown> = Promise.resolve()

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn)
  queue = run.catch(() => undefined)
  return run
}
