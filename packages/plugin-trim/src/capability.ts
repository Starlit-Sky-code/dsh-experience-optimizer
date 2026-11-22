import type { CapabilityGroup, CapabilityItem, CapabilitySurface } from 'dsh-shared-meta'
import type { LoaderEntrySnapshot, PatchLayerRow } from './compat/model.ts'
import { isJsSentinel } from './compat/patches.ts'
import type { ScanResult, ToolCost } from './scan.ts'

/** Build a static capability surface from tool names, MCP rows, and patch layers. */
export function inspectCapabilities(input: {
  tools: readonly ToolCost[]
  loaderEntries: readonly LoaderEntrySnapshot[]
  patchRows: readonly PatchLayerRow[]
}): CapabilitySurface {
  const groups: CapabilityGroup[] = [
    group('shell', 'Shell', '工具名推断', input.tools.filter((tool) => SHELL.test(tool.name))),
    group('filesystem-write', 'File write', '工具名推断', input.tools.filter((tool) => FILE_WRITE.test(tool.name))),
    group('network', 'Network', '工具名推断', input.tools.filter((tool) => NETWORK.test(tool.name))),
    {
      id: 'mcp',
      label: 'MCP',
      count: 0,
      items: mcpItems(input.loaderEntries),
    },
    {
      id: 'dynamic-config',
      label: 'Dynamic config',
      count: 0,
      items: dynamicItems(input.patchRows),
    },
  ]
  for (const item of groups) item.count = item.items.length
  return {
    groups,
    notes: [
      'Static capability surface: tool names, MCP rows, and !!js patch sentinels only.',
      'This is not a security audit; plugin code can still do anything at runtime.',
    ],
  }
}

const SHELL = /(^|[_-])(bash|shell|terminal|exec|run_command|command)([_-]|$)/i
const FILE_WRITE = /(^|[_-])(write|edit|patch|apply_patch|mkdir|rm|delete|move|copy|fs_write)([_-]|$)/i
const NETWORK = /(^|[_-])(fetch|http|web|browser|curl|download|upload|request)([_-]|$)/i

function group(
  id: CapabilityGroup['id'],
  label: string,
  evidence: string,
  tools: readonly ToolCost[],
): CapabilityGroup {
  const items: CapabilityItem[] = []
  const seen = new Set<string>()
  for (const tool of tools) {
    const key = `${tool.owner ?? 'unattributed'}:${tool.name}`
    if (seen.has(key)) continue
    seen.add(key)
    items.push({
      name: tool.name,
      owner: tool.owner,
      evidence,
    })
    if (items.length >= 20) break
  }
  return { id, label, count: items.length, items }
}

function mcpItems(entries: readonly LoaderEntrySnapshot[]): CapabilityItem[] {
  const items: CapabilityItem[] = []
  const seen = new Set<string>()
  for (const entry of entries) {
    if (entry.source !== 'mcp') continue
    const name = entry.mcpServerName ?? entry.moduleName
    if (seen.has(name)) continue
    seen.add(name)
    items.push({ name, evidence: 'MCP entry' })
    if (items.length >= 20) break
  }
  return items
}

function dynamicItems(rows: readonly PatchLayerRow[]): CapabilityItem[] {
  const items: CapabilityItem[] = []
  const seen = new Set<string>()
  for (const row of rows) {
    // Official patch layers use !!js for host wiring; that is not a third-party
    // plugin capability and would otherwise drown the useful entries.
    if (row.layer.startsWith('@deepseek-ai/')) continue
    if (!containsJs(row.config) && !isJsSentinel(row.disabled)) continue
    const key = `${row.layer}:${row.id}`
    if (seen.has(key)) continue
    seen.add(key)
    items.push({ name: key, evidence: '!!js patch' })
    if (items.length >= 20) break
  }
  return items
}

function containsJs(value: unknown, depth = 0): boolean {
  if (depth > 6) return false
  if (isJsSentinel(value)) return true
  if (Array.isArray(value)) return value.some((item) => containsJs(item, depth + 1))
  if (value !== null && typeof value === 'object') {
    return Object.values(value).some((item) => containsJs(item, depth + 1))
  }
  return false
}

/** Convenience wrapper for the API layer. */
export function capabilitiesOf(scan: ScanResult, loaderEntries: readonly LoaderEntrySnapshot[], patchRows: readonly PatchLayerRow[]): CapabilitySurface {
  return inspectCapabilities({ tools: scan.context.tools, loaderEntries, patchRows })
}
