/** Shared JSON-safe value types. */
export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue }
export type JsonObject = { [key: string]: JsonValue }

/** Installed plugin forms supported by DSH scaffolds. */
export type PluginForm = 'pure' | 'bundle' | 'bundle-client'

/** Coarse task classification used by the trim scorer. */
export type TaskTag =
  | 'bugfix'
  | 'feature'
  | 'review'
  | 'docs'
  | 'release'
  | 'report'
  | 'research'
  | 'unknown'

/** Hard compatibility status derived from pluginManager/app-boot signals. */
export type GuardStatus = 'ok' | 'warn' | 'incompatible' | 'protected' | 'unknown'

/** One explainable reason behind a suggestion. */
export interface Evidence {
  kind:
    | 'task-match'
    | 'usage'
    | 'overlap'
    | 'cost'
    | 'guard'
    | 'user-pref'
    | 'context'
    | 'compat'
  summary: string
  weight: number
}

/** Detected task plus the evidence that produced it. */
export interface TaskProfile {
  tag: TaskTag
  confidence: number
  keywords: string[]
  evidence: Evidence[]
  source: 'explicit' | 'session' | 'goal' | 'heuristic' | 'unknown'
}

/** A capability seam a workflow step can bind to. */
export interface CapabilitySeam {
  id: string
  name: string
  purpose: string
  /** Model-facing tool names that implement the seam. Empty for model-only capabilities. */
  tools: string[]
  trigger: 'manual' | 'schedule' | 'event'
  permissions: string[]
  needsConfirm: boolean
  keywords: string[]
  /** Tool package names for the minimum plugin set. */
  pluginIds: string[]
  /** True for a reasoning-only step that needs no tool. */
  modelOnly?: boolean
}

/** Usage aggregate for one plugin or tool owner. */
export interface UsageStats {
  calls: number
  successes: number
  lastUsedAt?: string
  sessionCalls: number
}

/** One appended usage observation. No arguments or content are stored. */
export interface UsageLine {
  t: string
  n: string
  ok: boolean
}

/** One audit record. Summaries only; never conversation text. */
export interface AuditRecord {
  t: string
  actor: 'trim' | 'recipe' | 'user'
  action: string
  subject: string
  result: 'ok' | 'fail' | 'skipped'
  summary: string
  metrics?: Record<string, number>
}

/** A normalized bundle view used by scan/scoring. */
export interface BundleProfile {
  name: string
  version?: string
  description?: string
  enabled: boolean
  installed: boolean
  availability: string
  official: boolean
  optional: boolean
  removable: boolean
  readOnlyReason?: string
  guardStatus: GuardStatus
  rowModuleNames: string[]
  contextTokens: number
  usage: UsageStats
  protected: boolean
  findings: CompatFinding[]
}

/** A normalized Loader entry view used by scan/scoring. */
export interface PluginProfile {
  entryId: string
  moduleName: string
  bundleName?: string
  enabled: boolean
  fiberPhase: string | null
  diagnostic?: string
  patchId?: string
  readOnlyReason?: string
  guardStatus: GuardStatus
  contextTokens: number
  usage: UsageStats
  protected: boolean
  findings: CompatFinding[]
}

/** A duplicate-context group found in assembled prompt sections. */
export interface DedupeGroup {
  fingerprint: string
  members: DedupeMember[]
  authority: string
  conflict: boolean
  reason: string
  excerpt?: string
}

export interface DedupeMember {
  section: string
  owner?: string
  textLength: number
}

/** One suggestion item in a slim profile draft. */
export interface SlimItem {
  /** `bundle:<name>` or `entry:<entryId>` */
  id: string
  kind: 'bundle' | 'entry'
  name: string
  bundleName?: string
  action: 'keep' | 'enable' | 'suggest-disable' | 'disable-if-unused' | 'review'
  risk: 'low' | 'medium' | 'high'
  score: number
  evidence: Evidence[]
  observedEnabled: boolean
  protected: boolean
  reason: string
  findings: CompatFinding[]
}

/** A local, reversible plugin-enablement plan. Not a DSH profile directory. */
export interface SlimProfile {
  schemaVersion: 1
  id: string
  createdAt: string
  task: TaskProfile
  mode: 'advise' | 'auto-safe'
  items: SlimItem[]
  dedupe: DedupeGroup[]
  summary: {
    keep: number
    enable: number
    disable: number
    review: number
    protected: number
  }
  status: 'draft' | 'applied' | 'partial' | 'rolled-back'
}

/** One item in a snapshot taken before applying a slim profile. */
export interface ApplySnapshotItem {
  id: string
  kind: 'bundle' | 'entry'
  name: string
  previousEnabled: boolean
  desiredEnabled: boolean
  status: 'pending' | 'applied' | 'skipped' | 'failed'
  application?: string
  error?: string
}

