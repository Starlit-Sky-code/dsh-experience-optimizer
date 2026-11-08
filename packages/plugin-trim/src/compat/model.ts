import type {
  CompatFinding,
  CompatReport,
  PluginForm,
} from 'dsh-shared-meta'

/** Minimal structural view of one plugin manifest. */
export interface PluginManifest {
  name?: string
  version?: string
  engines?: Record<string, unknown>
  peerDependencies?: Record<string, string>
  dependencies?: Record<string, string>
  dsh?: {
    bundle?: {
      patch?: string | string[]
      platforms?: string[]
    }
    client?: unknown
  }
}

/** Minimal structural view of the plugin manager service. */
export interface PluginManagerLike {
  listPlugins(): Promise<PluginInfoLike[]>
  listBundles(): Promise<BundleInfoLike[]>
  listVersionExemptions(): {
    exemptions: Record<string, string[]>
    warnings: string[]
  }
  setPluginEnabled?(id: string, enabled: boolean): Promise<ChangeResultLike>
  setBundleEnabled?(name: string, enabled: boolean): Promise<ChangeResultLike>
}

/** Minimal structural view of a plugin-manager change result. */
export interface ChangeResultLike {
  changed: boolean
  application: 'applied' | 'restart-required' | 'overridden' | 'failed' | 'cancelled'
  restartReason?: string
  error?: { code?: string; diagnostic?: string }
}

export interface PluginInfoLike {
  entryId: string
  moduleName: string
  enabled: boolean
  fiberPhase: string | null
  diagnostic?: string
  patchId?: string
  readOnlyReason?: string
}

export interface BundleInfoLike {
  name: string
  version?: string
  description?: string
  enabled: boolean
  installed: boolean
  availability: string
  official: boolean
  optional: boolean
  removable: boolean
  readOnlyReason?: string
  error?: {
    code?: string
    diagnostic?: string
    incompatible?: Array<{
      name: string
      version: string
      runtimeVersion: string
      requirements: Record<string, string>
    }>
  }
  rows: Array<{ rowId: string; moduleName: string; entryId?: string }>
  overrides: string[]
}

/** Minimal structural view of the plugin inventory gateway. */
export interface PluginInventoryLike {
  list(): Promise<PluginInventorySnapshotLike>
}

export interface PluginInventorySnapshotLike {
  managementAvailable?: boolean
  entries: Array<{
    entryId: string
    moduleName: string
    enabled: boolean
    fiberPhase: string | null
    diagnostic?: string
  }>
  agentPresets?: Array<{
    id: string
    name?: string
    isDefault: boolean
    broken?: string
    rows: Array<{
      entryId: string | null
      moduleName: string
      enabled: boolean | 'conditional'
      condition?: string
      fiberPhase: string | null
    }>
  }>
}

/** Minimal structural view of one loader entry. */
export interface LoaderEntryLike {
  id: string
  options: {
    id: string
    name: string
    config?: unknown
    group?: boolean | null
    disabled?: boolean | null
    inject?: unknown
  }
  disabled: boolean
  fiber?: {
    state?: number
    inject?: Record<string, unknown>
    provisions?: Iterable<{ name?: string }>
  }
  moduleNamespace?: unknown
}

/** Minimal structural view of the loader service. */
export interface LoaderLike {
  entries(): Iterable<LoaderEntryLike>
}

/** A prompt assembly subset needed for overlap and cost attribution. */
export interface PromptAssemblyLike {
  sections: Array<{ name: string; text: string }>
  contexts: Array<{ name: string; text: string }>
  tools: Array<{ name: string; description?: string; parameters?: unknown }>
}

/** A prompt adapter, separate from Cordis so tests can fake it. */
export interface PromptAdapterLike {
  assemble(agent?: unknown, toolSet?: unknown): Promise<PromptAssemblyLike | undefined>
}

/** Runtime facts. */
export interface CompatRuntimeInfo {
  dshVersion: string
  nodeVersion: string
  platform: string
  arch: string
}

/** One normalized loader/preset/MCP row. */
export interface LoaderEntrySnapshot {
  id: string
  parentId: string | null
  depth: number
  moduleName: string
  pluginName?: string
  enabled: boolean
  group: boolean
  fiberState: 'pending' | 'loading' | 'active' | 'failed' | 'unloading' | null
  diagnostic?: string
  provide: string[]
  inject: string[]
  config?: unknown
  source: 'loader' | 'preset' | 'mcp'
  presetId?: string
  mcpServerName?: string
}

/** One parsed patch-layer row. */
export interface PatchLayerRow {
  layer: string
  id: string
  name?: string
  disabled?: boolean | JsSentinel
  config?: unknown
  sourceFile: string
}

export interface JsSentinel {
  __js: string
}

/** Lockfile summary. */
export interface LockfileSummary {
  path: string
  packageVersions: Record<string, string[]>
  dshVersions: Record<string, string[]>
  parseError?: string
}

/** One profile's raw facts. */
export interface ProfileRaw {
  name: string
  dir: string
  bundles: string[]
  dependencies: Record<string, string>
  patchRows: PatchLayerRow[]
  exemptions: Record<string, string[]>
  compatibilityWarnings: string[]
  compatibilityRewritable: boolean
  manifestVersions: Record<string, string | undefined>
}

/** Workspace facts. */
export interface WorkspaceRaw {
  cwd: string
  instructionFiles: string[]
  instructions: Array<{ file: string; text: string }>
}

/** Configuration subset relevant to compatibility analysis. */
export interface CompatConfigLike {
  compatEnabled: boolean
  compatScanAllProfiles: boolean
  compatMaxProfiles: number
  compatIncludeInfo: boolean
  compatMaxFindings: number
  compatReadLockfile: boolean
  compatReadWorkspace: boolean
  compatStrictOfficialOverrides: boolean
  compatCacheTtlMs: number
  toolOwners: Record<string, string>
}

/** Everything the compatibility rules need. */
export interface CompatContext {
  runtime: CompatRuntimeInfo
  config: CompatConfigLike
  profile: {
    name: string
    dir: string
    bundles: string[]
    dependencies: Record<string, string>
    patchRows: PatchLayerRow[]
    exemptions: Record<string, string[]>
    compatibilityWarnings: string[]
    compatibilityRewritable: boolean
  }
  loaderEntries: LoaderEntrySnapshot[]
  bundles: BundleInfoLike[]
  entriesInfo: PluginInfoLike[]
  inventory?: PluginInventorySnapshotLike
  manifests: Map<string, PluginManifest | undefined>
  lockfile?: LockfileSummary
  profiles: ProfileRaw[]
  workspace: WorkspaceRaw
  prompt?: PromptAssemblyLike
  diagnostics: string[]
}

/** Result of one analysis plus the report. */
export interface CompatAnalysisResult {
  report: CompatReport
  findings: CompatFinding[]
  context: CompatContext
  markdown: string
  reportPath?: string
}

/** The plugin form is not needed for rules yet, but keeping the re-export eases later UI work. */
export type { PluginForm }
