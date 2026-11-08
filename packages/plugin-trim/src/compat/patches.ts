import { join } from 'node:path'
import { parse as parseYaml } from 'yaml'
import { deepEqualJson, isRecord, readTextFile } from 'dsh-shared-meta'
import type { JsSentinel, PatchLayerRow, PluginManifest } from './model.ts'
import { ManifestResolver, manifestPatchPaths, manifestDir } from './manifests.ts'
import { errorText } from './loader-graph.ts'

const JS_TAG = 'tag:yaml.org,2002:js'

const jsSentinelTag = {
  tag: JS_TAG,
  resolve: (value: string): JsSentinel => ({ __js: value }),
}

/** True when a value is the non-executed `!!js` placeholder. */
export function isJsSentinel(value: unknown): value is JsSentinel {
  return isRecord(value) && typeof value.__js === 'string'
}

/** Parse one patch file without executing `!!js` expressions. */
export function parsePatchText(
  text: string,
  layer: string,
  sourceFile: string,
): { rows: PatchLayerRow[]; error?: string } {
  let parsed: unknown
  try {
    parsed = parseYaml(text, { customTags: [jsSentinelTag] })
  } catch (error) {
    return { rows: scanPatchFallback(text, layer, sourceFile), error: errorText(error) }
  }
  const rows: PatchLayerRow[] = []
  flattenPatch(parsed, layer, sourceFile, rows)
  return { rows }
}

function flattenPatch(
  value: unknown,
  layer: string,
  sourceFile: string,
  out: PatchLayerRow[],
): void {
  if (Array.isArray(value)) {
    for (const item of value) flattenPatch(item, layer, sourceFile, out)
    return
  }
  if (!isRecord(value)) return
  if (Array.isArray(value.insert)) {
    flattenPatch(value.insert, layer, sourceFile, out)
  } else if (isRecord(value.insert)) {
    flattenPatch(value.insert, layer, sourceFile, out)
  }
  if (typeof value.id === 'string') {
    out.push({
      layer,
      id: value.id,
      name: typeof value.name === 'string' ? value.name : undefined,
      disabled:
        typeof value.disabled === 'boolean' || isJsSentinel(value.disabled)
          ? value.disabled
          : undefined,
      config: value.config,
      sourceFile,
    })
  }
}

/** Last-resort line scanner; only extracts ids and names. */
function scanPatchFallback(text: string, layer: string, sourceFile: string): PatchLayerRow[] {
  const rows: PatchLayerRow[] = []
  let current: PatchLayerRow | undefined
  for (const line of text.split(/\r?\n/)) {
    const id = /^\s*-\s*id:\s*['"]?([^'"\s]+)['"]?\s*$/.exec(line)
    if (id?.[1] !== undefined) {
      current = { layer, id: id[1], sourceFile }
      rows.push(current)
      continue
    }
    const name = /^\s*name:\s*['"]?([^'"\s]+)['"]?\s*$/.exec(line)
    if (name?.[1] !== undefined && current !== undefined) current.name = name[1]
  }
  return rows
}

export interface PatchReadResult {
  rows: PatchLayerRow[]
  diagnostics: string[]
}

/** Read all patch layers for a profile without evaluating expressions. */
export async function readProfilePatchLayers(options: {
  profileDir: string
  dshHome: string
  bundles: readonly string[]
  manifests: Map<string, PluginManifest | undefined>
}): Promise<PatchReadResult> {
  const rows: PatchLayerRow[] = []
  const diagnostics: string[] = []
  const resolver = new ManifestResolver(options.profileDir)

  for (const bundle of options.bundles) {
    const resolved = await resolver.resolve(bundle)
    const manifest = options.manifests.get(bundle) ?? resolved?.manifest
    const dir = manifestDir(resolved)
    for (const relative of manifestPatchPaths(manifest)) {
      const path = dir === undefined ? relative : join(dir, relative)
      const text = await readTextFile(path).catch(() => undefined)
      if (text === undefined) {
        diagnostics.push(`patch unreadable: ${path}`)
        continue
      }
      const result = parsePatchText(text, bundle, path)
      rows.push(...result.rows)
      if (result.error !== undefined) diagnostics.push(`patch parse fallback (${path}): ${result.error}`)
    }
  }

  for (const [layer, path] of [
    ['profile', join(options.profileDir, 'cordis.patch.yml')],
    ['home', join(options.dshHome, 'cordis.patch.yml')],
  ] as const) {
    const text = await readTextFile(path).catch(() => undefined)
    if (text === undefined) continue
    const result = parsePatchText(text, layer, path)
    rows.push(...result.rows)
    if (result.error !== undefined) diagnostics.push(`patch parse fallback (${path}): ${result.error}`)
  }

  return { rows, diagnostics }
}

export interface ConfigConflict {
  id: string
  layers: string[]
  values: unknown[]
}

/** Find the same row id configured with different values across layers. */
export function findConfigConflicts(
  rows: readonly PatchLayerRow[],
  options: { skipLayer?: (layer: string) => boolean } = {},
): ConfigConflict[] {
  const byId = new Map<string, PatchLayerRow[]>()
  for (const row of rows) {
    if (options.skipLayer?.(row.layer) === true) continue
    const list = byId.get(row.id) ?? []
    list.push(row)
    byId.set(row.id, list)
  }
  const conflicts: ConfigConflict[] = []
  for (const [id, list] of byId) {
    const withConfig = list.filter((row) => row.config !== undefined)
    if (withConfig.length < 2) continue
    const first = withConfig[0]?.config
    if (first === undefined) continue
    if (withConfig.some((row) => !deepEqualJson(first, row.config))) {
      conflicts.push({
        id,
        layers: withConfig.map((row) => row.layer),
        values: withConfig.map((row) => row.config),
      })
    }
  }
  return conflicts
}

/** Resolve a patch file path relative to a package directory. */
export function patchFilePath(packageDir: string, relative: string): string {
  return join(packageDir, relative)
}
