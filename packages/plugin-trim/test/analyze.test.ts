import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import type { CompatConfigLike } from '../src/compat/model.ts'
import { analyzeCompatibility } from '../src/compat/analyze.ts'

const cleanups: Array<() => Promise<void>> = []
const originalHome = process.env.DSH_HOME

afterEach(async () => {
  process.env.DSH_HOME = originalHome
  for (const cleanup of cleanups.splice(0)) await cleanup()
})

const compatConfig: CompatConfigLike = {
  compatEnabled: true,
  compatScanAllProfiles: true,
  compatMaxProfiles: 5,
  compatIncludeInfo: true,
  compatMaxFindings: 100,
  compatReadLockfile: true,
  compatReadWorkspace: false,
  compatStrictOfficialOverrides: false,
  compatCacheTtlMs: 0,
  toolOwners: {},
}

describe('compatibility analysis pipeline', () => {
  it('collects a low-information profile and writes a report', async () => {
    const home = await mkdtemp(join(tmpdir(), 'dsh-compat-home-'))
    process.env.DSH_HOME = home
    cleanups.push(() => rm(home, { recursive: true, force: true }))
    const profileDir = join(home, 'profiles', 'test')
    await mkdir(profileDir, { recursive: true })
    await writeFile(
      join(profileDir, 'package.json'),
      JSON.stringify({ name: 'test-profile', dsh: { profile: { bundles: [] } } }),
    )
    const ctx = {
      get(name: string) {
        if (name === 'profileContext') {
          return { name: 'test', dir: profileDir, home, cwd: home }
        }
        return undefined
      },
    } as unknown as Context
    const result = await analyzeCompatibility(ctx, compatConfig, {
      scope: 'current',
      writeReport: true,
    })
    expect(result.report.profile.name).toBe('test')
    expect(result.reportPath).toBeDefined()
    const text = await readFile(result.reportPath!, 'utf8')
    expect(text).toContain('schemaVersion')
    expect(result.markdown).toContain('兼容性报告')
  })
})
