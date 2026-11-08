import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  AuditLog,
  deepEqualJson,
  estimateTokens,
  normalizeLine,
  readJson,
  writeJsonAtomic,
} from 'dsh-shared-meta'

const cleanups: Array<() => Promise<void>> = []

afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup()
})

describe('text helpers', () => {
  it('estimates CJK and ASCII tokens differently', () => {
    expect(estimateTokens('')).toBe(0)
    expect(estimateTokens('你好世界')).toBe(4)
    expect(estimateTokens('abcdefg')).toBe(2)
  })

  it('normalizes markdown and punctuation', () => {
    expect(normalizeLine('**Hello**,   world!')).toBe('hello world')
  })

  it('compares JSON structurally with sorted keys', () => {
    expect(deepEqualJson({ a: 1, b: { c: 2 } }, { b: { c: 2 }, a: 1 })).toBe(true)
    expect(deepEqualJson({ a: 1 }, { a: 2 })).toBe(false)
  })
})

describe('local store', () => {
  it('writes and reads JSON atomically', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dsh-shared-'))
    cleanups.push(() => rm(dir, { recursive: true, force: true }))
    const path = join(dir, 'nested', 'value.json')
    await writeJsonAtomic(path, { ok: true, value: 3 })
    expect(await readJson(path)).toEqual({ ok: true, value: 3 })
    const text = await readFile(path, 'utf8')
    expect(text.endsWith('\n')).toBe(true)
  })

  it('appends and reads audit records', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'dsh-audit-'))
    cleanups.push(() => rm(dir, { recursive: true, force: true }))
    const log = new AuditLog(join(dir, 'audit.jsonl'))
    await log.append({
      t: new Date().toISOString(),
      actor: 'trim',
      action: 'test',
      subject: 'x',
      result: 'ok',
      summary: 'hello',
    })
    const records = await log.read(10)
    expect(records).toHaveLength(1)
    expect(records[0]?.summary).toBe('hello')
  })
})
