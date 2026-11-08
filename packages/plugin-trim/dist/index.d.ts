import z from "@deepseek-ai/schemastery";
import { Context } from "@deepseek-ai/cordis";
/** Deployment configuration for the trim plugin. */
export interface Config {
  /** `advise` keeps every suggestion advisory; `auto-safe` only narrows the suggestion set. */
  mode: 'advise' | 'auto-safe';
  /** Extra package names or entry ids that must never be suggested for disable. */
  protect: string[];
  /** Packages the user explicitly pinned; never suggested for disable. */
  pinned: string[];
  /** Observe `tools/result` and keep a local tool-name usage ledger. */
  trackUsage: boolean;
  /** Usage retention window in days. */
  usageRetentionDays: number;
  /** Maximum retained slim-profile drafts and snapshots. */
  maxDrafts: number;
  /** Include cross-plugin prompt-section dedupe suggestions. */
  enableDedupe: boolean;
  /** Persist a short dedupe excerpt locally; off by default. */
  persistExcerpts: boolean;
  /** Non-CJK characters per token used for cost estimates. */
  tokenRatio: number;
  /** Extra tool name to owning package mapping. */
  toolOwners: Record<string, string>;
  /** Enable compatibility analysis. */
  compatEnabled: boolean;
  /** Scan other profiles under $DSH_HOME/profiles. */
  compatScanAllProfiles: boolean;
  /** Maximum profiles to scan. */
  compatMaxProfiles: number;
  /** Include info findings in the Markdown report (JSON always keeps them). */
  compatIncludeInfo: boolean;
  /** Maximum findings in one report. */
  compatMaxFindings: number;
  /** Parse pnpm-lock.yaml for duplicate package versions. */
  compatReadLockfile: boolean;
  /** Read workspace AGENTS.md/CLAUDE.md and compare with plugin prompt rules. */
  compatReadWorkspace: boolean;
  /** Report conflicts between official bundles' intentional row overrides. */
  compatStrictOfficialOverrides: boolean;
  /** In-memory compatibility report cache TTL. */
  compatCacheTtlMs: number;
}
/** Schemastery configuration for the trim plugin. */
export declare const Config: z<Config>;
/** Installed plugin forms supported by DSH scaffolds. */
type PluginForm = 'pure' | 'bundle' | 'bundle-client';
/** Coarse task classification used by the trim scorer. */
type TaskTag = 'bugfix' | 'feature' | 'review' | 'docs' | 'release' | 'report' | 'research' | 'unknown';
/** Hard compatibility status derived from pluginManager/app-boot signals. */
type GuardStatus = 'ok' | 'warn' | 'incompatible' | 'protected' | 'unknown';
/** One explainable reason behind a suggestion. */
interface Evidence {
  kind: 'task-match' | 'usage' | 'overlap' | 'cost' | 'guard' | 'user-pref' | 'context' | 'compat';
  summary: string;
  weight: number;
}
/** Detected task plus the evidence that produced it. */
interface TaskProfile {
  tag: TaskTag;
  confidence: number;
  keywords: string[];
  evidence: Evidence[];
  source: 'explicit' | 'session' | 'goal' | 'heuristic' | 'unknown';
}
/** Usage aggregate for one plugin or tool owner. */
interface UsageStats {
  calls: number;
  successes: number;
  lastUsedAt?: string;
  sessionCalls: number;
}
/** A normalized bundle view used by scan/scoring. */
interface BundleProfile {
  name: string;
  version?: string;
  description?: string;
  enabled: boolean;
  installed: boolean;
  availability: string;
  official: boolean;
  optional: boolean;
  removable: boolean;
  readOnlyReason?: string;
  guardStatus: GuardStatus;
  rowModuleNames: string[];
  contextTokens: number;
  usage: UsageStats;
  protected: boolean;
  findings: CompatFinding[];
}
/** A normalized Loader entry view used by scan/scoring. */
interface PluginProfile {
  entryId: string;
  moduleName: string;
  bundleName?: string;
  enabled: boolean;
  fiberPhase: string | null;
  diagnostic?: string;
  patchId?: string;
  readOnlyReason?: string;
  guardStatus: GuardStatus;
  contextTokens: number;
  usage: UsageStats;
  protected: boolean;
  findings: CompatFinding[];
}
/** A duplicate-context group found in assembled prompt sections. */
interface DedupeGroup {
  fingerprint: string;
  members: DedupeMember[];
  authority: string;
  conflict: boolean;
  reason: string;
  excerpt?: string;
}
interface DedupeMember {
  section: string;
  owner?: string;
  textLength: number;
}
/** One suggestion item in a slim profile draft. */
interface SlimItem {
  /** `bundle:<name>` or `entry:<entryId>` */
  id: string;
  kind: 'bundle' | 'entry';
  name: string;
  bundleName?: string;
  action: 'keep' | 'enable' | 'suggest-disable' | 'disable-if-unused' | 'review';
  risk: 'low' | 'medium' | 'high';
  score: number;
  evidence: Evidence[];
  observedEnabled: boolean;
  protected: boolean;
  reason: string;
  findings: CompatFinding[];
}
/** A local, reversible plugin-enablement plan. Not a DSH profile directory. */
interface SlimProfile {
  schemaVersion: 1;
  id: string;
  createdAt: string;
  task: TaskProfile;
  mode: 'advise' | 'auto-safe';
  items: SlimItem[];
  dedupe: DedupeGroup[];
  summary: {
    keep: number;
    enable: number;
    disable: number;
    review: number;
    protected: number;
  };
  status: 'draft' | 'applied' | 'partial' | 'rolled-back';
}
interface ApplyItemResult {
  id: string;
  kind: 'bundle' | 'entry';
  name: string;
  status: 'applied' | 'applied-pending-restart' | 'skipped' | 'failed' | 'stale' | 'blocked-by-compat';
  application?: string;
  error?: string;
  fixKind?: 'conflict' | 'workaround';
}
interface ApplyResult {
  profileId: string;
  token?: string;
  items: ApplyItemResult[];
  rolledBack?: boolean;
  restartRequired?: boolean;
}
interface RollbackItemResult {
  id: string;
  kind: 'bundle' | 'entry';
  name: string;
  status: 'restored' | 'already-restored' | 'skipped' | 'externally-changed' | 'failed';
  error?: string;
}
interface RollbackResult {
  token: string;
  items: RollbackItemResult[];
}
/** Compatibility analysis domain. */
type CompatDomain = 'plugin-plugin' | 'plugin-runtime' | 'profile' | 'workspace';
/** Compatibility severity. */
type CompatSeverity = 'error' | 'warn' | 'info';
interface CompatEvidence {
  source: 'manifest' | 'loader' | 'plugin-manager' | 'prompt' | 'profile-file' | 'lockfile' | 'runtime';
  summary: string;
  ref?: string;
}
interface CompatFix {
  kind: 'disable' | 'enable' | 'update' | 'exemption' | 'reorder' | 'edit-patch' | 'rename' | 'none';
  summary: string;
  safe: boolean;
  target?: string;
  requiresConsent: boolean;
}
interface CompatFinding {
  id: string;
  domain: CompatDomain;
  code: string;
  severity: CompatSeverity;
  title: string;
  subjects: string[];
  evidence: CompatEvidence[];
  confidence: 'high' | 'medium' | 'low';
  fix?: CompatFix;
  autoApplicable: boolean;
}
interface ProfileCompatSummary {
  name: string;
  dir: string;
  bundles: string[];
  versions: Record<string, string | undefined>;
  exemptions: Record<string, string[]>;
  compatibilityWarnings: string[];
  findings: CompatFinding[];
}
interface WorkspaceCompatSummary {
  cwd: string;
  instructionFiles: string[];
  mcpEntries: string[];
  findings: CompatFinding[];
}
interface CompatReport {
  schemaVersion: 1;
  generatedAt: string;
  runtime: {
    dshVersion: string;
    nodeVersion: string;
    platform: string;
    arch: string;
  };
  profile: {
    name: string;
    dir: string;
    bundles: string[];
  };
  findings: CompatFinding[];
  summary: {
    error: number;
    warn: number;
    info: number;
    byDomain: Record<CompatDomain, number>;
  };
  profiles: ProfileCompatSummary[];
  workspaces: WorkspaceCompatSummary[];
  diagnostics: string[];
  truncated?: boolean;
  totalFindings?: number;
}
/** Minimal structural view of one plugin manifest. */
interface PluginManifest {
  name?: string;
  version?: string;
  engines?: Record<string, unknown>;
  peerDependencies?: Record<string, string>;
  dependencies?: Record<string, string>;
  dsh?: {
    bundle?: {
      patch?: string | string[];
      platforms?: string[];
    };
    client?: unknown;
  };
}
/** Minimal structural view of the plugin manager service. */
interface PluginManagerLike {
  listPlugins(): Promise<PluginInfoLike[]>;
  listBundles(): Promise<BundleInfoLike[]>;
  listVersionExemptions(): {
    exemptions: Record<string, string[]>;
    warnings: string[];
  };
  setPluginEnabled?(id: string, enabled: boolean): Promise<ChangeResultLike>;
  setBundleEnabled?(name: string, enabled: boolean): Promise<ChangeResultLike>;
}
/** Minimal structural view of a plugin-manager change result. */
interface ChangeResultLike {
  changed: boolean;
  application: 'applied' | 'restart-required' | 'overridden' | 'failed' | 'cancelled';
  restartReason?: string;
  error?: {
    code?: string;
    diagnostic?: string;
  };
}
interface PluginInfoLike {
  entryId: string;
  moduleName: string;
  enabled: boolean;
  fiberPhase: string | null;
  diagnostic?: string;
  patchId?: string;
  readOnlyReason?: string;
}
interface BundleInfoLike {
  name: string;
  version?: string;
  description?: string;
  enabled: boolean;
  installed: boolean;
  availability: string;
  official: boolean;
  optional: boolean;
  removable: boolean;
  readOnlyReason?: string;
  error?: {
    code?: string;
    diagnostic?: string;
    incompatible?: Array<{
      name: string;
      version: string;
      runtimeVersion: string;
      requirements: Record<string, string>;
    }>;
  };
  rows: Array<{
    rowId: string;
    moduleName: string;
    entryId?: string;
  }>;
  overrides: string[];
}
/** Minimal structural view of the plugin inventory gateway. */
interface PluginInventoryLike {
  list(): Promise<PluginInventorySnapshotLike>;
}
interface PluginInventorySnapshotLike {
  managementAvailable?: boolean;
  entries: Array<{
    entryId: string;
    moduleName: string;
    enabled: boolean;
    fiberPhase: string | null;
    diagnostic?: string;
  }>;
  agentPresets?: Array<{
    id: string;
    name?: string;
    isDefault: boolean;
    broken?: string;
    rows: Array<{
      entryId: string | null;
      moduleName: string;
      enabled: boolean | 'conditional';
      condition?: string;
      fiberPhase: string | null;
    }>;
  }>;
}
/** Minimal structural view of one loader entry. */
interface LoaderEntryLike {
  id: string;
  options: {
    id: string;
    name: string;
    config?: unknown;
    group?: boolean | null;
    disabled?: boolean | null;
    inject?: unknown;
  };
  disabled: boolean;
  fiber?: {
    state?: number;
    inject?: Record<string, unknown>;
    provisions?: Iterable<{
      name?: string;
    }>;
  };
  moduleNamespace?: unknown;
}
/** Minimal structural view of the loader service. */
interface LoaderLike {
  entries(): Iterable<LoaderEntryLike>;
}
/** A prompt assembly subset needed for overlap and cost attribution. */
interface PromptAssemblyLike {
  sections: Array<{
    name: string;
    text: string;
  }>;
  contexts: Array<{
    name: string;
    text: string;
  }>;
  tools: Array<{
    name: string;
    description?: string;
    parameters?: unknown;
  }>;
}
/** A prompt adapter, separate from Cordis so tests can fake it. */
interface PromptAdapterLike {
  assemble(agent?: unknown, toolSet?: unknown): Promise<PromptAssemblyLike | undefined>;
}
/** Runtime facts. */
interface CompatRuntimeInfo {
  dshVersion: string;
  nodeVersion: string;
  platform: string;
  arch: string;
}
/** One normalized loader/preset/MCP row. */
interface LoaderEntrySnapshot {
  id: string;
  parentId: string | null;
  depth: number;
  moduleName: string;
  pluginName?: string;
  enabled: boolean;
  group: boolean;
  fiberState: 'pending' | 'loading' | 'active' | 'failed' | 'unloading' | null;
  diagnostic?: string;
  provide: string[];
  inject: string[];
  config?: unknown;
  source: 'loader' | 'preset' | 'mcp';
  presetId?: string;
  mcpServerName?: string;
}
/** One parsed patch-layer row. */
interface PatchLayerRow {
  layer: string;
  id: string;
  name?: string;
  disabled?: boolean | JsSentinel;
  config?: unknown;
  sourceFile: string;
}
interface JsSentinel {
  __js: string;
}
/** Lockfile summary. */
interface LockfileSummary {
  path: string;
  packageVersions: Record<string, string[]>;
  dshVersions: Record<string, string[]>;
  parseError?: string;
}
/** One profile's raw facts. */
interface ProfileRaw {
  name: string;
  dir: string;
  bundles: string[];
  dependencies: Record<string, string>;
  patchRows: PatchLayerRow[];
  exemptions: Record<string, string[]>;
  compatibilityWarnings: string[];
  compatibilityRewritable: boolean;
  manifestVersions: Record<string, string | undefined>;
}
/** Workspace facts. */
interface WorkspaceRaw {
  cwd: string;
  instructionFiles: string[];
  instructions: Array<{
    file: string;
    text: string;
  }>;
}
/** Configuration subset relevant to compatibility analysis. */
interface CompatConfigLike {
  compatEnabled: boolean;
  compatScanAllProfiles: boolean;
  compatMaxProfiles: number;
  compatIncludeInfo: boolean;
  compatMaxFindings: number;
  compatReadLockfile: boolean;
  compatReadWorkspace: boolean;
  compatStrictOfficialOverrides: boolean;
  compatCacheTtlMs: number;
  toolOwners: Record<string, string>;
}
/** Everything the compatibility rules need. */
interface CompatContext {
  runtime: CompatRuntimeInfo;
  config: CompatConfigLike;
  profile: {
    name: string;
    dir: string;
    bundles: string[];
    dependencies: Record<string, string>;
    patchRows: PatchLayerRow[];
    exemptions: Record<string, string[]>;
    compatibilityWarnings: string[];
    compatibilityRewritable: boolean;
  };
  loaderEntries: LoaderEntrySnapshot[];
  bundles: BundleInfoLike[];
  entriesInfo: PluginInfoLike[];
  inventory?: PluginInventorySnapshotLike;
  manifests: Map<string, PluginManifest | undefined>;
  lockfile?: LockfileSummary;
  profiles: ProfileRaw[];
  workspace: WorkspaceRaw;
  prompt?: PromptAssemblyLike;
  diagnostics: string[];
}
/** Result of one analysis plus the report. */
interface CompatAnalysisResult {
  report: CompatReport;
  findings: CompatFinding[];
  context: CompatContext;
  markdown: string;
  reportPath?: string;
}
interface UsageLedgerOptions {
  path?: string;
  retentionDays?: number;
  maxBytes?: number;
  enabled?: boolean;
}
/** Append-only local usage ledger. Records tool names, success, and time only. */
declare class UsageLedger {
  readonly path: string;
  private readonly retentionDays;
  private readonly maxBytes;
  private readonly enabled;
  private buffer;
  private timer;
  private flushPromise;
  constructor(options?: UsageLedgerOptions);
  record(toolName: string, ok: boolean): void;
  flush(): Promise<void>;
  dispose(): Promise<void>;
  /** Aggregate retained lines by tool name. */
  aggregate(): Promise<Map<string, UsageStats>>;
  /** Add current-session tool calls to an aggregate without pretending to know success. */
  addSessionUsage(aggregate: Map<string, UsageStats>, toolNames: readonly string[]): Map<string, UsageStats>;
  private compactIfNeeded;
}
interface SectionCost {
  name: string;
  owner?: string;
  tokens: number;
  chars: number;
  source: 'section' | 'context';
}
interface ToolCost {
  name: string;
  owner?: string;
  tokens: number;
}
interface ScanResult {
  managementAvailable: boolean;
  compat: {
    summary: CompatAnalysisResult['report']['summary'];
    topFindings: CompatAnalysisResult['findings'];
    reportPath?: string;
  };
  bundles: BundleProfile[];
  entries: PluginProfile[];
  context: {
    totalTokens: number;
    byOwner: Record<string, number>;
    sections: SectionCost[];
    tools: ToolCost[];
    unattributedTokens: number;
  };
  presetModules: string[];
  usage: {
    byTool: Record<string, UsageStats>;
    byOwner: Record<string, UsageStats>;
  };
  dedupe: DedupeGroup[];
  diagnostics: string[];
}
interface ScanOptions {
  config: Config;
  compat: CompatAnalysisResult;
  pluginManager?: PluginManagerLike;
  inventory?: PluginInventorySnapshotLike;
  usageLedger?: UsageLedger;
  task?: TaskProfile;
  sessionToolNames?: string[];
  agent?: unknown;
}
/** Normalize plugin metadata, prompt costs, usage, and compat findings into one scan result. */
export declare function scanPlugins(options: ScanOptions): Promise<ScanResult>;
interface TaskInput {
  explicit?: TaskTag;
  goal?: string;
  agent?: unknown;
  messages?: Array<{
    role: string;
    content: unknown;
  }>;
  toolNames?: string[];
}
/** Detect the current task with explainable keyword/tool evidence. */
export declare function detectTask(input: TaskInput): TaskProfile;
interface DraftOptions {
  includeReview?: boolean;
  maxDisable?: number;
  mode?: Config['mode'];
}
/** Build a local, reversible slim-profile draft. Does not change plugin state. */
export declare function buildSlimProfile(scan: ScanResult, task: TaskProfile, config: Config, options?: DraftOptions): SlimProfile;
interface ApplyOptions {
  confirm: boolean;
  items?: string[];
  manager: PluginManagerLike;
  maxDrafts: number;
  findings?: readonly CompatFinding[];
  profileName?: string;
}
/** Apply low-risk items from a saved draft, with a crash-safe snapshot and automatic rollback. */
export declare function applySlimProfile(profileId: string, options: ApplyOptions): Promise<ApplyResult>;
interface RollbackOptions {
  token?: string;
  manager: PluginManagerLike;
  maxDrafts: number;
  profileName?: string;
}
/** Restore a previous apply snapshot, skipping state changed outside trim. */
export declare function rollbackSlimProfile(options: RollbackOptions): Promise<RollbackResult>;
type CompatScope = 'current' | 'profiles' | 'all';
interface AnalyzeOptions {
  scope?: CompatScope;
  includeInfo?: boolean;
  maxFindings?: number;
  writeReport?: boolean;
  force?: boolean;
  agent?: unknown;
  toolSet?: unknown;
}
/** Collect, analyze, render, and optionally persist a compatibility report. */
export declare function analyzeCompatibility(ctx: Context, config: CompatConfigLike, options?: AnalyzeOptions): Promise<CompatAnalysisResult>;
interface ReportOptions {
  includeInfo: boolean;
  maxFindings: number;
}
/** Run every compatibility rule against one collected context. */
export declare function runCompatibilityRules(context: CompatContext): Promise<CompatFinding[]>;
/** Build the serializable report. */
export declare function buildReport(context: CompatContext, findings: readonly CompatFinding[], options: ReportOptions): CompatReport;
/** Render a bounded Markdown matrix plus detailed findings. */
export declare function renderReport(report: CompatReport, options: ReportOptions): string;
interface CollectCompatOptions {
  profileName: string;
  profileDir: string;
  dshHome: string;
  cwd: string;
  bundleNames?: readonly string[];
  dependencies?: Record<string, string>;
  loader?: LoaderLike;
  pluginManager?: PluginManagerLike;
  inventory?: PluginInventoryLike;
  prompt?: PromptAdapterLike;
  agent?: unknown;
  toolSet?: unknown;
  config: CompatConfigLike;
  runtime?: Partial<CompatRuntimeInfo>;
}
/** Collect loader, plugin-manager, prompt, profile, lockfile, and workspace facts. */
export declare function collectCompatContext(options: CollectCompatOptions): Promise<CompatContext>;
export declare const name = "dsh-plugin-trim";
export declare const inject: string[];
/** Register trim tools and the local usage observer. */
export declare function apply(ctx: Context, config?: Partial<Config>): void;
export type { BundleInfoLike, ChangeResultLike, CompatAnalysisResult, CompatConfigLike, CompatContext, CompatRuntimeInfo, Config as TrimConfig, JsSentinel, LoaderEntryLike, LoaderEntrySnapshot, LoaderLike, LockfileSummary, PatchLayerRow, PluginForm, PluginInfoLike, PluginInventoryLike, PluginInventorySnapshotLike, PluginManagerLike, PluginManifest, ProfileRaw, PromptAdapterLike, PromptAssemblyLike, WorkspaceRaw };