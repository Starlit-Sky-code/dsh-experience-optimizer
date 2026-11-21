import { describe, expect, it } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import { DEFAULT_CONFIG, normalizeConfig } from '../src/config.ts'
import { publicConfig } from '../src/api.ts'

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
    expect(data.protect).toEqual(['my-monthly-plugin'])
    expect(data.pinned).toEqual(['my-pinned-plugin'])
    expect(data).not.toHaveProperty('toolOwners')
  })
})
