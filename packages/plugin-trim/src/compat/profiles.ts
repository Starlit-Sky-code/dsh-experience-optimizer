import { readdir, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { readJson, readTextFile } from 'dsh-shared-meta'
import { valid as validSemver } from 'semver'
import type {
  PatchLayerRow,
  ProfileRaw,
  WorkspaceRaw,
} from './model.ts'
import { ManifestResolver, manifestVersion } from './manifests.ts'
import { parsePatchText } from './patches.ts'
import { errorText } from './loader-graph.ts'

const PACKAGE_NAME_RE = /^(?:@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*$/

export interface CompatibilityFile {
  exemptions: Record<string, string[]>
  warnings: string[]
  rewritable: boolean
}

/** Read `<profile>/compatibility.json` with the same validation rules as DSH app-boot. */
export async function readCompatibilityFile(profileDir: string): Promise<CompatibilityFile> {
  const path = join(profileDir, 'compatibility.json')
  const text = await readTextFile(path, 1024 * 1024).catch(() => undefined)
  if (text === undefined) return { exemptions: {}, warnings: [], rewritable: true }
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch (error) {
    return {
      exemptions: {},
      warnings: [`${path} is not valid JSON (${errorText(error)}); treating the profile as having no exemptions`],
      rewritable: false,
    }
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return {
      exemptions: {},
      warnings: [`${path} must map exact package@version keys to DSH version lists`],
      rewritable: false,
    }
  }
  const exemptions: Record<string, string[]> = {}
  const warnings: string[] = []
  for (const [key, versions] of Object.entries(value)) {
    const separator = key.lastIndexOf('@')
    if (
      separator <= 0 ||
      !PACKAGE_NAME_RE.test(key.slice(0, separator)) ||
      validSemver(key.slice(separator + 1)) === null
    ) {
      warnings.push(`${path}: ${JSON.stringify(key)} is not an exact package-name@version key; ignored`)
      continue
    }
    if (
      !Array.isArray(versions) ||
      versions.some((item) => typeof item !== 'string' || validSemver(item) === null)
    ) {
      warnings.push(`${path}: ${key} must contain a list of exact DSH versions; ignored`)
      continue
    }
    exemptions[key] = versions
  }
  return { exemptions, warnings, rewritable: warnings.length === 0 }
}

export interface ProfileManifestShape {
  dsh?: { profile?: { bundles?: string[] } }
  dependencies?: Record<string, string>
}

/** Read one profile directory's manifest facts. */
export async function readProfileRaw(profileDir: string, name: string): Promise<ProfileRaw> {
  const pkg = await readJson<ProfileManifestShape>(join(profileDir, 'package.json')).catch(() => undefined)
  const bundles = Array.isArray(pkg?.dsh?.profile?.bundles)
    ? pkg.dsh.profile.bundles.filter((item): item is string => typeof item === 'string')
    : []
  const dependencies =
    pkg?.dependencies !== undefined && pkg.dependencies !== null && typeof pkg.dependencies === 'object'
      ? Object.fromEntries(
          Object.entries(pkg.dependencies).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
        )
      : {}

  const patchRows: PatchLayerRow[] = []
  const patchPath = join(profileDir, 'cordis.patch.yml')
  const patchText = await readTextFile(patchPath).catch(() => undefined)
  if (patchText !== undefined) {
    const result = parsePatchText(patchText, 'profile', patchPath)
    patchRows.push(...result.rows)
  }

  const compatibility = await readCompatibilityFile(profileDir)
  const resolver = new ManifestResolver(profileDir)
  const manifestVersions: Record<string, string | undefined> = {}
  for (const bundle of bundles.slice(0, 100)) {
    const resolved = await resolver.resolve(bundle)
    manifestVersions[bundle] = manifestVersion(resolved?.manifest)
  }

  return {
    name,
    dir: profileDir,
    bundles,
    dependencies,
    patchRows,
    exemptions: compatibility.exemptions,
    compatibilityWarnings: compatibility.warnings,
    compatibilityRewritable: compatibility.rewritable,
    manifestVersions,
  }
}

/** Scan profile directories under `<dshHome>/profiles`. */
export async function scanProfiles(
  profilesDir: string,
  maxProfiles: number,
): Promise<{ profiles: ProfileRaw[]; diagnostics: string[] }> {
  const diagnostics: string[] = []
  let names: string[]
  try {
    const entries = await readdir(profilesDir, { withFileTypes: true })
    names = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort()
  } catch {
    return { profiles: [], diagnostics: [`profiles directory unavailable: ${profilesDir}`] }
  }
  const selected = names.slice(0, maxProfiles)
  if (names.length > selected.length) {
    diagnostics.push(`profile scan truncated to ${selected.length} of ${names.length}`)
  }
  const profiles: ProfileRaw[] = []
  for (const name of selected) {
    const dir = join(profilesDir, name)
    try {
      profiles.push(await readProfileRaw(dir, name))
    } catch (error) {
      diagnostics.push(`profile ${name} unreadable: ${errorText(error)}`)
    }
  }
  return { profiles, diagnostics }
}

/** Collect workspace instruction files without scanning the whole project. */
export async function readWorkspace(
  cwd: string,
  dshHome: string,
  agentsHome = process.env.DSH_AGENTS_HOME?.trim() || join(homedir(), '.agents'),
): Promise<WorkspaceRaw> {
  const candidates: string[] = []
  const seen = new Set<string>()
  const add = (path: string): void => {
    if (seen.has(path)) return
    seen.add(path)
    candidates.push(path)
  }

  let directory = resolve(cwd)
  for (let depth = 0; depth < 8; depth++) {
    add(join(directory, 'AGENTS.md'))
    add(join(directory, 'CLAUDE.md'))
    add(join(directory, 'AGENTS.local.md'))
    add(join(directory, 'CLAUDE.local.md'))
    const parent = dirname(directory)
    if (parent === directory) break
    try {
      await stat(join(directory, '.git'))
      break
    } catch {
      directory = parent
    }
  }
  add(join(dshHome, 'AGENTS.md'))
  add(join(agentsHome, 'AGENTS.md'))

  const instructionFiles: string[] = []
  const instructions: Array<{ file: string; text: string }> = []
  for (const file of candidates) {
    const text = await readTextFile(file, 2 * 1024 * 1024).catch(() => undefined)
    if (text === undefined || text.trim().length === 0) continue
    instructionFiles.push(file)
    instructions.push({ file, text })
  }
  return { cwd: resolve(cwd), instructionFiles, instructions }
}
