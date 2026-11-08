import type { BundleInfoLike, PluginInfoLike, PluginInventorySnapshotLike } from './compat/model.ts'

const PROTECTED_PACKAGES = new Set([
  'dsh-plugin-trim',
  'dsh-plugin-recipe',
  'dsh-shared-meta',
  '@deepseek-ai/dsh-plugin-manager',
  '@deepseek-ai/dsh-plugin-manager/tools',
  '@deepseek-ai/dsh-tools',
  '@deepseek-ai/dsh-system-prompt',
  '@deepseek-ai/dsh-agent',
  '@deepseek-ai/dsh-agent-loop',
  '@deepseek-ai/dsh-session',
  '@deepseek-ai/dsh-session-projection',
  '@deepseek-ai/dsh-llm',
  '@deepseek-ai/dsh-host-webserver',
  '@deepseek-ai/dsh-api-gateway',
  '@deepseek-ai/dsh-client-modules',
  '@deepseek-ai/dsh-hmr',
  '@deepseek-ai/dsh-base',
  '@deepseek-ai/dsh-web-app',
  '@deepseek-ai/dsh-headless',
  '@deepseek-ai/dsh-sdk-app',
  '@deepseek-ai/dsh-sdk-minimal',
  '@deepseek-ai/dsh-persona',
  '@deepseek-ai/dsh-agent-preset',
  '@deepseek-ai/dsh-agent-preset-registry',
  '@deepseek-ai/cordis-plugin-loader',
  '@deepseek-ai/cordis-plugin-include',
])

const PROTECTED_PREFIXES = [
  '@deepseek-ai/dsh-agent-',
  '@deepseek-ai/dsh-session-',
  '@deepseek-ai/dsh-llm-',
  '@deepseek-ai/dsh-client-',
  '@deepseek-ai/dsh-api-',
]

const PROTECTED_ENTRY_PREFIX = /^preset[-:]/

export interface ProtectionInput {
  bundles: readonly BundleInfoLike[]
  entries: readonly PluginInfoLike[]
  inventory?: PluginInventorySnapshotLike
  extraProtect?: readonly string[]
  pinned?: readonly string[]
}

export interface ProtectionResult {
  protectedModules: Set<string>
  protectedEntryPredicate: (entry: PluginInfoLike) => boolean
  protectedBundlePredicate: (bundle: BundleInfoLike) => boolean
}

/** Build the conservative protection policy for trim suggestions and apply. */
export function buildProtection(input: ProtectionInput): ProtectionResult {
  const protectedModules = new Set<string>(PROTECTED_PACKAGES)
  for (const preset of input.inventory?.agentPresets ?? []) {
    for (const row of preset.rows) {
      protectedModules.add(row.moduleName)
    }
  }
  for (const extra of [...(input.extraProtect ?? []), ...(input.pinned ?? [])]) {
    protectedModules.add(extra)
  }

  const protectedBundles = new Set<string>()
  for (const bundle of input.bundles) {
    if (bundle.readOnlyReason !== undefined) {
      protectedBundles.add(bundle.name)
      continue
    }
    if (isProtectedModule(bundle.name)) {
      protectedBundles.add(bundle.name)
      continue
    }
    if (protectedModules.has(bundle.name)) {
      protectedBundles.add(bundle.name)
      continue
    }
    if (
      bundle.rows.some(
        (row) => isProtectedModule(row.moduleName) || protectedModules.has(row.moduleName),
      )
    ) {
      protectedBundles.add(bundle.name)
    }
  }

  return {
    protectedModules,
    protectedEntryPredicate: (entry: PluginInfoLike): boolean => {
      if (entry.readOnlyReason !== undefined) return true
      if (PROTECTED_ENTRY_PREFIX.test(entry.entryId)) return true
      if (protectedModules.has(entry.moduleName)) return true
      if (isProtectedModule(entry.moduleName)) return true
      if (entry.moduleName.includes('agent-preset')) return true
      if (entry.moduleName.includes('dsh-persona')) return true
      return false
    },
    protectedBundlePredicate: (bundle: BundleInfoLike): boolean =>
      protectedBundles.has(bundle.name) ||
      protectedModules.has(bundle.name) ||
      bundle.readOnlyReason !== undefined ||
      isProtectedModule(bundle.name) ||
      bundle.rows.some(
        (row) => protectedModules.has(row.moduleName) || isProtectedModule(row.moduleName),
      ),
  }
}

/** Whether a module/package name falls under the core protection policy. */
export function isProtectedModule(moduleName: string): boolean {
  const root = moduleName.replace(/\/.*$/, '')
  if (PROTECTED_PACKAGES.has(moduleName) || PROTECTED_PACKAGES.has(root)) return true
  return PROTECTED_PREFIXES.some((prefix) => moduleName.startsWith(prefix))
}
