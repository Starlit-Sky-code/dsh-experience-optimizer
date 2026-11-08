import { join } from 'node:path'
import { readJson } from 'dsh-shared-meta'
import type {
  BundleInfoLike,
  CompatConfigLike,
  CompatContext,
  CompatRuntimeInfo,
  LoaderLike,
  PluginInfoLike,
  PluginInventoryLike,
  PluginInventorySnapshotLike,
  PluginManagerLike,
  PluginManifest,
  PromptAdapterLike,
  PromptAssemblyLike,
} from './model.ts'
import { collectLoaderGraph, errorText } from './loader-graph.ts'
import { ManifestResolver, rootPackageName } from './manifests.ts'
import { readProfilePatchLayers } from './patches.ts'
import { readLockfile } from './lockfile.ts'
import { readProfileRaw, readWorkspace, scanProfiles } from './profiles.ts'
import { getRuntimeVersion } from './runtime-check.ts'

export interface CollectCompatOptions {
  profileName: string
  profileDir: string
  dshHome: string
  cwd: string
  bundleNames?: readonly string[]
  dependencies?: Record<string, string>
  loader?: LoaderLike
  pluginManager?: PluginManagerLike
  inventory?: PluginInventoryLike
  prompt?: PromptAdapterLike
  agent?: unknown
  toolSet?: unknown
  config: CompatConfigLike
  runtime?: Partial<CompatRuntimeInfo>
}

interface ProfileManifestFacts {
  bundles: string[]
  dependencies: Record<string, string>
}

/** Read the profile manifest facts without failing the whole scan. */
export async function readProfileManifestFacts(profileDir: string): Promise<ProfileManifestFacts> {
  const pkg = await readJson<{
    dsh?: { profile?: { bundles?: string[] } }
    dependencies?: Record<string, string>
  }>(join(profileDir, 'package.json')).catch(() => undefined)
  const bundles = Array.isArray(pkg?.dsh?.profile?.bundles)
    ? pkg.dsh.profile.bundles.filter((item): item is string => typeof item === 'string')
    : []
  const dependencies =
    pkg?.dependencies !== undefined && pkg.dependencies !== null
      ? Object.fromEntries(
          Object.entries(pkg.dependencies).filter(
            (entry): entry is [string, string] => typeof entry[1] === 'string',
          ),
        )
      : {}
  return { bundles, dependencies }
}

