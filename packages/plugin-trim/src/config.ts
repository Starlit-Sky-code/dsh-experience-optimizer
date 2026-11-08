import z from '@deepseek-ai/schemastery'

/** Deployment configuration for the trim plugin. */
export interface Config {
  /** `advise` keeps every suggestion advisory; `auto-safe` only narrows the suggestion set. */
  mode: 'advise' | 'auto-safe'
  /** Extra package names or entry ids that must never be suggested for disable. */
  protect: string[]
  /** Packages the user explicitly pinned; never suggested for disable. */
  pinned: string[]
  /** Observe `tools/result` and keep a local tool-name usage ledger. */
  trackUsage: boolean
  /** Usage retention window in days. */
  usageRetentionDays: number
  /** Maximum retained slim-profile drafts and snapshots. */
  maxDrafts: number
  /** Include cross-plugin prompt-section dedupe suggestions. */
  enableDedupe: boolean
  /** Persist a short dedupe excerpt locally; off by default. */
  persistExcerpts: boolean
  /** Non-CJK characters per token used for cost estimates. */
  tokenRatio: number
  /** Extra tool name to owning package mapping. */
  toolOwners: Record<string, string>
  /** Enable compatibility analysis. */
  compatEnabled: boolean
  /** Scan other profiles under $DSH_HOME/profiles. */
  compatScanAllProfiles: boolean
  /** Maximum profiles to scan. */
  compatMaxProfiles: number
  /** Include info findings in the Markdown report (JSON always keeps them). */
  compatIncludeInfo: boolean
  /** Maximum findings in one report. */
  compatMaxFindings: number
  /** Parse pnpm-lock.yaml for duplicate package versions. */
  compatReadLockfile: boolean
  /** Read workspace AGENTS.md/CLAUDE.md and compare with plugin prompt rules. */
  compatReadWorkspace: boolean
  /** Report conflicts between official bundles' intentional row overrides. */
  compatStrictOfficialOverrides: boolean
  /** In-memory compatibility report cache TTL. */
  compatCacheTtlMs: number
}

/** Defaults used when the loader starts the plugin without an explicit config. */
export const DEFAULT_CONFIG: Config = {
  mode: 'advise',
  protect: [],
  pinned: [],
  trackUsage: true,
  usageRetentionDays: 30,
  maxDrafts: 20,
  enableDedupe: true,
  persistExcerpts: false,
  tokenRatio: 3.5,
  toolOwners: {},
  compatEnabled: true,
  compatScanAllProfiles: true,
  compatMaxProfiles: 20,
  compatIncludeInfo: false,
  compatMaxFindings: 100,
  compatReadLockfile: true,
  compatReadWorkspace: true,
  compatStrictOfficialOverrides: false,
  compatCacheTtlMs: 30_000,
}

/** Merge a partial/undefined loader config over the defaults. */
export function normalizeConfig(config?: Partial<Config> | undefined): Config {
  return { ...DEFAULT_CONFIG, ...(config ?? {}) }
}

/** Schemastery configuration for the trim plugin. */
export const Config: z<Config> = z.object({
  mode: z.union(['advise', 'auto-safe']).default('advise'),
  protect: z.array(z.string()).default([]),
  pinned: z.array(z.string()).default([]),
  trackUsage: z.boolean().default(true),
  usageRetentionDays: z.natural().min(1).max(365).default(30),
  maxDrafts: z.natural().min(1).max(200).default(20),
  enableDedupe: z.boolean().default(true),
  persistExcerpts: z.boolean().default(false),
  tokenRatio: z.number().min(1).max(10).default(3.5),
  toolOwners: z.dict(z.string()).default({}),
  compatEnabled: z.boolean().default(true),
  compatScanAllProfiles: z.boolean().default(true),
  compatMaxProfiles: z.natural().min(1).max(100).default(20),
  compatIncludeInfo: z.boolean().default(false),
  compatMaxFindings: z.natural().min(1).max(500).default(100),
  compatReadLockfile: z.boolean().default(true),
  compatReadWorkspace: z.boolean().default(true),
  compatStrictOfficialOverrides: z.boolean().default(false),
  compatCacheTtlMs: z.natural().min(0).max(600_000).default(30_000),
})
