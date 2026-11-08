import { parse as parseYaml } from 'yaml'
import { readTextFile } from 'dsh-shared-meta'
import { valid as validSemver } from 'semver'
import type { LockfileSummary } from './model.ts'
import { errorText } from './loader-graph.ts'

export interface ParsedPackageKey {
  name: string
  version: string
}

/** Parse a pnpm lockfile package key, dropping peer suffixes and protocols. */
export function parsePackageKey(key: string): ParsedPackageKey | undefined {
  const clean = key.replace(/\(.*\)$/, '').trim()
  const at = clean.lastIndexOf('@')
  if (at <= 0) return undefined
  const name = clean.slice(0, at)
  let version = clean.slice(at + 1)
  version = version.replace(/^npm:/, '')
  if (version.length === 0 || version.includes('/')) return undefined
  if (validSemver(version) === null) return undefined
  return { name, version }
}

/** Group lockfile package keys by package name. */
export function summarizeLockfile(path: string, text: string): LockfileSummary {
  const summary: LockfileSummary = { path, packageVersions: {}, dshVersions: {} }
  let parsed: unknown
  try {
    parsed = parseYaml(text)
  } catch (error) {
    summary.parseError = errorText(error)
    return summary
  }
  if (parsed === null || typeof parsed !== 'object') return summary
  const packages = (parsed as { packages?: unknown }).packages
  if (packages === null || typeof packages !== 'object') return summary
  for (const key of Object.keys(packages)) {
    const parsedKey = parsePackageKey(key)
    if (parsedKey === undefined) continue
    const versions = summary.packageVersions[parsedKey.name] ?? []
    if (!versions.includes(parsedKey.version)) versions.push(parsedKey.version)
    summary.packageVersions[parsedKey.name] = versions
    if (parsedKey.name.startsWith('@deepseek-ai/dsh')) {
      const dshVersions = summary.dshVersions[parsedKey.name] ?? []
      if (!dshVersions.includes(parsedKey.version)) dshVersions.push(parsedKey.version)
      summary.dshVersions[parsedKey.name] = dshVersions
    }
  }
  return summary
}

/** Read and summarize a profile's pnpm lockfile. */
export async function readLockfile(path: string): Promise<LockfileSummary | undefined> {
  const text = await readTextFile(path, 5 * 1024 * 1024).catch(() => undefined)
  if (text === undefined) return undefined
  return summarizeLockfile(path, text)
}

/** Package names with more than one resolved version. */
export function duplicateVersions(summary: LockfileSummary): Array<{ name: string; versions: string[] }> {
  return Object.entries(summary.packageVersions)
    .filter(([, versions]) => versions.length > 1)
    .map(([name, versions]) => ({ name, versions }))
}
