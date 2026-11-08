import type {
  LoaderEntryLike,
  LoaderEntrySnapshot,
  PluginInventorySnapshotLike,
} from './model.ts'
import { isRecord, uniq } from 'dsh-shared-meta'

interface ModuleExports {
  name?: string
  inject?: unknown
  provide?: unknown
  default?: unknown
}

/** Normalize Cordis `inject` declarations (array or object) to service names. */
export function normalizeInject(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string')
  if (isRecord(value)) return Object.keys(value)
  return []
}

/** Normalize Cordis `provide` declarations (string, array, or object) to service names. */
export function normalizeProvide(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string')
  if (isRecord(value)) return Object.keys(value)
  return []
}

function readModuleExports(namespace: unknown): ModuleExports {
  if (!isRecord(namespace)) return {}
  const direct: ModuleExports = {
    name: typeof namespace.name === 'string' ? namespace.name : undefined,
    inject: namespace.inject,
    provide: namespace.provide,
    default: namespace.default,
  }
  if (isRecord(namespace.default)) {
    const fallback = namespace.default
    direct.name ??= typeof fallback.name === 'string' ? fallback.name : undefined
    direct.inject ??= fallback.inject
    direct.provide ??= fallback.provide
  }
  return direct
}

/** Map Cordis FiberState numbers to the inventory vocabulary. */
export function mapFiberState(state: number | undefined): LoaderEntrySnapshot['fiberState'] {
  switch (state) {
    case 0:
      return 'pending'
    case 1:
      return 'loading'
    case 2:
      return 'active'
    case 3:
      return 'failed'
    case 5:
      return 'unloading'
    default:
      return null
  }
}

interface InventoryMaps {
  byEntryId: Map<string, PluginInventorySnapshotLike['entries'][number]>
  byModule: Map<string, PluginInventorySnapshotLike['entries'][number]>
}

function buildInventoryMaps(inventory?: PluginInventorySnapshotLike): InventoryMaps {
  const byEntryId = new Map<string, PluginInventorySnapshotLike['entries'][number]>()
  const byModule = new Map<string, PluginInventorySnapshotLike['entries'][number]>()
  for (const entry of inventory?.entries ?? []) {
    byEntryId.set(entry.entryId, entry)
    if (!byModule.has(entry.moduleName)) byModule.set(entry.moduleName, entry)
  }
  return { byEntryId, byModule }
}

function findInventoryEntry(
  entry: LoaderEntryLike,
  maps: InventoryMaps,
): PluginInventorySnapshotLike['entries'][number] | undefined {
  const id = entry.id
  return (
    maps.byEntryId.get(id) ??
    maps.byEntryId.get(`include:${id}`) ??
    maps.byModule.get(entry.options.name)
  )
}

function snapshotFromEntry(
  entry: LoaderEntryLike,
  maps: InventoryMaps,
): LoaderEntrySnapshot {
  const inventory = findInventoryEntry(entry, maps)
  const exports = readModuleExports(entry.moduleNamespace)
  const provide = uniq([
    ...[...(entry.fiber?.provisions ?? [])]
      .map((impl) => impl.name)
      .filter((name): name is string => typeof name === 'string'),
    ...normalizeProvide(exports.provide),
  ])
  const inject = uniq([
    ...Object.keys(entry.fiber?.inject ?? {}),
    ...normalizeInject(entry.options.inject),
    ...normalizeInject(exports.inject),
  ])
  return {
    id: entry.id,
    parentId: entry.id.includes(':') ? entry.id.slice(0, entry.id.lastIndexOf(':')) : null,
    depth: entry.id.split(':').length - 1,
    moduleName: entry.options.name,
    pluginName: exports.name,
    enabled: !entry.disabled,
    group: false,
    fiberState: (inventory?.fiberPhase as LoaderEntrySnapshot['fiberState']) ?? mapFiberState(entry.fiber?.state),
    diagnostic: inventory?.diagnostic,
    provide,
    inject,
    config: entry.options.config,
    source: entry.options.name === '@deepseek-ai/dsh-mcp-client' ? 'mcp' : 'loader',
    mcpServerName:
      entry.options.name === '@deepseek-ai/dsh-mcp-client' &&
      isRecord(entry.options.config) &&
      typeof entry.options.config.name === 'string'
        ? entry.options.config.name
        : undefined,
  }
}

interface PresetRowConfig {
  id?: string
  name?: string
  config?: unknown
  group?: boolean
  disabled?: boolean
  inject?: unknown
}

function flattenPresetRows(
  rows: unknown,
  presetId: string,
  depth: number,
  out: LoaderEntrySnapshot[],
): void {
  if (!Array.isArray(rows)) return
  for (const raw of rows) {
    if (!isRecord(raw)) continue
    const row = raw as PresetRowConfig
    if (typeof row.name !== 'string') continue
    if (row.group === true) {
      flattenPresetRows(row.config, presetId, depth + 1, out)
      continue
    }
    out.push({
      id: `${presetId}:${row.id ?? row.name}`,
      parentId: presetId,
      depth,
      moduleName: row.name,
      enabled: row.disabled !== true,
      group: false,
      fiberState: null,
      provide: [],
      inject: normalizeInject(row.inject),
      config: row.config,
      source: 'preset',
      presetId,
    })
  }
}

/** Collect loader, preset, and MCP rows from one Loader tree. */
export function collectLoaderGraph(
  loader: { entries(): Iterable<LoaderEntryLike> } | undefined,
  inventory?: PluginInventorySnapshotLike,
): { entries: LoaderEntrySnapshot[]; diagnostics: string[] } {
  const entries: LoaderEntrySnapshot[] = []
  const diagnostics: string[] = []
  if (loader === undefined) {
    diagnostics.push('loader service unavailable; compatibility analysis is degraded')
    return { entries, diagnostics }
  }
  const maps = buildInventoryMaps(inventory)
  try {
    for (const entry of loader.entries()) {
      if (entry.options.group) continue
      try {
        const snapshot = snapshotFromEntry(entry, maps)
        entries.push(snapshot)
        if (snapshot.moduleName.includes('agent-preset')) {
          const config = entry.options.config
          if (isRecord(config) && Array.isArray(config.plugins)) {
            const presetId =
              typeof config.id === 'string' ? `preset:${config.id}` : `preset:${entry.id}`
            const presetRows: LoaderEntrySnapshot[] = []
            flattenPresetRows(config.plugins, presetId, snapshot.depth + 1, presetRows)
            entries.push(...presetRows)
          }
        }
      } catch (error) {
        diagnostics.push(`loader entry ${entry.id} could not be inspected: ${errorText(error)}`)
      }
    }
  } catch (error) {
    diagnostics.push(`loader traversal failed: ${errorText(error)}`)
  }
  return { entries, diagnostics }
}

/** Module names that are provided by any agent preset composition. */
export function presetModuleNames(inventory?: PluginInventorySnapshotLike): Set<string> {
  const names = new Set<string>()
  for (const preset of inventory?.agentPresets ?? []) {
    for (const row of preset.rows) names.add(row.moduleName)
  }
  return names
}

export function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
