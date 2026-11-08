import {
  jaccard,
  normalizeLine,
  shortHash,
  shingles,
  splitParagraphs,
  truncate,
  uniq,
  wordTokens,
} from 'dsh-shared-meta'
import type { DedupeGroup } from 'dsh-shared-meta'
import { ownerOfSection } from './tool-owners.ts'

export interface PromptSectionLike {
  name: string
  text: string
}

export interface DedupeOptions {
  persistExcerpts: boolean
  similarityThreshold?: number
}

interface Paragraph {
  section: string
  owner?: string
  text: string
  normalized: string
  shingles: Set<string>
}

/** Find exact and near-duplicate prompt paragraphs across sections. */
export function dedupeSections(
  sections: readonly PromptSectionLike[],
  options: DedupeOptions,
): DedupeGroup[] {
  const paragraphs: Paragraph[] = []
  for (const section of sections.slice(0, 200)) {
    for (const text of splitParagraphs(section.text).slice(0, 20)) {
      const normalized = normalizeLine(text)
      if (normalized.length < 20) continue
      paragraphs.push({
        section: section.name,
        owner: ownerOfSection(section.name),
        text,
        normalized,
        shingles: shingles(wordTokens(text), 3),
      })
    }
  }
  if (paragraphs.length < 2) return []

  const groups: Paragraph[][] = []
  const used = new Set<number>()
  const threshold = options.similarityThreshold ?? 0.8

  for (let i = 0; i < paragraphs.length; i++) {
    if (used.has(i)) continue
    const base = paragraphs[i]!
    const group = [base]
    used.add(i)
    for (let j = i + 1; j < paragraphs.length; j++) {
      if (used.has(j)) continue
      const candidate = paragraphs[j]!
      const exact = base.normalized === candidate.normalized
      const similarity = exact ? 1 : jaccard(base.shingles, candidate.shingles)
      if (similarity < threshold) continue
      group.push(candidate)
      used.add(j)
    }
    if (uniq(group.map((item) => item.section)).length > 1) groups.push(group)
    if (groups.length >= 20) break
  }

  const out: DedupeGroup[] = []
  const seen = new Set<string>()
  for (const group of groups) {
    const sectionsInGroup = uniq(group.map((item) => item.section)).sort()
    const key = sectionsInGroup.join('|')
    if (seen.has(key)) continue
    seen.add(key)
    const members = sectionsInGroup.map((section) => {
      const first = group.find((item) => item.section === section)
      return {
        section,
        owner: first?.owner,
        textLength: first?.text.length ?? 0,
      }
    })
    const authority = pickAuthority(members)
    const conflict = hasConflict(group.map((item) => item.text))
    out.push({
      fingerprint: shortHash(key),
      members,
      authority,
      conflict,
      reason: conflict
        ? '疑似语义冲突，仅标记不合并'
        : '保留权威来源，其余建议改为引用或摘要',
      excerpt: options.persistExcerpts ? truncate(group[0]?.text ?? '', 160) : undefined,
    })
  }
  return out
}

function pickAuthority(members: DedupeGroup['members']): string {
  const ranked = [...members].sort((a, b) => {
    const aCore = isAuthoritativeOwner(a.owner) ? 1 : 0
    const bCore = isAuthoritativeOwner(b.owner) ? 1 : 0
    if (aCore !== bCore) return bCore - aCore
    if (a.textLength !== b.textLength) return b.textLength - a.textLength
    return a.section.localeCompare(b.section)
  })
  return ranked[0]?.section ?? ''
}

function isAuthoritativeOwner(owner: string | undefined): boolean {
  if (owner === undefined) return false
  return owner.includes('dsh-tool-fs') || owner.includes('dsh-tool-bash') || owner.includes('dsh-system-prompt')
}

function hasConflict(texts: readonly string[]): boolean {
  const negation = /(?:^|\s)(not|never|no|禁止|不得|不要|必须|always|must)(?:\s|$)/i
  const numberSets = texts.map((text) => new Set(text.match(/\d+/g) ?? []))
  const first = numberSets[0] ?? new Set<string>()
  for (const current of numberSets.slice(1)) {
    if (current.size !== first.size) return true
    for (const value of first) if (!current.has(value)) return true
  }
  const firstNegation = negation.test(texts[0] ?? '')
  for (const text of texts.slice(1)) {
    if (negation.test(text) !== firstNegation) return true
  }
  return false
}
