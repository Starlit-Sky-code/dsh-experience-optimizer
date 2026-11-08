import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { satisfies } from 'semver'

function safeSatisfies(version: string, range: string): boolean {
  try {
    return satisfies(version, range, { includePrerelease: true })
  } catch {
    return false
  }
}
import type { PluginManifest } from './model.ts'
import { manifestEngines, manifestPeers, manifestPlatforms } from './manifests.ts'

export interface CompatibilityIssue {
  name: string
  version: string
  runtimeVersion: string
  requirements: Record<string, string>
  exempted: boolean
}

interface AppBootLike {
  getDshRuntimeVersion?: () => string
  evaluatePluginCompatibility?: (
    manifest: object,
    exemptions?: Readonly<Record<string, readonly string[]>>,
    runtimeVersion?: string,
  ) => CompatibilityIssue | undefined
}

let appBootPromise: Promise<AppBootLike | undefined> | undefined

/** Load app-boot lazily; compatibility analysis degrades if its peers are unavailable. */
async function loadAppBoot(): Promise<AppBootLike | undefined> {
  appBootPromise ??= import('@deepseek-ai/dsh-app-boot')
    .then((module) => module as unknown as AppBootLike)
    .catch(() => undefined)
  return appBootPromise
}

/** Runtime version, preferring the official helper. */
export async function getRuntimeVersion(): Promise<string> {
  const appBoot = await loadAppBoot()
  try {
    const version = appBoot?.getDshRuntimeVersion?.()
    if (typeof version === 'string' && version.length > 0) return version
  } catch {
    // Fall through to the manifest/env fallback.
  }
  try {
    const argvBase = process.argv[1] ?? process.cwd()
    const require = createRequire(argvBase)
    const path = require.resolve('@deepseek-ai/dsh/package.json', {
      paths: [dirname(argvBase), process.cwd()],
    })
    const pkg = require(path) as { version?: unknown }
    if (typeof pkg.version === 'string') return pkg.version
  } catch {
    // Ignore and use the environment.
  }
  return process.env.DSH_VERSION ?? '0.0.0'
}

/** Check one manifest against the DSH runtime, using app-boot when available. */
export async function evaluateCompatibility(
  manifest: PluginManifest,
  exemptions: Readonly<Record<string, readonly string[]>>,
  runtimeVersion: string,
  fallbackName?: string,
  fallbackVersion?: string,
): Promise<CompatibilityIssue | undefined> {
  const appBoot = await loadAppBoot()
  if (typeof appBoot?.evaluatePluginCompatibility === 'function') {
    try {
      const result = appBoot.evaluatePluginCompatibility(manifest, exemptions, runtimeVersion)
      if (result !== undefined) return result
    } catch {
      // A malformed manifest falls through to the local conservative check.
    }
  }
  return evaluateCompatibilityLocal(manifest, exemptions, runtimeVersion, fallbackName, fallbackVersion)
}

/** Local mirror of app-boot's requirement evaluation, used when app-boot is unavailable. */
export function evaluateCompatibilityLocal(
  manifest: PluginManifest,
  exemptions: Readonly<Record<string, readonly string[]>>,
  runtimeVersion: string,
  fallbackName?: string,
  fallbackVersion?: string,
): CompatibilityIssue | undefined {
  const requirements: Record<string, string> = {}
  const engines = manifestEngines(manifest)
  if (typeof engines.dsh === 'string') {
    if (!safeSatisfies(runtimeVersion, engines.dsh)) {
      requirements['engines.dsh'] = engines.dsh
    }
  } else {
    for (const [name, range] of Object.entries(manifestPeers(manifest))) {
      if (name !== '@deepseek-ai/dsh' && !name.startsWith('@deepseek-ai/dsh-')) continue
      const effective = ['workspace:^', 'workspace:~', 'workspace:*'].includes(range)
        ? runtimeVersion
        : range
      if (!safeSatisfies(runtimeVersion, effective)) {
        requirements[name] = range
      }
    }
  }
  if (Object.keys(requirements).length === 0) return undefined
  const name = typeof manifest.name === 'string' ? manifest.name : fallbackName ?? 'unknown'
  const version = typeof manifest.version === 'string' ? manifest.version : fallbackVersion ?? '0.0.0'
  const key = `${name}@${version}`
  return {
    name,
    version,
    runtimeVersion,
    requirements,
    exempted: exemptions[key]?.includes(runtimeVersion) === true,
  }
}

/** Check `engines.node` against the running Node. */
export function checkNodeEngine(manifest: PluginManifest, nodeVersion: string): string | undefined {
  const range = manifestEngines(manifest).node
  if (typeof range !== 'string') return undefined
  return safeSatisfies(nodeVersion, range) ? undefined : range
}

/** Unsupported platform list, or undefined when the bundle supports the current platform. */
export function checkPlatform(
  manifest: PluginManifest,
  platform: string,
): string[] | undefined {
  const platforms = manifestPlatforms(manifest)
  if (platforms.length === 0) return undefined
  return platforms.includes(platform) ? undefined : platforms
}
