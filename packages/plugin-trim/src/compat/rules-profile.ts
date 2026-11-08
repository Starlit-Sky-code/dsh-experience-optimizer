import {
  jaccard,
  normalizeLine,
  shingles,
  splitParagraphs,
  wordTokens,
} from 'dsh-shared-meta'
import type { CompatFinding } from 'dsh-shared-meta'
import type { CompatContext, ProfileRaw } from './model.ts'
import { makeFinding } from './finding.ts'
import { findConfigConflicts } from './patches.ts'

/** Profile/workspace consistency rules. */
export async function runProfileRules(context: CompatContext): Promise<CompatFinding[]> {
  const findings: CompatFinding[] = []
  const profile = context.profile

  // -- duplicate bundles ---------------------------------------------------
  const bundleCounts = new Map<string, number>()
  for (const bundle of profile.bundles) {
    bundleCounts.set(bundle, (bundleCounts.get(bundle) ?? 0) + 1)
  }
  for (const [bundle, count] of bundleCounts) {
    if (count <= 1) continue
    findings.push(
      makeFinding({
        domain: 'profile',
        code: 'PW_DUPLICATE_BUNDLE',
        severity: 'error',
        title: `bundle "${bundle}" is listed ${count} times in the profile`,
        subjects: [bundle, profile.name],
        confidence: 'high',
        evidence: [
          {
            source: 'profile-file',
            ref: `${profile.dir}/package.json`,
            summary: 'dsh.profile.bundles contains a duplicate entry',
          },
        ],
        fix: {
          kind: 'edit-patch',
          summary: 'remove the duplicate entry from dsh.profile.bundles',
          safe: false,
          requiresConsent: true,
        },
      }),
    )
  }

  // -- orphan / undeclared bundles ----------------------------------------
  const selected = new Set(profile.bundles)
  const declared = new Set(Object.keys(profile.dependencies))
  const installedNames = new Set(
    context.bundles
      .filter((bundle) => bundle.availability === 'profile' || bundle.installed)
      .map((bundle) => bundle.name),
  )
  for (const name of declared) {
    if (selected.has(name)) continue
    if (!installedNames.has(name)) continue
    findings.push(
      makeFinding({
        domain: 'profile',
        code: 'PW_ORPHAN_BUNDLE',
        severity: 'warn',
        title: `${name} is installed but not selected in this profile`,
        subjects: [name, profile.name],
        confidence: 'high',
        evidence: [
          {
            source: 'profile-file',
            ref: `${profile.dir}/package.json`,
            summary: 'dependency exists but dsh.profile.bundles does not select it',
          },
        ],
        fix: {
          kind: 'enable',
          summary: 'select the bundle if it is wanted, or remove the unused dependency',
          safe: false,
          requiresConsent: true,
        },
      }),
    )
  }
  for (const name of selected) {
    if (declared.has(name)) continue
    if (name.startsWith('@deepseek-ai/dsh-')) continue
    const info = context.bundles.find((bundle) => bundle.name === name)
    if (info?.official === true || info?.availability === 'installation') continue
    findings.push(
      makeFinding({
        domain: 'profile',
        code: 'PW_ORPHAN_BUNDLE',
        severity: 'warn',
        title: `${name} is selected but not declared as a profile dependency`,
        subjects: [name, profile.name],
        confidence: 'medium',
        evidence: [
          {
            source: 'profile-file',
            ref: `${profile.dir}/package.json`,
            summary: 'bundle is selected but absent from dependencies',
          },
        ],
        fix: {
          kind: 'edit-patch',
          summary: 'declare the dependency or remove the selection',
          safe: false,
          requiresConsent: true,
        },
      }),
    )
  }

  // -- profile patch vs bundle patch --------------------------------------
  const officialLayers = new Set(
    context.bundles
      .filter((bundle) => bundle.official || bundle.name.startsWith('@deepseek-ai/dsh-'))
      .map((bundle) => bundle.name),
  )
  const conflicts = findConfigConflicts(profile.patchRows, {
    skipLayer: (layer) =>
      !context.config.compatStrictOfficialOverrides && officialLayers.has(layer),
  }).filter(
    (conflict) =>
      conflict.layers.includes('profile') &&
      conflict.layers.some((layer) => layer !== 'profile' && layer !== 'home'),
  )
  for (const conflict of conflicts) {
    findings.push(
      makeFinding({
        domain: 'profile',
        code: 'PW_PATCH_CONFLICT',
        severity: 'warn',
        title: `profile patch overrides row "${conflict.id}" with a different configuration`,
        subjects: [conflict.id, profile.name],
        confidence: 'medium',
        evidence: [
          {
            source: 'profile-file',
            ref: `${profile.dir}/cordis.patch.yml`,
            summary: `layers ${conflict.layers.join(', ')} set different config values`,
          },
        ],
        fix: {
          kind: 'edit-patch',
          summary: 'confirm the override is intentional; align or remove one configuration',
          safe: false,
          requiresConsent: true,
        },
      }),
    )
  }

  // -- profile drift -------------------------------------------------------
  findings.push(...profileDrift(context))

  // -- compatibility.json warnings ---------------------------------------
  for (const warning of profile.compatibilityWarnings) {
    findings.push(
      makeFinding({
        domain: 'profile',
        code: 'PW_COMPAT_FILE_INVALID',
        severity: 'warn',
        title: 'compatibility.json contains records the reader rejected',
        subjects: [profile.name],
        confidence: 'high',
        evidence: [{ source: 'profile-file', ref: 'compatibility.json', summary: warning }],
        fix: {
          kind: 'edit-patch',
          summary: 'repair or remove the rejected records before changing exemptions',
          safe: false,
          requiresConsent: true,
        },
      }),
    )
  }

  // -- workspace instruction overlap --------------------------------------
  if (context.config.compatReadWorkspace && context.prompt !== undefined) {
    findings.push(...workspaceOverlap(context))
  }

  return findings
}

