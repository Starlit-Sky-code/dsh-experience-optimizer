import { describe, expect, it } from 'vitest'
import { applyUpdate, compareVersions } from '../src/api.ts'

describe('update check', () => {
  it('compares semantic versions without semver dependencies', () => {
    expect(compareVersions('0.3.6', '0.3.5')).toBe(1)
    expect(compareVersions('0.3.5', '0.3.6')).toBe(-1)
    expect(compareVersions('v0.3.6', '0.3.6')).toBe(0)
    expect(compareVersions('0.4.0', '0.3.99')).toBe(1)
  })
})

describe('background update', () => {
  it('calls pluginManager.updateBundle only with confirm and a valid version', async () => {
    const calls: string[][] = []
    const ctx = {
      get(name: string) {
        if (name !== 'pluginManager') return undefined
        return {
          async updateBundle(name: string, version: string) {
            calls.push([name, version])
            return { from: '0.5.9', to: version, result: { changed: true, application: 'restart-required' } }
          },
        }
      },
    } as never
    const result = await applyUpdate(ctx, { confirm: true, version: '0.5.10' }) as Record<string, unknown>
    expect(calls).toEqual([['dsh-plugin-trim', '0.5.10']])
    expect(result.restartRequired).toBe(true)
    await expect(applyUpdate(ctx, { version: '0.5.10' })).rejects.toThrow('confirm must be true')
    await expect(applyUpdate(ctx, { confirm: true, version: 'latest' })).rejects.toThrow('invalid version')
  })
})
