import type { CompatFinding } from 'dsh-shared-meta'
import type { CompatContext } from './model.ts'
import { makeFinding } from './finding.ts'
import {
  checkNodeEngine,
  checkPlatform,
  evaluateCompatibility,
} from './runtime-check.ts'
import { rootPackageName } from './manifests.ts'

const INCOMPATIBLE_DIAGNOSTIC_RE = /incompatib|version requirement|peer dependenc/i

/** Plugin ↔ DSH runtime, Node, platform, exemptions, and duplicate DSH copies. */
export async function runRuntimeRules(context: CompatContext): Promise<CompatFinding[]> {
  const findings: CompatFinding[] = []
  const selected = new Set(context.profile.bundles.map((name) => rootPackageName(name)))

  for (const bundle of context.bundles) {
    const name = rootPackageName(bundle.name)
    const manifest = context.manifests.get(name)
    const subjects = [name]

    if (manifest === undefined) {
      if (bundle.error?.incompatible !== undefined && bundle.error.incompatible.length > 0) {
        for (const incompatible of bundle.error.incompatible) {
          findings.push(
            makeFinding({
              domain: 'plugin-runtime',
              code: 'RT_PREFLIGHT_DENIED',
              severity: 'error',
              title: `${incompatible.name} was denied by the DSH compatibility preflight`,
              subjects: [incompatible.name],
              confidence: 'high',
              evidence: [
                {
                  source: 'plugin-manager',
                  ref: `${incompatible.name}@${incompatible.version}`,
                  summary: `requires ${JSON.stringify(incompatible.requirements)} on dsh ${incompatible.runtimeVersion}`,
                },
              ],
              fix: {
                kind: 'update',
                summary: 'update the plugin or DSH, or grant an exact-version exemption after accepting the risk',
                safe: false,
                requiresConsent: true,
              },
            }),
          )
        }
      }
      if (bundle.error?.code === 'unsupported-platform') {
        findings.push(
          makeFinding({
            domain: 'plugin-runtime',
            code: 'RT_PLATFORM_UNSUPPORTED',
            severity: 'error',
            title: `${name} does not support this platform`,
            subjects,
            confidence: 'high',
            evidence: [
              {
                source: 'plugin-manager',
                ref: name,
                summary: `bundle reports unsupported-platform for ${context.runtime.platform}`,
              },
            ],
            fix: {
              kind: 'disable',
              summary: 'disable the optional bundle on this platform',
              safe: true,
              target: name,
              requiresConsent: true,
            },
          }),
        )
      }
      if (
        (bundle.enabled || bundle.installed) &&
        bundle.error?.code !== 'unsupported-platform' &&
        !(bundle.error?.incompatible?.length)
      ) {
        findings.push(
          makeFinding({
            domain: 'plugin-runtime',
            code: 'RT_MANIFEST_UNAVAILABLE',
            severity: 'info',
            title: `${name} manifest could not be resolved`,
            subjects,
            confidence: 'low',
            evidence: [
              {
                source: 'manifest',
                ref: name,
                summary: 'runtime manifest checks were skipped for this bundle',
              },
            ],
            fix: { kind: 'none', summary: 'no action; manifest resolution is best-effort', safe: true, requiresConsent: false },
          }),
        )
      }
      continue
    }

    const issue = await evaluateCompatibility(
      manifest,
      context.profile.exemptions,
      context.runtime.dshVersion,
      name,
      bundle.version,
    )
    if (issue !== undefined) {
      for (const [requirement, range] of Object.entries(issue.requirements)) {
        const isEngine = requirement === 'engines.dsh'
        if (issue.exempted) {
          findings.push(
            makeFinding({
              domain: 'plugin-runtime',
              code: 'RT_EXEMPTION_ACTIVE',
              severity: 'warn',
              title: `${issue.name}@${issue.version} runs under an exact-version exemption`,
              subjects: [issue.name],
              confidence: 'high',
              evidence: [
                {
                  source: 'plugin-manager',
                  ref: `${issue.name}@${issue.version}`,
                  summary: `${requirement} ${range} does not match dsh ${issue.runtimeVersion}; exemption is active`,
                },
              ],
              fix: {
                kind: 'update',
                summary: 'prefer updating the plugin; keep the exemption only as an informed risk',
                safe: false,
                requiresConsent: true,
              },
            }),
          )
        } else {
          findings.push(
            makeFinding({
              domain: 'plugin-runtime',
              code: isEngine ? 'RT_ENGINE_UNMET' : 'RT_PEER_UNMET',
              severity: 'error',
              title: `${issue.name}@${issue.version} is incompatible with dsh ${issue.runtimeVersion}`,
              subjects: [issue.name],
              confidence: 'high',
              evidence: [
                {
                  source: 'manifest',
                  ref: `${issue.name}@${issue.version}`,
                  summary: `${requirement} ${range} does not match dsh ${issue.runtimeVersion}`,
                },
              ],
              fix: {
                kind: 'update',
                summary: 'update the plugin or DSH; an exact-version exemption requires explicit risk acceptance',
                safe: false,
                requiresConsent: true,
              },
            }),
          )
        }
      }
    }

    const nodeRange = checkNodeEngine(manifest, context.runtime.nodeVersion)
    if (nodeRange !== undefined) {
      findings.push(
        makeFinding({
          domain: 'plugin-runtime',
          code: 'RT_NODE_UNMET',
          severity: 'error',
          title: `${name} does not support Node ${context.runtime.nodeVersion}`,
          subjects,
          confidence: 'high',
          evidence: [
            {
              source: 'manifest',
              ref: name,
              summary: `engines.node ${nodeRange} does not match Node ${context.runtime.nodeVersion}`,
            },
          ],
          fix: {
            kind: 'update',
            summary: 'switch Node or update the plugin',
            safe: false,
            requiresConsent: true,
          },
        }),
      )
    }

    const platforms = checkPlatform(manifest, context.runtime.platform)
    if (platforms !== undefined) {
      findings.push(
        makeFinding({
          domain: 'plugin-runtime',
          code: 'RT_PLATFORM_UNSUPPORTED',
          severity: 'error',
          title: `${name} does not support ${context.runtime.platform}`,
          subjects,
          confidence: 'high',
          evidence: [
            {
              source: 'manifest',
              ref: name,
              summary: `dsh.bundle.platforms ${JSON.stringify(platforms)} excludes ${context.runtime.platform}`,
            },
          ],
          fix: {
            kind: 'disable',
            summary: 'disable the optional bundle on this platform',
            safe: true,
            target: name,
            requiresConsent: true,
          },
        }),
      )
    }
  }

  // A preflight denial can also surface as a failed entry diagnostic.
  for (const entry of context.entriesInfo) {
    if (typeof entry.diagnostic !== 'string') continue
    if (!INCOMPATIBLE_DIAGNOSTIC_RE.test(entry.diagnostic)) continue
    if (!/incompatible/i.test(entry.diagnostic)) continue
    findings.push(
      makeFinding({
        domain: 'plugin-runtime',
        code: 'RT_PREFLIGHT_DENIED',
        severity: 'error',
        title: `${entry.moduleName} was denied by the compatibility preflight`,
        subjects: [entry.moduleName],
        confidence: 'medium',
        evidence: [
          {
            source: 'plugin-manager',
            ref: entry.entryId,
            summary: entry.diagnostic,
          },
        ],
        fix: {
          kind: 'update',
          summary: 'update the plugin/DSH or grant an exact-version exemption after accepting the risk',
          safe: false,
          requiresConsent: true,
        },
      }),
    )
  }

  // Active exemptions for currently selected bundles.
  for (const [key, versions] of Object.entries(context.profile.exemptions)) {
    const separator = key.lastIndexOf('@')
    if (separator <= 0) continue
    const name = key.slice(0, separator)
    if (!selected.has(name)) continue
    findings.push(
      makeFinding({
        domain: 'plugin-runtime',
        code: 'RT_EXEMPTION_ACTIVE',
        severity: 'warn',
        title: `${key} has an exact-version exemption`,
        subjects: [name],
        confidence: 'high',
        evidence: [
          {
            source: 'profile-file',
            ref: 'compatibility.json',
            summary: `exemption allows dsh ${versions.join(', ')}`,
          },
        ],
        fix: {
          kind: 'update',
          summary: 'prefer a compatible plugin version; the exemption is an informed risk',
          safe: false,
          requiresConsent: true,
        },
      }),
    )
  }

  if (context.config.compatReadLockfile) {
    if (context.lockfile === undefined) {
      findings.push(
        makeFinding({
          domain: 'plugin-runtime',
          code: 'RT_LOCKFILE_UNAVAILABLE',
          severity: 'info',
          title: 'pnpm-lock.yaml is unavailable',
          subjects: [context.profile.name],
          confidence: 'high',
          evidence: [
            {
              source: 'lockfile',
              ref: context.profile.dir,
              summary: 'duplicate package version analysis was skipped',
            },
          ],
          fix: { kind: 'none', summary: 'no action', safe: true, requiresConsent: false },
        }),
      )
    } else {
      for (const [name, versions] of Object.entries(context.lockfile.dshVersions)) {
        if (versions.length <= 1) continue
        findings.push(
          makeFinding({
            domain: 'plugin-runtime',
            code: 'RT_DUPLICATE_DSH_COPIES',
            severity: 'warn',
            title: `multiple DSH copies of ${name} are installed`,
            subjects: [name],
            confidence: 'high',
            evidence: [
              {
                source: 'lockfile',
                ref: context.lockfile.path,
                summary: `versions ${versions.join(', ')}`,
              },
            ],
            fix: {
              kind: 'update',
              summary: 'deduplicate with pnpm overrides or align the affected plugins',
              safe: false,
              requiresConsent: true,
            },
          }),
        )
      }
    }
  }

  return findings
}
