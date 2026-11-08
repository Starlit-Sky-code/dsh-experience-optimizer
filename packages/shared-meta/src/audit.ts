import { stat, unlink } from 'node:fs/promises'
import type { AuditRecord } from './types.ts'
import { dataDir, appendJsonl, readJsonl } from './store.ts'

const DEFAULT_MAX_BYTES = 2 * 1024 * 1024

/** Append-only audit log with one-size rotation. */
export class AuditLog {
  readonly path: string
  readonly rotatedPath: string
  private readonly maxBytes: number
  private writes = 0

  constructor(path = dataDir('audit.jsonl'), maxBytes = DEFAULT_MAX_BYTES) {
    this.path = path
    this.rotatedPath = path.replace(/\.jsonl$/, '.1.jsonl')
    this.maxBytes = maxBytes
  }

  /** Append one record; failures are the caller's to report. */
  async append(record: AuditRecord): Promise<void> {
    await appendJsonl(this.path, [record])
    this.writes++
    if (this.writes % 25 === 0) await this.rotateIfNeeded()
  }

  /** Read the most recent records, oldest first. */
  async read(limit = 50): Promise<AuditRecord[]> {
    return readJsonl<AuditRecord>(this.path, limit)
  }

  private async rotateIfNeeded(): Promise<void> {
    try {
      const info = await stat(this.path)
      if (info.size <= this.maxBytes) return
      await unlink(this.rotatedPath).catch(() => undefined)
      const { rename } = await import('node:fs/promises')
      await rename(this.path, this.rotatedPath)
    } catch {
      // Rotation is best-effort; audit writes must not fail the tool.
    }
  }
}
