import {
  shortHash,
  uniq,
} from 'dsh-shared-meta'
import type {
  CompatFinding,
  CompatFix,
  CompatSeverity,
  CompatDomain,
  CompatEvidence,
} from 'dsh-shared-meta'

export interface FindingInput {
  domain: CompatDomain
  code: string
  severity: CompatSeverity
  title: string
  subjects: string[]
  evidence: CompatEvidence[]
  confidence?: 'high' | 'medium' | 'low'
  fix?: CompatFix
  autoApplicable?: boolean
}

/** Build a finding with a deterministic id and deduplicated subjects/evidence. */
export function makeFinding(input: FindingInput): CompatFinding {
  const subjects = uniq(input.subjects.filter((subject) => subject.length > 0)).sort()
  const evidence = dedupeEvidence(input.evidence)
  return {
    id: shortHash(`${input.code}|${subjects.join('|')}`),
    domain: input.domain,
    code: input.code,
    severity: input.severity,
    title: input.title,
    subjects,
    evidence,
    confidence: input.confidence ?? 'high',
    fix: input.fix,
    autoApplicable: input.autoApplicable ?? false,
  }
}

function dedupeEvidence(evidence: CompatEvidence[]): CompatEvidence[] {
  const seen = new Set<string>()
  const out: CompatEvidence[] = []
  for (const item of evidence) {
    const key = `${item.source}|${item.ref ?? ''}|${item.summary}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(item)
  }
  return out
}

const SEVERITY_RANK: Record<CompatSeverity, number> = { error: 0, warn: 1, info: 2 }

/** Sort findings by severity, domain, code, and subjects. */
export function sortFindings(findings: readonly CompatFinding[]): CompatFinding[] {
  return [...findings].sort((a, b) => {
    const severity = SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]
    if (severity !== 0) return severity
    const domain = a.domain.localeCompare(b.domain)
    if (domain !== 0) return domain
    const code = a.code.localeCompare(b.code)
    if (code !== 0) return code
    return a.subjects.join('|').localeCompare(b.subjects.join('|'))
  })
}

/** Merge duplicate findings with the same id, unioning evidence. */
export function dedupeFindings(findings: readonly CompatFinding[]): CompatFinding[] {
  const byId = new Map<string, CompatFinding>()
  for (const finding of findings) {
    const existing = byId.get(finding.id)
    if (existing === undefined) {
      byId.set(finding.id, finding)
      continue
    }
    const subjects = uniq([...existing.subjects, ...finding.subjects]).sort()
    byId.set(finding.id, {
      ...existing,
      subjects,
      evidence: dedupeEvidence([...existing.evidence, ...finding.evidence]),
      fix: existing.fix ?? finding.fix,
      autoApplicable: existing.autoApplicable || finding.autoApplicable,
      severity: SEVERITY_RANK[finding.severity] < SEVERITY_RANK[existing.severity]
        ? finding.severity
        : existing.severity,
    })
  }
  return [...byId.values()]
}

/** Group findings by subject for trim integration. */
export function findingsBySubject(
  findings: readonly CompatFinding[],
): Map<string, CompatFinding[]> {
  const map = new Map<string, CompatFinding[]>()
  for (const finding of findings) {
    for (const subject of finding.subjects) {
      const list = map.get(subject) ?? []
      list.push(finding)
      map.set(subject, list)
    }
  }
  return map
}
