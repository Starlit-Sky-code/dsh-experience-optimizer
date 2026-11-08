#!/usr/bin/env node
import { readFile, access, stat } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const plugins = ['plugin-trim', 'plugin-recipe']
const failures = []

for (const directory of plugins) {
  const packageDir = join(root, 'packages', directory)
  const manifestPath = join(packageDir, 'package.json')
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  const label = manifest.name ?? directory

  const fail = (message) => failures.push(`${label}: ${message}`)
  if (manifest.type !== 'module') fail('package.json type must be module')
  if (typeof manifest.main !== 'string') fail('missing main')
  const mainPath = join(packageDir, manifest.main ?? '')
  try {
    await access(mainPath)
  } catch {
    fail(`main does not exist: ${manifest.main}`)
  }
  if (manifest.exports?.['.'] === undefined) fail('missing exports["."]')
  if (manifest.dsh?.bundle?.patch === undefined) fail('missing dsh.bundle.patch')
  const patchPath = join(packageDir, manifest.dsh?.bundle?.patch ?? 'cordis.patch.yml')
  let patchText = ''
  try {
    patchText = await readFile(patchPath, 'utf8')
  } catch {
    fail(`bundle patch does not exist: ${patchPath}`)
  }
  if (patchText.length > 0) {
    if (!new RegExp(`id:\\s*['"]?${escapeRegExp(manifest.name)}['"]?`).test(patchText)) {
      fail('bundle patch does not insert the package id')
    }
  }
  if (!Array.isArray(manifest.files) || !manifest.files.includes('dist')) {
    fail('files must include dist')
  }
  if (!Array.isArray(manifest.files) || !manifest.files.includes('icon.png')) {
    fail('files must include icon.png')
  }
  if (typeof manifest.icon !== 'string') {
    fail('missing icon field')
  } else {
    const iconPath = join(packageDir, manifest.icon)
    try {
      const info = await stat(iconPath)
      if (info.size > 256 * 1024) fail(`icon exceeds the 256 KiB DSH limit (${info.size} bytes)`)
      const bytes = await readFile(iconPath)
      const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
      if (!png.every((byte, index) => bytes[index] === byte)) fail('icon is not a valid PNG')
    } catch {
      fail(`icon does not exist: ${manifest.icon}`)
    }
  }

  try {
    const module = await import(pathToFileURL(mainPath).href)
    if (typeof module.name !== 'string') fail('dist does not export name')
    if (typeof module.apply !== 'function') fail('dist does not export apply')
    if (!Array.isArray(module.inject)) fail('dist does not export inject')
    if (module.name !== manifest.name) fail(`name export ${module.name} does not match package name`)
  } catch (error) {
    fail(`cannot import dist: ${error instanceof Error ? error.message : String(error)}`)
  }

  const distText = await readFile(mainPath, 'utf8')
  if (/from\s+["']dsh-shared-meta["']/.test(distText)) {
    fail('dist still imports dsh-shared-meta; shared code was not inlined')
  }
}

if (failures.length > 0) {
  console.error('Packaging verification failed:')
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}
console.log('Packaging verification passed for dsh-plugin-trim and dsh-plugin-recipe.')

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
