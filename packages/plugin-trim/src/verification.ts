import { dataDir, readJson, writeJsonAtomic } from 'dsh-shared-meta'
import type { ScanResult } from './scan.ts'

export interface VerificationSnapshot {
  attributed: number
  total: number
  enabledBundles: string[]
  enabledEntries: string[]
}

export interface AppliedItemRef {
  id: string
  kind: 'bundle' | 'entry'
  name: string
}

export interface PendingVerification {
  token: string
  at: string
  pid: number
  bootAt: number
  needsRestart: boolean
  applied: AppliedItemRef[]
  before: VerificationSnapshot
}

export interface ApplyVerification {
  token: string
  at: string
  applied: AppliedItemRef[]
  before: VerificationSnapshot
  after: VerificationSnapshot
  deltaTokens: number
  deltaPercent: number | null
  confounded: boolean
  unexpectedChanges: string[]
}

export interface VerificationState {
  schemaVersion: 1
  profile: string
  pending?: PendingVerification
  last?: ApplyVerification
}

export interface VerificationView {
  pending?: Pick<PendingVerification, 'token' | 'needsRestart' | 'before' | 'at'>
  last?: ApplyVerification
}

/** Snapshot only the numbers needed to verify one apply. */
export function snapshotOf(scan: ScanResult): VerificationSnapshot {
  return {
    attributed: Math.max(0, scan.context.totalTokens - scan.context.unattributedTokens),
    total: scan.context.totalTokens,
    enabledBundles: scan.bundles
      .filter((bundle) => bundle.enabled)
      .map((bundle) => bundle.name)
      .sort(),
    enabledEntries: scan.entries
      .filter((entry) => entry.enabled)
      .map((entry) => entry.entryId)
      .sort(),
  }
}

/** Persist the baseline for one apply, before the next checkup settles it. */
export async function beginVerification(input: {
  profile: string
  token: string
  applied: AppliedItemRef[]
  before: VerificationSnapshot
  needsRestart: boolean
  now?: number
}): Promise<void> {
  const now = input.now ?? Date.now()
  await withLock(async () => {
    const state = await readState(input.profile)
    state.pending = {
      token: input.token,
      at: new Date(now).toISOString(),
      pid: process.pid,
      bootAt: bootAt(now),
      needsRestart: input.needsRestart,
      applied: input.applied,
      before: input.before,
    }
    await saveState(state)
  })
}

/** Settle a pending apply when the same profile is checked again. */
export async function settleVerification(input: {
  profile: string
  after: VerificationSnapshot
  pid?: number
  bootAt?: number
  now?: number
}): Promise<VerificationView> {
  const now = input.now ?? Date.now()
  return withLock(async () => {
    const state = await readState(input.profile)
    const pending = state.pending
    if (pending === undefined) return viewOf(state)
    const currentPid = input.pid ?? process.pid
    const currentBoot = input.bootAt ?? bootAt(now)
    if (pending.needsRestart && currentPid === pending.pid && Math.abs(currentBoot - pending.bootAt) < 5000) {
      return viewOf(state)
    }

    const after = input.after
    const appliedKeys = new Set(pending.applied.map((item) => item.id))
    // Only compare bundles: disabling one bundle also disables its child entries,
    // which would otherwise look like unrelated changes.
    const unexpectedChanges = symmetricDiff(pending.before.enabledBundles, after.enabledBundles)
      .filter((name) => !appliedKeys.has(`bundle:${name}`))
    const deltaTokens = after.attributed - pending.before.attributed
    state.last = {
      token: pending.token,
      at: new Date(now).toISOString(),
      applied: pending.applied,
      before: pending.before,
      after,
      deltaTokens,
      deltaPercent: pending.before.attributed > 0
        ? (deltaTokens / pending.before.attributed) * 100
        : null,
      confounded: unexpectedChanges.length > 0,
      unexpectedChanges,
    }
    state.pending = undefined
    await saveState(state)
    return viewOf(state)
  })
}

/** Read the last settled verification without mutating the pending baseline. */
export async function readVerification(profile: string): Promise<VerificationView> {
  return viewOf(await readState(profile))
}

/** Clear a receipt after rollback; the measured delta no longer describes the profile. */
export async function clearVerification(profile: string): Promise<void> {
  await withLock(async () => {
    const state = await readState(profile)
    state.pending = undefined
    state.last = undefined
    await saveState(state)
  })
}

function viewOf(state: VerificationState): VerificationView {
  return {
    ...(state.pending === undefined
      ? {}
      : {
          pending: {
            token: state.pending.token,
            needsRestart: state.pending.needsRestart,
            before: state.pending.before,
            at: state.pending.at,
          },
        }),
    ...(state.last === undefined ? {} : { last: state.last }),
  }
}

function symmetricDiff(left: readonly string[], right: readonly string[]): string[] {
  const leftSet = new Set(left)
  const rightSet = new Set(right)
  return [
    ...[...leftSet].filter((value) => !rightSet.has(value)),
    ...[...rightSet].filter((value) => !leftSet.has(value)),
  ].sort()
}

function bootAt(now: number): number {
  return now - process.uptime() * 1000
}

function pathFor(profile: string): string {
  return dataDir('trim', 'verification', `${safeId(profile)}.json`)
}

async function readState(profile: string): Promise<VerificationState> {
  try {
    const state = await readJson<VerificationState>(pathFor(profile))
    if (state !== undefined && state.schemaVersion === 1) return { ...state, profile }
  } catch {
    // A corrupt receipt must not block the checkup; start a fresh one.
  }
  return { schemaVersion: 1, profile }
}

async function saveState(state: VerificationState): Promise<void> {
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
