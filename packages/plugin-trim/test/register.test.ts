import { describe, expect, it } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import { apply } from '../src/index.ts'
import type { Config } from '../src/config.ts'

const config: Config = {
  mode: 'advise',
  protect: [],
  pinned: [],
  trackUsage: false,
  usageRetentionDays: 30,
  maxDrafts: 20,
  enableDedupe: true,
  persistExcerpts: false,
  tokenRatio: 3.5,
  toolOwners: {},
  compatEnabled: true,
  compatScanAllProfiles: false,
  compatMaxProfiles: 20,
  compatIncludeInfo: false,
  compatMaxFindings: 100,
  compatReadLockfile: true,
  compatReadWorkspace: true,
  compatStrictOfficialOverrides: false,
  compatCacheTtlMs: 0,
}

describe('plugin registration', () => {
  it('registers the trim tool surface without a live profile', () => {
    const names: string[] = []
    const ctx = {
      tools: {
        register(definition: { name: string }) {
          names.push(definition.name)
          return () => undefined
        },
      },
      on() {
        return () => undefined
      },
      effect() {
        return () => undefined
      },
      get() {
        return undefined
      },
    } as unknown as Context

    apply(ctx, config)
    expect(names).toEqual(
      expect.arrayContaining([
        'trim_scan_plugins',
        'trim_analyze_compatibility',
        'trim_suggest_profile',
        'trim_apply_profile',
        'trim_rollback_profile',
      ]),
    )
  })

  it('defaults config when the loader passes undefined', () => {
    const names: string[] = []
    const ctx = {
      tools: {
        register(definition: { name: string }) {
          names.push(definition.name)
          return () => undefined
        },
      },
      on() {
        return () => undefined
      },
      effect() {
        return () => undefined
      },
      get() {
        return undefined
      },
    } as unknown as Context
    apply(ctx, undefined)
    expect(names).toContain('trim_scan_plugins')
  })
})