function profileDrift(context: CompatContext): CompatFinding[] {
  const findings: CompatFinding[] = []
  const profiles = context.profiles
  if (profiles.length <= 1) return findings

  const allBundles = new Set<string>()
  for (const profile of profiles) for (const bundle of profile.bundles) allBundles.add(bundle)

  for (const bundle of allBundles) {
    const present = profiles.filter((profile) => profile.bundles.includes(bundle)).map((profile) => profile.name)
    if (present.length === profiles.length) continue
    findings.push(
      makeFinding({
        domain: 'profile',
        code: 'PW_BUNDLE_DRIFT',
        severity: 'info',
        title: `${bundle} is selected in only some profiles`,
        subjects: [bundle, ...present],
        confidence: 'high',
        evidence: [
          {
            source: 'profile-file',
            ref: bundle,
            summary: `present in ${present.join(', ') || 'none'}; missing elsewhere`,
          },
        ],
        fix: {
          kind: 'none',
          summary: 'align the profiles only if the difference is unintended',
          safe: true,
          requiresConsent: false,
        },
      }),
    )
  }

  const versions = new Map<string, Set<string>>()
  for (const profile of profiles) {
    for (const [bundle, version] of Object.entries(profile.manifestVersions)) {
      if (version === undefined) continue
      const set = versions.get(bundle) ?? new Set<string>()
      set.add(version)
      versions.set(bundle, set)
    }
  }
  for (const [bundle, set] of versions) {
    if (set.size <= 1) continue
    findings.push(
      makeFinding({
        domain: 'profile',
        code: 'PW_VERSION_DRIFT',
        severity: 'warn',
        title: `${bundle} has different versions across profiles`,
        subjects: [bundle, ...profiles.map((profile) => profile.name)],
        confidence: 'medium',
        evidence: [
          {
            source: 'manifest',
            ref: bundle,
            summary: [...set].join(', '),
          },
        ],
        fix: {
          kind: 'update',
          summary: 'align the versions if the profiles should behave the same',
          safe: false,
          requiresConsent: true,
        },
      }),
    )
  }

  const exemptionKeys = new Set<string>()
  for (const profile of profiles) for (const key of Object.keys(profile.exemptions)) exemptionKeys.add(key)
  for (const key of exemptionKeys) {
    const values = new Set<string>()
    for (const profile of profiles) values.add(JSON.stringify(profile.exemptions[key] ?? []))
    if (values.size <= 1) continue
    findings.push(
      makeFinding({
        domain: 'profile',
        code: 'PW_EXEMPTION_DRIFT',
        severity: 'warn',
        title: `version exemption "${key}" differs across profiles`,
        subjects: [key, ...profiles.map((profile) => profile.name)],
        confidence: 'medium',
        evidence: [
          {
            source: 'profile-file',
            ref: 'compatibility.json',
            summary: profiles.map((profile) => `${profile.name}: ${JSON.stringify(profile.exemptions[key] ?? [])}`).join('; '),
          },
        ],
        fix: {
          kind: 'edit-patch',
          summary: 'align or intentionally separate the exemption per profile',
          safe: false,
          requiresConsent: true,
        },
      }),
    )
  }

  return findings
}

function workspaceOverlap(context: CompatContext): CompatFinding[] {
  const findings: CompatFinding[] = []
  const sections = [...(context.prompt?.sections ?? []), ...(context.prompt?.contexts ?? [])]
  const pluginParagraphs: Array<{ section: string; normalized: string; shingles: Set<string> }> = []
  for (const section of sections.slice(0, 200)) {
    for (const paragraph of splitParagraphs(section.text).slice(0, 10)) {
      const normalized = normalizeLine(paragraph)
      if (normalized.length < 30) continue
      pluginParagraphs.push({
        section: section.name,
        normalized,
        shingles: shingles(wordTokens(paragraph), 3),
      })
    }
  }
  if (pluginParagraphs.length === 0) return findings

  for (const instruction of context.workspace.instructions.slice(0, 10)) {
    for (const paragraph of splitParagraphs(instruction.text).slice(0, 40)) {
      const normalized = normalizeLine(paragraph)
      if (normalized.length < 30) continue
      const instructionShingles = shingles(wordTokens(paragraph), 3)
      for (const pluginParagraph of pluginParagraphs) {
        const exact = normalized === pluginParagraph.normalized
        const similarity = exact ? 1 : jaccard(instructionShingles, pluginParagraph.shingles)
        if (similarity < 0.8) continue
        findings.push(
          makeFinding({
            domain: 'workspace',
            code: 'PW_WORKSPACE_RULE_OVERLAP',
            severity: 'info',
            title: 'workspace instruction overlaps a plugin prompt section',
            subjects: [instruction.file, pluginParagraph.section],
            confidence: 'low',
            evidence: [
              {
                source: 'prompt',
                ref: `${instruction.file} ↔ ${pluginParagraph.section}`,
                summary: `similarity ${similarity.toFixed(2)}`,
              },
            ],
            fix: {
              kind: 'none',
              summary: 'keep one authoritative rule source if the overlap is intentional',
              safe: true,
              requiresConsent: false,
            },
          }),
        )
        if (findings.length >= 20) return findings
      }
    }
  }
  return findings
}
