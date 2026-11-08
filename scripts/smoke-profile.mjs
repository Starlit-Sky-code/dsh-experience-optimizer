#!/usr/bin/env node
/**
 * Optional smoke test: install both local bundles into a temporary DSH profile,
 * dump the composed config, assert the rows exist, then remove only that profile.
 *
 * Requires a `dsh` executable (set DSH_BIN if it is not on PATH).
 */
import { access, rm } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync, spawnSync } from 'node:child_process'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dshHome = resolve(process.env.DSH_HOME?.trim() || join(homedir(), '.dsh'))
const dsh = process.env.DSH_BIN?.trim() || 'dsh'
const profile = `dsh-exp-smoke-${process.pid}`

const probe = spawnSync(dsh, ['--version'], { encoding: 'utf8' })
if (probe.status !== 0) {
  console.log(`Skip profile smoke: cannot run "${dsh}" (${probe.error?.message ?? probe.stderr?.trim()})`)
  console.log('Set DSH_BIN to the dsh executable to run this check.')
  process.exit(0)
}

const profileDir = join(dshHome, 'profiles', profile)
const packages = [
  join(root, 'packages', 'plugin-trim'),
  join(root, 'packages', 'plugin-recipe'),
]

try {
  for (const packageDir of packages) {
    await access(join(packageDir, 'dist', 'index.js'))
    console.log(`Installing ${packageDir} into ${profile}...`)
    execFileSync(dsh, ['plugin', '--profile', profile, 'add', packageDir], {
      stdio: 'inherit',
      timeout: 180_000,
    })
  }
  const dump = execFileSync(dsh, ['--profile', profile, '--dump-config'], {
    encoding: 'utf8',
    timeout: 120_000,
  })
  for (const name of ['dsh-plugin-trim', 'dsh-plugin-recipe']) {
    if (!dump.includes(name)) throw new Error(`dump-config does not contain ${name}`)
  }
  console.log('Profile smoke passed: both bundle rows are present.')
} catch (error) {
  console.error(`Profile smoke failed: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
} finally {
  const expectedPrefix = join(dshHome, 'profiles') + '/'
  if (resolve(profileDir).startsWith(expectedPrefix) && profile.startsWith('dsh-exp-smoke-')) {
    await rm(profileDir, { recursive: true, force: true }).catch(() => undefined)
  } else {
    console.error(`Refusing to clean unexpected profile path: ${profileDir}`)
  }
}
