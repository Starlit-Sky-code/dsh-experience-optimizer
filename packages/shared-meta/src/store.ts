import { constants } from 'node:fs'
import { access, appendFile, chmod, mkdir, readFile, readdir, rename, stat, unlink, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import type { JsonValue } from './types.ts'

/** Local store failure with a stable code. */
export class StoreError extends Error {
  readonly code: 'read' | 'write' | 'parse' | 'too-large' | 'not-found'

  constructor(code: StoreError['code'], message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'StoreError'
    this.code = code
  }
}

/** Resolve the DSH home: `$DSH_HOME`, else `~/.dsh`. */
export function resolveDshHome(env: NodeJS.ProcessEnv = process.env): string {
  const configured = env.DSH_HOME?.trim()
  return configured ? resolve(configured) : join(homedir(), '.dsh')
}

/** Join a path under `<dshHome>/experience-optimizer`. */
export function dataDir(...segments: string[]): string {
  return join(resolveDshHome(), 'experience-optimizer', ...segments)
}

/** Create a directory with owner-only permissions. */
export async function ensureDir(path: string): Promise<void> {
  await mkdir(path, { recursive: true, mode: 0o700 })
  await chmod(path, 0o700).catch(() => undefined)
}

export async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK)
    return true
  } catch {
    return false
  }
}

/** Read a UTF-8 text file with an optional byte cap. */
export async function readTextFile(
  path: string,
  maxBytes = 5 * 1024 * 1024,
): Promise<string | undefined> {
  try {
    const info = await stat(path)
    if (info.size > maxBytes) {
      throw new StoreError('too-large', `${path} is ${info.size} bytes (limit ${maxBytes})`)
    }
    return await readFile(path, 'utf8')
  } catch (error) {
    if (isNotFound(error)) return undefined
    throw error
  }
}

/** Read and parse JSON; missing files return undefined. */
export async function readJson<T = unknown>(path: string): Promise<T | undefined> {
  const text = await readTextFile(path)
  if (text === undefined) return undefined
  try {
    return JSON.parse(text) as T
  } catch (error) {
    throw new StoreError('parse', `invalid JSON at ${path}`, { cause: error })
  }
}

/** Atomically replace a JSON file. */
export async function writeJsonAtomic(
  path: string,
  value: unknown,
  mode = 0o600,
): Promise<void> {
  const directory = dirname(path)
  await ensureDir(directory)
  const temporary = join(directory, `.${randomUUID()}.tmp`)
  try {
    await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8', mode })
    await chmod(temporary, mode).catch(() => undefined)
    await rename(temporary, path)
  } catch (error) {
    await unlink(temporary).catch(() => undefined)
    throw new StoreError('write', `cannot write ${path}`, { cause: error })
  }
}

/** Append JSON lines in one batch. */
export async function appendJsonl(path: string, lines: readonly unknown[]): Promise<void> {
  if (lines.length === 0) return
  await ensureDir(dirname(path))
  const text = lines.map((line) => `${JSON.stringify(line)}\n`).join('')
  try {
    await appendFile(path, text, { encoding: 'utf8', mode: 0o600 })
  } catch (error) {
    throw new StoreError('write', `cannot append ${path}`, { cause: error })
  }
}

/** Read JSON lines, skipping malformed records. */
export async function readJsonl<T = unknown>(
  path: string,
  limit?: number,
): Promise<T[]> {
  const text = await readTextFile(path)
  if (text === undefined) return []
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0)
  const selected = limit === undefined ? lines : lines.slice(-limit)
  const result: T[] = []
  for (const line of selected) {
    try {
      result.push(JSON.parse(line) as T)
    } catch {
      // A partially written trailing line is not a fatal store error.
    }
  }
  return result
}

/** List JSON files by newest mtime first. */
export async function listJsonFiles(directory: string): Promise<string[]> {
  let names: string[]
  try {
    names = await readdir(directory)
  } catch (error) {
    if (isNotFound(error)) return []
    throw error
  }
  const files = names.filter((name) => name.endsWith('.json')).map((name) => join(directory, name))
  const withTimes = await Promise.all(
    files.map(async (path) => ({ path, mtime: (await stat(path)).mtimeMs })),
  )
  return withTimes.sort((a, b) => b.mtime - a.mtime).map((item) => item.path)
}

/** Delete oldest files beyond `max`. */
export async function pruneToCount(directory: string, max: number): Promise<void> {
  const files = await listJsonFiles(directory)
  for (const path of files.slice(Math.max(0, max))) {
    await unlink(path).catch(() => undefined)
  }
}

/** Replace a file atomically with arbitrary text. */
export async function writeTextAtomic(
  path: string,
  text: string,
  mode = 0o600,
): Promise<void> {
  const directory = dirname(path)
  await ensureDir(directory)
  const temporary = join(directory, `.${randomUUID()}.tmp`)
  try {
    await writeFile(temporary, text, { encoding: 'utf8', mode })
    await chmod(temporary, mode).catch(() => undefined)
    await rename(temporary, path)
  } catch (error) {
    await unlink(temporary).catch(() => undefined)
    throw new StoreError('write', `cannot write ${path}`, { cause: error })
  }
}

/** Parse a JSON value that may already be an object (tool argument convenience). */
export function asJsonValue(value: unknown): JsonValue | undefined {
  if (value === undefined) return undefined
  try {
    return JSON.parse(JSON.stringify(value)) as JsonValue
  } catch {
    return undefined
  }
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'ENOENT'
  )
}
