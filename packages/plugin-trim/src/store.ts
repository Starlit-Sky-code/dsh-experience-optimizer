import { dataDir, listJsonFiles, pruneToCount, readJson, writeJsonAtomic } from 'dsh-shared-meta'
import type { ApplySnapshot, SlimProfile } from 'dsh-shared-meta'

export function draftPath(profileId: string): string {
  return dataDir('trim', 'profiles', `${safeId(profileId)}.json`)
}

export function snapshotPath(token: string): string {
  return dataDir('trim', 'snapshots', `${safeId(token)}.json`)
}

export async function saveDraft(profile: SlimProfile, maxDrafts: number): Promise<void> {
  await writeJsonAtomic(draftPath(profile.id), profile)
  await pruneToCount(dataDir('trim', 'profiles'), maxDrafts)
}

export async function loadDraft(profileId: string): Promise<SlimProfile | undefined> {
  return readJson<SlimProfile>(draftPath(profileId))
}

export async function saveSnapshot(snapshot: ApplySnapshot, maxDrafts: number): Promise<void> {
  await writeJsonAtomic(snapshotPath(snapshot.token), snapshot)
  await pruneToCount(dataDir('trim', 'snapshots'), maxDrafts)
}

export async function loadSnapshot(token: string): Promise<ApplySnapshot | undefined> {
  return readJson<ApplySnapshot>(snapshotPath(token))
}

export async function listDrafts(): Promise<string[]> {
  return listJsonFiles(dataDir('trim', 'profiles'))
}

export async function listSnapshots(): Promise<string[]> {
  return listJsonFiles(dataDir('trim', 'snapshots'))
}

/** Delete a draft after a terminal state. */
export async function removeDraft(profileId: string): Promise<void> {
  const { unlink } = await import('node:fs/promises')
  await unlink(draftPath(profileId)).catch(() => undefined)
}

function safeId(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120)
}
