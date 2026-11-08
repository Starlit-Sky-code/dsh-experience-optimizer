import z from '@deepseek-ai/schemastery'

/** Deployment configuration for the recipe plugin. */
export interface Config {
  /** Maximum workflow steps before a warning. */
  maxSteps: number
  /** Allow exporting blueprints to the DSH data directory. */
  allowExport: boolean
  /** Optional custom capability catalog JSON path; empty uses the default data path. */
  capabilitiesFile: string
  /** Default delivery seam when the user does not name a send capability. */
  defaultDelivery: string
}

export const Config: z<Config> = z.object({
  maxSteps: z.natural().min(1).max(100).default(12),
  allowExport: z.boolean().default(true),
  capabilitiesFile: z.string().default(''),
  defaultDelivery: z.string().default('present'),
})

/** Defaults used when the loader starts the plugin without an explicit config. */
export const DEFAULT_CONFIG: Config = {
  maxSteps: 12,
  allowExport: true,
  capabilitiesFile: '',
  defaultDelivery: 'present',
}

/** Merge a partial/undefined loader config over the defaults. */
export function normalizeConfig(config?: Partial<Config> | undefined): Config {
  return { ...DEFAULT_CONFIG, ...(config ?? {}) }
}