/** Collect loader, plugin-manager, prompt, profile, lockfile, and workspace facts. */
export async function collectCompatContext(
  options: CollectCompatOptions,
): Promise<CompatContext> {
  const diagnostics: string[] = []
  const facts =
    options.bundleNames === undefined
      ? await readProfileManifestFacts(options.profileDir)
      : {
          bundles: [...options.bundleNames],
          dependencies: options.dependencies ?? (await readProfileManifestFacts(options.profileDir)).dependencies,
        }

  const dshVersion = options.runtime?.dshVersion ?? (await getRuntimeVersion())
  const runtime: CompatRuntimeInfo = {
    dshVersion,
    nodeVersion: options.runtime?.nodeVersion ?? process.versions.node,
    platform: options.runtime?.platform ?? process.platform,
    arch: options.runtime?.arch ?? process.arch,
  }

  let inventorySnapshot: PluginInventorySnapshotLike | undefined
  if (options.inventory !== undefined) {
    try {
      inventorySnapshot = await options.inventory.list()
    } catch (error) {
      diagnostics.push(`plugin inventory unavailable: ${errorText(error)}`)
    }
  }

  const graph = collectLoaderGraph(options.loader, inventorySnapshot)
  diagnostics.push(...graph.diagnostics)

  let bundles: BundleInfoLike[] = []
  let entriesInfo: PluginInfoLike[] = []
  let exemptions: Record<string, string[]> = {}
  if (options.pluginManager !== undefined) {
    try {
      bundles = await options.pluginManager.listBundles()
    } catch (error) {
      diagnostics.push(`listBundles failed: ${errorText(error)}`)
    }
    try {
      entriesInfo = await options.pluginManager.listPlugins()
    } catch (error) {
      diagnostics.push(`listPlugins failed: ${errorText(error)}`)
    }
    try {
      exemptions = options.pluginManager.listVersionExemptions().exemptions
    } catch (error) {
      diagnostics.push(`listVersionExemptions failed: ${errorText(error)}`)
    }
  } else {
    diagnostics.push('pluginManager unavailable; compatibility analysis is read-only static mode')
  }

  const profileRaw = await readProfileRaw(options.profileDir, options.profileName).catch((error) => {
    diagnostics.push(`current profile unreadable: ${errorText(error)}`)
    return undefined
  })

  const allBundleNames = [...new Set([
    ...facts.bundles,
    ...(profileRaw?.bundles ?? []),
    ...bundles.map((bundle) => bundle.name),
    ...graph.entries
      .filter((entry) => entry.source === 'loader')
      .map((entry) => rootPackageName(entry.moduleName)),
  ])].slice(0, 200)

  const manifestResolver = new ManifestResolver(options.profileDir, 60_000)
  const manifests = new Map<string, PluginManifest | undefined>()
  for (const name of allBundleNames) {
    const resolved = await manifestResolver.resolve(name)
    manifests.set(rootPackageName(name), resolved?.manifest)
  }

  // Re-read the current profile's patch rows with bundle patches included.
  let patchRows = profileRaw?.patchRows ?? []
  if (facts.bundles.length > 0) {
    try {
      const patchResult = await readProfilePatchLayers({
        profileDir: options.profileDir,
        dshHome: options.dshHome,
        bundles: facts.bundles,
        manifests,
      })
      patchRows = patchResult.rows
      diagnostics.push(...patchResult.diagnostics)
    } catch (error) {
      diagnostics.push(`patch layer read failed: ${errorText(error)}`)
    }
  }

  let lockfile
  if (options.config.compatReadLockfile) {
    lockfile = await readLockfile(join(options.profileDir, 'pnpm-lock.yaml'))
    if (lockfile?.parseError !== undefined) {
      diagnostics.push(`lockfile parse failed: ${lockfile.parseError}`)
    }
  }

  let profiles = profileRaw === undefined ? [] : [profileRaw]
  if (options.config.compatScanAllProfiles) {
    const scanned = await scanProfiles(
      join(options.dshHome, 'profiles'),
      options.config.compatMaxProfiles,
    )
    diagnostics.push(...scanned.diagnostics)
    // Keep the current profile's richer patch rows; other profiles are best-effort.
    profiles = scanned.profiles.map((profile) =>
      profile.name === options.profileName && profileRaw !== undefined
        ? { ...profile, patchRows, exemptions: { ...profile.exemptions, ...exemptions } }
        : profile,
    )
    if (profiles.length === 0 && profileRaw !== undefined) profiles = [profileRaw]
  }

  const workspace = options.config.compatReadWorkspace
    ? await readWorkspace(options.cwd, options.dshHome)
    : { cwd: options.cwd, instructionFiles: [], instructions: [] }

  let prompt: PromptAssemblyLike | undefined
  if (options.prompt !== undefined) {
    try {
      prompt = await options.prompt.assemble(options.agent, options.toolSet)
    } catch (error) {
      diagnostics.push(`prompt assembly unavailable: ${errorText(error)}`)
    }
  }

  return {
    runtime,
    config: options.config,
    profile: {
      name: options.profileName,
      dir: options.profileDir,
      bundles: facts.bundles.length > 0 ? facts.bundles : (profileRaw?.bundles ?? []),
      dependencies: facts.dependencies,
      patchRows,
      exemptions: { ...(profileRaw?.exemptions ?? {}), ...exemptions },
      compatibilityWarnings: profileRaw?.compatibilityWarnings ?? [],
      compatibilityRewritable: profileRaw?.compatibilityRewritable ?? true,
    },
    loaderEntries: graph.entries,
    bundles,
    entriesInfo,
    inventory: inventorySnapshot,
    manifests,
    lockfile,
    profiles,
    workspace,
    prompt,
    diagnostics,
  }
}
