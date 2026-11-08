import { createHash, randomUUID } from 'node:crypto'

/** Create a sortable, readable id such as `trim-20261108-091500-ab12cd34`. */
export function newId(prefix: string, date = new Date()): string {
  const pad = (n: number, width = 2): string => String(n).padStart(width, '0')
  const stamp =
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  return `${prefix}-${stamp}-${randomUUID().slice(0, 8)}`
}

/** Opaque rollback/snapshot token. */
export function randomToken(): string {
  return randomUUID()
}

/** Stable 12-character content hash used for findings and fingerprints. */
export function shortHash(input: string): string {
  return createHash('sha256').update(input).digest('hex').slice(0, 12)
}

/** ISO timestamp helper, keeping call sites explicit about time. */
export function nowIso(date = new Date()): string {
  return date.toISOString()
}
