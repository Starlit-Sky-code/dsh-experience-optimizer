import { describe, expect, it } from 'vitest'
import { Readable } from 'node:stream'
import type { Context } from '@deepseek-ai/cordis'
import { DEFAULT_CONFIG, normalizeConfig } from '../src/config.ts'
import { handleTrimRequest, publicConfig, sanitizeConfigPatch, updateTrimConfig } from '../src/api.ts'

describe('public config', () => {
  it('exposes the effective policy without leaking internal maps', () => {
    const ctx = {
      get(name: string) {
        return name === 'profileContext' ? { name: 'web', dir: '/tmp/web' } : undefined
      },
    } as unknown as Context
    const config = normalizeConfig({
      ...DEFAULT_CONFIG,
      approvalMode: 'risk-based',
      suggestionPolicy: 'conservative',
      approvalThreshold: 7,
      protect: ['my-monthly-plugin'],
      pinned: ['my-pinned-plugin'],
    })
    const data = publicConfig(ctx, config) as Record<string, unknown>
    expect(data.profile).toBe('web')
    expect(data.profileDir).toBe('/tmp/web')
    expect(data.approvalMode).toBe('risk-based')
    expect(data.suggestionPolicy).toBe('conservative')
    expect(data.approvalThreshold).toBe(7)
    expect(data.contextBudget).toBe(0)
    expect(data.protect).toEqual(['my-monthly-plugin'])
    expect(data.pinned).toEqual(['my-pinned-plugin'])
    expect(data).not.toHaveProperty('toolOwners')
  })
})

describe('config patch', () => {
  it('accepts only known policy fields and validates ranges', () => {
    expect(sanitizeConfigPatch({ mode: 'auto-safe', approvalThreshold: 8, contextBudget: 20000, protect: [' a ', ''] })).toEqual({
      mode: 'auto-safe',
      approvalThreshold: 8,
      contextBudget: 20000,
      protect: ['a'],
    })
    expect(() => sanitizeConfigPatch({ mode: 'nope' })).toThrow('invalid mode')
    expect(() => sanitizeConfigPatch({ usageRetentionDays: 0 })).toThrow('invalid usageRetentionDays')
    expect(() => sanitizeConfigPatch({ contextBudget: -1 })).toThrow('invalid contextBudget')
    expect(() => sanitizeConfigPatch({ contextBudget: 1_000_001 })).toThrow('invalid contextBudget')
    expect(() => sanitizeConfigPatch({})).toThrow('config patch is empty')
  })

  it('writes the patch through the loader entry', async () => {
    let updated: { id?: string; config?: Record<string, unknown> } | undefined
    const loader = {
      *entries() {
        yield { options: { id: 'dsh-plugin-trim', config: { mode: 'advise', approvalThreshold: 5 } } }
      },
      async update(id: string, options: { config: Record<string, unknown> }) {
        updated = { id, ...options }
      },
    }
    const ctx = {
      get(name: string) {
        return name === 'loader' ? loader : name === 'profileContext' ? { name: 'web', dir: '/tmp/web' } : undefined
      },
    } as unknown as Context
    const next = await updateTrimConfig(ctx, { mode: 'auto-safe', trackUsage: false })
    expect(updated?.id).toBe('dsh-plugin-trim')
    expect(updated?.config).toEqual({ mode: 'auto-safe', approvalThreshold: 5, trackUsage: false })
    expect(next.mode).toBe('auto-safe')
    expect(next.trackUsage).toBe(false)
  })

  it('rejects API requests without the private client header', async () => {
    const ctx = {
      get(name: string) {
        if (name === 'connection') return { requestRejection: () => undefined }
        if (name === 'profileContext') return { name: 'web', dir: '/tmp/web' }
        return undefined
      },
    } as unknown as Context
    const req = Readable.from(['{}']) as unknown as Parameters<typeof handleTrimRequest>[0]
    Object.assign(req, {
      method: 'POST',
      url: 'http://localhost/api/dsh-experience-optimizer/config',
      headers: { host: 'localhost', origin: 'http://localhost' },
    })
    let status = 0
    let text = ''
    const res = {
      writeHead(code: number) { status = code },
      end(chunk: string) { text = chunk },
    } as unknown as Parameters<typeof handleTrimRequest>[1]
    await handleTrimRequest(req, res, ctx, normalizeConfig({}), {} as never)
    expect(status).toBe(403)
    expect(JSON.parse(text).error.message).toContain('client header')
  })

  it('handles authenticated POST /config through the route', async () => {
    let updated: Record<string, unknown> | undefined
    const loader = {
      *entries() {
        yield { options: { id: 'dsh-plugin-trim', config: { mode: 'advise', approvalThreshold: 5 } } }
      },
      async update(_id: string, options: { config: Record<string, unknown> }) {
        updated = options.config
      },
    }
    const ctx = {
      get(name: string) {
        if (name === 'connection') return { requestRejection: () => undefined }
        if (name === 'loader') return loader
        if (name === 'profileContext') return { name: 'web', dir: '/tmp/web' }
        return undefined
      },
    } as unknown as Context
    const req = Readable.from([JSON.stringify({ mode: 'auto-safe', trackUsage: false })]) as unknown as Parameters<typeof handleTrimRequest>[0]
    Object.assign(req, {
      method: 'POST',
      url: 'http://localhost/api/dsh-experience-optimizer/config',
      headers: { host: 'localhost', origin: 'http://localhost', 'x-dsh-trim-client': '1' },
    })
    let status = 0
    let text = ''
    const res = {
      writeHead(code: number) { status = code },
      end(chunk: string) { text = chunk },
    } as unknown as Parameters<typeof handleTrimRequest>[1]
    await handleTrimRequest(req, res, ctx, normalizeConfig({}), {} as never)
    expect(status).toBe(200)
    expect(updated).toEqual({ mode: 'auto-safe', approvalThreshold: 5, trackUsage: false })
    const body = JSON.parse(text) as { ok: boolean; data: { mode: string } }
    expect(body.ok).toBe(true)
    expect(body.data.mode).toBe('auto-safe')
  })
})
