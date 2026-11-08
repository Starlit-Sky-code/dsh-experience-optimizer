import z from "@deepseek-ai/schemastery";
import { Context } from "@deepseek-ai/cordis";
/** Deployment configuration for the recipe plugin. */
export interface Config {
  /** Maximum workflow steps before a warning. */
  maxSteps: number;
  /** Allow exporting blueprints to the DSH data directory. */
  allowExport: boolean;
  /** Optional custom capability catalog JSON path; empty uses the default data path. */
  capabilitiesFile: string;
  /** Default delivery seam when the user does not name a send capability. */
  defaultDelivery: string;
}
export declare const Config: z<Config>;
/** A capability seam a workflow step can bind to. */
interface CapabilitySeam {
  id: string;
  name: string;
  purpose: string;
  /** Model-facing tool names that implement the seam. Empty for model-only capabilities. */
  tools: string[];
  trigger: 'manual' | 'schedule' | 'event';
  permissions: string[];
  needsConfirm: boolean;
  keywords: string[];
  /** Tool package names for the minimum plugin set. */
  pluginIds: string[];
  /** True for a reasoning-only step that needs no tool. */
  modelOnly?: boolean;
}
/** One workflow step in a plan produced by the recipe layer. */
interface WorkflowStep {
  id: string;
  intent: string;
  kind: 'tool' | 'model' | 'human' | 'schedule';
  capabilityId: string | null;
  toolNames: string[];
  pluginIds: string[];
  dependsOn: string[];
  needsConfirm: boolean;
  inputs: string[];
  outputs: string[];
  onFailure: string;
}
/** Wizard answers. Every field beyond `goal` is optional. */
interface WizardAnswers {
  goal: string;
  scope?: string;
  frequency?: string;
  sources?: string[];
  outputFormat?: string;
  delivery?: string;
  onFailure?: string;
  acceptance?: string[];
}
/** One wizard question, with defaults the model can confirm or correct. */
interface WizardQuestion {
  step: 'scope-frequency' | 'sources' | 'output-delivery' | 'failure-acceptance';
  question: string;
  defaults: string[];
  allowSkip: boolean;
  fields: (keyof WizardAnswers)[];
}
/** A validated, exportable workflow blueprint. */
interface WorkflowBlueprint {
  schemaVersion: 1;
  id: string;
  createdAt: string;
  goal: string;
  template: 'weekly-report' | 'generic';
  answers: WizardAnswers;
  steps: WorkflowStep[];
  minPluginSet: string[];
  suggestedDisable: string[];
  permissions: string[];
  failurePolicy: string;
  acceptance: string[];
  rollback: string;
  uncertainties: string[];
}
interface ValidationIssue {
  level: 'error' | 'warn';
  code: string;
  message: string;
  stepId?: string;
  fix?: string;
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
/** Built-in capability seams. Tools are checked against the current agent scope at planning time. */
export declare const BUILT_IN_CAPABILITIES: CapabilitySeam[];
interface CapabilityCatalog {
  capabilities: CapabilitySeam[];
  diagnostics: string[];
}
/** Load built-ins plus an optional user catalog from disk. */
export declare function loadCapabilities(path?: string): Promise<CapabilityCatalog>;
interface WizardOptions {
  forceBlueprint?: boolean;
}
/** Whether a goal looks like an automatable workflow rather than ordinary Q&A. */
export declare function isWorkflowGoal(goal: string): boolean;
/** Fill defaults for the fields the user has not answered. */
export declare function defaultsFor(goal: string, answers: WizardAnswers): WizardAnswers;
/** Return the next question group, or null when enough answers exist. */
export declare function nextQuestion(goal: string, answers: WizardAnswers, options?: WizardOptions): WizardQuestion | null;
interface TranslateOptions {
  available: Set<string>;
  suggestedDisable?: readonly string[];
}
/** Translate a business goal plus answers into a workflow blueprint. */
export declare function translateGoal(goal: string, answers: WizardAnswers, capabilities: readonly CapabilitySeam[], options: TranslateOptions): WorkflowBlueprint;
interface ValidateDeps {
  toolExists: (name: string) => boolean;
  pluginKnown: (name: string) => boolean;
  scheduleAvailable: boolean;
  maxSteps: number;
  capabilities: readonly CapabilitySeam[];
  compatFindings?: readonly CompatFinding[];
}
/** Validate a blueprint for dependencies, capabilities, permissions, failure handling, and compat. */
export declare function validateBlueprint(blueprint: WorkflowBlueprint, deps: ValidateDeps): ValidationIssue[];
/** Render a validation result as a compact Markdown report. */
export declare function renderValidation(issues: readonly ValidationIssue[]): string;
type ExportFormat = 'markdown' | 'json' | 'both';
interface ExportResult {
  id: string;
  markdownPath?: string;
  jsonPath?: string;
}
/** Write a blueprint to the DSH data directory. */
export declare function exportBlueprint(blueprint: WorkflowBlueprint, format?: ExportFormat): Promise<ExportResult>;
/** Render the human runbook plus a machine-readable JSON block. */
export declare function renderBlueprintMarkdown(blueprint: WorkflowBlueprint): string;
export declare const name = "dsh-plugin-recipe";
export declare const inject: string[];
/** Register the workflow planner tools. */
export declare function apply(ctx: Context, config?: Partial<Config>): void;
export type { Config as RecipeConfig };