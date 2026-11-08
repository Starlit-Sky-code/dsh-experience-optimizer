import { stat } from 'node:fs/promises'
import {
  appendJsonl,
  dataDir,
  readJsonl,
  writeTextAtomic,
} from 'dsh-shared-meta'
import type { UsageLine, UsageStats } from 'dsh-shared-meta'

export interface UsageLedgerOptions {
  path?: string
  retentionDays?: number
  maxBytes?: number
  enabled?: boolean
}

/** Append-only local usage ledger. Records tool names, success, and time only. */
export class UsageLedger {
  readonly path: string
  private readonly retentionDays: number
  private readonly maxBytes: number
  private readonly enabled: boolean
  private buffer: UsageLine[] = []
  private timer: NodeJS.Timeout | undefined
  private flushPromise: Promise<void> | undefined

  constructor(options: UsageLedgerOptions = {}) {
    this.path = options.path ?? dataDir('trim', 'usage.jsonl')
    this.retentionDays = options.retentionDays ?? 30
    this.maxBytes = options.maxBytes ?? 1024 * 1024
    this.enabled = options.enabled ?? true
  }

  record(toolName: string, ok: boolean): void {
    if (!this.enabled || toolName.length === 0) return
    this.buffer.push({ t: new Date().toISOString(), n: toolName, ok })
    if (this.timer === undefined) {
      this.timer = setTimeout(() => {
        this.timer = undefined
        void this.flush()
      }, 2000)
      this.timer.unref?.()
    }
  }

  async flush(): Promise<void> {
    if (this.flushPromise !== undefined) return this.flushPromise
    if (this.buffer.length === 0) return
    const lines = this.buffer
    this.buffer = []
    this.flushPromise = (async () => {
      try {
        await appendJsonl(this.path, lines)
        await this.compactIfNeeded()
      } finally {
        this.flushPromise = undefined
      }
    })()
    return this.flushPromise
  }

  async dispose(): Promise<void> {
    if (this.timer !== undefined) {
      clearTimeout(this.timer)
      this.timer = undefined
    }
    await this.flush()
  }

  /** Aggregate retained lines by tool name. */
  async aggregate(): Promise<Map<string, UsageStats>> {
    await this.flush()
    const lines = await readJsonl<UsageLine>(this.path)
    const cutoff = Date.now() - this.retentionDays * 24 * 60 * 60 * 1000
    const map = new Map<string, UsageStats>()
    for (const line of lines) {
      if (typeof line.t !== 'string' || typeof line.n !== 'string') continue
      const at = Date.parse(line.t)
      if (!Number.isFinite(at) || at < cutoff) continue
      const current = map.get(line.n) ?? { calls: 0, successes: 0, sessionCalls: 0 }
      current.calls += 1
      if (line.ok === true) current.successes += 1
      if (current.lastUsedAt === undefined || line.t > current.lastUsedAt) current.lastUsedAt = line.t
      map.set(line.n, current)
    }
    return map
  }

  /** Add current-session tool calls to an aggregate without pretending to know success. */
  addSessionUsage(
    aggregate: Map<string, UsageStats>,
    toolNames: readonly string[],
  ): Map<string, UsageStats> {
    const counts = new Map<string, number>()
    for (const name of toolNames) counts.set(name, (counts.get(name) ?? 0) + 1)
    for (const [name, count] of counts) {
      const current = aggregate.get(name) ?? { calls: 0, successes: 0, sessionCalls: 0 }
      current.sessionCalls += count
      aggregate.set(name, current)
    }
    return aggregate
  }

  private async compactIfNeeded(): Promise<void> {
    try {
      const info = await stat(this.path)
      if (info.size <= this.maxBytes) return
      const lines = await readJsonl<UsageLine>(this.path)
      const cutoff = Date.now() - this.retentionDays * 24 * 60 * 60 * 1000
      const kept = lines.filter((line) => {
        const at = typeof line.t === 'string' ? Date.parse(line.t) : Number.NaN
        return Number.isFinite(at) && at >= cutoff
      })
      const text = kept.slice(-50_000).map((line) => JSON.stringify(line)).join('\n')
      await writeTextAtomic(this.path, text.length === 0 ? '' : `${text}\n`)
    } catch {
      // Usage is best-effort; never fail a tool call because the ledger is unavailable.
    }
  }
}

export function mergeUsage(a: UsageStats, b: UsageStats): UsageStats {
  return {
    calls: a.calls + b.calls,
    successes: a.successes + b.successes,
    sessionCalls: a.sessionCalls + b.sessionCalls,
    lastUsedAt: latest(a.lastUsedAt, b.lastUsedAt),
  }
}

export function usageForOwner(
  usage: Map<string, UsageStats>,
  owner: string,
  toolNames: readonly string[],
): UsageStats {
  let total: UsageStats = { calls: 0, successes: 0, sessionCalls: 0 }
  for (const toolName of toolNames) {
    const stats = usage.get(toolName)
    if (stats !== undefined) total = mergeUsage(total, stats)
  }
  return total
}

function latest(a: string | undefined, b: string | undefined): string | undefined {
  if (a === undefined) return b
  if (b === undefined) return a
  return a > b ? a : b
}
