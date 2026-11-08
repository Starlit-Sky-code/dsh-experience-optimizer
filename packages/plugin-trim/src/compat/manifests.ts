import { createRequire } from 'node:module'
import { dirname, isAbsolute, join } from 'node:path'
import { readJson } from 'dsh-shared-meta'
import type { PluginManifest } from './model.ts'
import { errorText } from './loader-graph.ts'

/** Strip a package subpath to its installable package name. */
export function rootPackageName(spec: string): string {
  if (spec.startsWith('@')) {
    const parts = spec.split('/')
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : spec
  }
  return spec.split('/')[0] ?? spec
}

/** True for Node built-ins and Cordis pseudo-specifiers that have no package.json. */
export function isResolvablePackage(spec: string): boolean {
  return (
    spec.length > 0 &&
    !spec.startsWith('cordis:') &&
    !spec.startsWith('node:') &&
    !spec.startsWith('.') &&
    !spec.startsWith('/')
  )
}

export interface ResolvedManifest {
  path: string
  manifest: PluginManifest
}

/** Resolve package manifests from the profile, the DSH installation, and this module. */
export class ManifestResolver {
  private readonly cache = new Map<string, { at: number; value: ResolvedManifest | undefined }>()
  private readonly ttlMs: number
  private readonly profileDir: string

  constructor(profileDir: string, ttlMs = 60_000) {
    this.profileDir = profileDir
    this.ttlMs = ttlMs
  }

  async resolve(spec: string): Promise<ResolvedManifest | undefined> {
    if (!isResolvablePackage(spec)) return undefined
    const name = rootPackageName(spec)
    const cached = this.cache.get(name)
    if (cached !== undefined && Date.now() - cached.at < this.ttlMs) return cached.value
    const value = await this.resolveFresh(name)
    this.cache.set(name, { at: Date.now(), value })
    return value
  }

  private async resolveFresh(name: string): Promise<ResolvedManifest | undefined> {
    for (const candidate of this.candidatePaths(name)) {
      try {
        const path = candidate()
        if (path === undefined) continue
        const manifest = await readJson<PluginManifest>(path)
        if (manifest !== undefined && typeof manifest === 'object') {
          return { path, manifest }
        }
      } catch {
        // Try the next resolution base.
      }
    }
    return undefined
  }

  private candidatePaths(name: string): Array<() => string | undefined> {
    const spec = `${name}/package.json`
    const profileRequire = createRequire(join(this.profileDir, 'package.json'))
    const argvBase = process.argv[1]
    const installRequire =
      argvBase !== undefined && isAbsolute(argvBase) ? createRequire(argvBase) : undefined
    const here = createRequire(import.meta.url)
    const candidates: Array<() => string | undefined> = [
      () => profileRequire.resolve(spec),
      () => here.resolve(spec),
    ]
    if (installRequire !== undefined) {
      candidates.splice(1, 0, () =>
        installRequire.resolve(spec, { paths: [dirname(argvBase!), process.cwd()] }),
      )
    }
    return candidates
  }
}

/** Resolve manifests for a set of bundle package names. */
export async function resolveManifests(
  bundles: readonly string[],
  profileDir: string,
  ttlMs = 60_000,
): Promise<Map<string, PluginManifest | undefined>> {
  const resolver = new ManifestResolver(profileDir, ttlMs)
  const out = new Map<string, PluginManifest | undefined>()
  for (const name of bundles) {
    out.set(name, (await resolver.resolve(name))?.manifest)
  }
  return out
}

/** Read a version string from a manifest without trusting its type. */
export function manifestVersion(manifest: PluginManifest | undefined): string | undefined {
  return typeof manifest?.version === 'string' ? manifest.version : undefined
}

/** Supported platforms from `dsh.bundle.platforms`; empty means all platforms. */
export function manifestPlatforms(manifest: PluginManifest | undefined): string[] {
  const platforms = manifest?.dsh?.bundle?.platforms
  return Array.isArray(platforms) ? platforms.filter((item): item is string => typeof item === 'string') : []
}

/** Engine ranges, keeping only string values. */
export function manifestEngines(manifest: PluginManifest | undefined): Record<string, string> {
  const engines = manifest?.engines
  if (engines === undefined || engines === null || typeof engines !== 'object') return {}
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(engines)) {
    if (typeof value === 'string') out[key] = value
  }
  return out
}

/** Peer dependency ranges, keeping only string values. */
export function manifestPeers(manifest: PluginManifest | undefined): Record<string, string> {
  const peers = manifest?.peerDependencies
  if (peers === undefined || peers === null || typeof peers !== 'object') return {}
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(peers)) {
    if (typeof value === 'string') out[key] = value
  }
  return out
}

/** Read `dsh.bundle.patch` paths. */
export function manifestPatchPaths(manifest: PluginManifest | undefined): string[] {
  const patch = manifest?.dsh?.bundle?.patch
  if (typeof patch === 'string') return [patch]
  if (Array.isArray(patch)) return patch.filter((item): item is string => typeof item === 'string')
  return []
}

/** Resolve a bundle directory from its manifest path. */
export function manifestDir(resolved: ResolvedManifest | undefined): string | undefined {
  return resolved === undefined ? undefined : dirname(resolved.path)
}

export { errorText }