/** Crash-safe snapshot of one apply operation. */
export interface ApplySnapshot {
  schemaVersion: 1
  token: string
  profileId: string
  /** DSH profile name, used to scope default rollback to the current profile. */
  profileName?: string
  createdAt: string
  status: 'pending' | 'applied' | 'partial' | 'rolled-back'
  items: ApplySnapshotItem[]
}

export interface ApplyItemResult {
  id: string
  kind: 'bundle' | 'entry'
  name: string
  status: 'applied' | 'applied-pending-restart' | 'skipped' | 'failed' | 'stale' | 'blocked-by-compat'
  application?: string
  error?: string
  fixKind?: 'conflict' | 'workaround'
}

export interface ApplyResult {
  profileId: string
  token?: string
  items: ApplyItemResult[]
  rolledBack?: boolean
  restartRequired?: boolean
}

export interface RollbackItemResult {
  id: string
  kind: 'bundle' | 'entry'
  name: string
  status: 'restored' | 'already-restored' | 'skipped' | 'externally-changed' | 'failed'
  error?: string
}

export interface RollbackResult {
  token: string
  items: RollbackItemResult[]
}

/** One workflow step in a plan produced by the recipe layer. */
export interface WorkflowStep {
  id: string
  intent: string
  kind: 'tool' | 'model' | 'human' | 'schedule'
  capabilityId: string | null
  toolNames: string[]
  pluginIds: string[]
  dependsOn: string[]
  needsConfirm: boolean
  inputs: string[]
  outputs: string[]
  onFailure: string
}

/** Wizard answers. Every field beyond `goal` is optional. */
export interface WizardAnswers {
  goal: string
  scope?: string
  frequency?: string
  sources?: string[]
  outputFormat?: string
  delivery?: string
  onFailure?: string
  acceptance?: string[]
}

/** One wizard question, with defaults the model can confirm or correct. */
export interface WizardQuestion {
  step: 'scope-frequency' | 'sources' | 'output-delivery' | 'failure-acceptance'
  question: string
  defaults: string[]
  allowSkip: boolean
  fields: (keyof WizardAnswers)[]
}

/** A validated, exportable workflow blueprint. */
export interface WorkflowBlueprint {
  schemaVersion: 1
  id: string
  createdAt: string
  goal: string
  template: 'weekly-report' | 'generic'
  answers: WizardAnswers
  steps: WorkflowStep[]
  minPluginSet: string[]
  suggestedDisable: string[]
  permissions: string[]
  failurePolicy: string
  acceptance: string[]
  rollback: string
  uncertainties: string[]
}

export interface ValidationIssue {
  level: 'error' | 'warn'
  code: string
  message: string
  stepId?: string
  fix?: string
}

/** Compatibility analysis domain. */
export type CompatDomain = 'plugin-plugin' | 'plugin-runtime' | 'profile' | 'workspace'

/** Compatibility severity. */
export type CompatSeverity = 'error' | 'warn' | 'info'

export interface CompatEvidence {
  source:
    | 'manifest'
    | 'loader'
    | 'plugin-manager'
    | 'prompt'
    | 'profile-file'
    | 'lockfile'
    | 'runtime'
  summary: string
  ref?: string
}

export interface CompatFix {
  kind:
    | 'disable'
    | 'enable'
    | 'update'
    | 'exemption'
    | 'reorder'
    | 'edit-patch'
    | 'rename'
    | 'none'
  summary: string
  safe: boolean
  target?: string
  requiresConsent: boolean
}

export interface CompatFinding {
  id: string
  domain: CompatDomain
  code: string
  severity: CompatSeverity
  title: string
  subjects: string[]
  evidence: CompatEvidence[]
  confidence: 'high' | 'medium' | 'low'
  fix?: CompatFix
  autoApplicable: boolean
}

export interface ProfileCompatSummary {
  name: string
  dir: string
  bundles: string[]
  versions: Record<string, string | undefined>
  exemptions: Record<string, string[]>
  compatibilityWarnings: string[]
  findings: CompatFinding[]
}

export interface WorkspaceCompatSummary {
  cwd: string
  instructionFiles: string[]
  mcpEntries: string[]
  findings: CompatFinding[]
}

export interface CompatReport {
  schemaVersion: 1
  generatedAt: string
  runtime: {
    dshVersion: string
    nodeVersion: string
    platform: string
    arch: string
  }
  profile: {
    name: string
    dir: string
    bundles: string[]
  }
  findings: CompatFinding[]
  summary: {
    error: number
    warn: number
    info: number
    byDomain: Record<CompatDomain, number>
  }
  profiles: ProfileCompatSummary[]
  workspaces: WorkspaceCompatSummary[]
  diagnostics: string[]
  truncated?: boolean
  totalFindings?: number
}
