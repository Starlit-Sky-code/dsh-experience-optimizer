import type { JsonValue } from './types.ts'

const CJK_RE = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g
const PUNCT_RE = /[^\p{L}\p{N}\s]/gu
const SPACE_RE = /\s+/g

/** Extract visible text from model content blocks without importing DSH types. */
export function flattenTextBlocks(blocks: unknown): string {
  if (!Array.isArray(blocks)) return ''
  const parts: string[] = []
  for (const block of blocks) {
    if (isRecord(block) && block.type === 'text' && typeof block.text === 'string') {
      parts.push(block.text)
    }
  }
  return parts.join('\n')
}

/** Lowercase, collapse whitespace, and strip punctuation for stable comparison. */
export function normalizeLine(text: string): string {
  return text
    .toLowerCase()
    .replace(SPACE_RE, ' ')
    .replace(PUNCT_RE, ' ')
    .replace(SPACE_RE, ' ')
    .trim()
}

/** Normalize a paragraph while preserving sentence order. */
export function normalizeText(text: string): string {
  return splitParagraphs(text).map(normalizeLine).filter(Boolean).join('\n')
}

/** Split on blank lines, falling back to non-empty lines. */
export function splitParagraphs(text: string): string[] {
  const paragraphs = text
    .split(/\n\s*\n/g)
    .map((part) => part.trim())
    .filter(Boolean)
  if (paragraphs.length > 1) return paragraphs
  return text
    .split(/\n/g)
    .map((line) => line.trim())
    .filter(Boolean)
}

/** CJK-aware token estimate. CJK characters count as one token; other text uses 3.5 chars/token. */
export function estimateTokens(text: string): number {
  if (text.length === 0) return 0
  const cjk = (text.match(CJK_RE) ?? []).length
  const other = text.length - cjk
  return cjk + Math.ceil(other / 3.5)
}

/** Truncate without splitting surrogate pairs. */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  if (max <= 1) return text.slice(0, max)
  return `${text.slice(0, max - 1)}…`
}

/** Word/CJK bigram-ish tokens used for shingling. CJK runs become single-character tokens. */
export function wordTokens(text: string): string[] {
  const normalized = normalizeLine(text)
  if (!normalized) return []
  const tokens: string[] = []
  for (const part of normalized.split(' ')) {
    if (!part) continue
    if (CJK_RE.test(part)) {
      CJK_RE.lastIndex = 0
      for (const char of part) tokens.push(char)
    } else {
      tokens.push(part)
    }
  }
  return tokens
}

/** Contiguous n-gram shingles; short inputs produce one shingle. */
export function shingles(tokens: readonly string[], n = 3): Set<string> {
  if (tokens.length === 0) return new Set()
  if (tokens.length <= n) return new Set([tokens.join(' ')])
  const result = new Set<string>()
  for (let i = 0; i <= tokens.length - n; i++) {
    result.add(tokens.slice(i, i + n).join(' '))
  }
  return result
}

/** Jaccard similarity of two shingle sets. Empty sets compare as 0. */
export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0
  let intersection = 0
  const [small, large] = a.size <= b.size ? [a, b] : [b, a]
  for (const item of small) if (large.has(item)) intersection++
  return intersection / (a.size + b.size - intersection)
}

/** Filesystem/URL-safe slug with a bounded length. */
export function slugify(text: string, max = 48): string {
  const slug = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, max)
  return slug || 'untitled'
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function uniq<T>(values: readonly T[]): T[] {
  return [...new Set(values)]
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function round(value: number, digits = 2): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

export function firstLine(text: string, max = 120): string {
  const line = text.split(/\r?\n/).find((item) => item.trim().length > 0) ?? ''
  return truncate(line.trim(), max)
}

/** JSON stringify with sorted object keys, for stable comparisons. */
export function stableStringify(value: unknown): string {
  return JSON.stringify(sortJson(value))
}

function sortJson(value: unknown): JsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value
  if (typeof value === 'number') return Number.isFinite(value) ? value : String(value)
  if (Array.isArray(value)) return value.map((item) => sortJson(item))
  if (isRecord(value)) {
    const out: Record<string, JsonValue> = {}
    for (const key of Object.keys(value).sort()) out[key] = sortJson(value[key])
    return out
  }
  return String(value)
}

/** Structural JSON equality with sorted keys. */
export function deepEqualJson(a: unknown, b: unknown): boolean {
  return stableStringify(a) === stableStringify(b)
}

/** Escape text for one Markdown table cell. */
export function escapeMarkdownCell(text: string): string {
  return text.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').trim()
}

/** Render a bounded fenced JSON block. */
export function jsonBlock(value: unknown, maxChars = 12_000): string {
  const text = JSON.stringify(value, null, 2)
  return `\`\`\`json\n${truncate(text, maxChars)}\n\`\`\``
}
