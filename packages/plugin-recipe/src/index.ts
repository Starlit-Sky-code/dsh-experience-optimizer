import type { Context } from '@deepseek-ai/cordis'
import { Config, normalizeConfig } from './config.ts'
import type { Config as RecipeConfig } from './config.ts'
import { registerRecipeTools } from './tools.ts'
import { registerRecipeApi } from './api.ts'

export const name = 'dsh-plugin-recipe'
export const inject = ['tools']
export { Config }
export type { RecipeConfig }

/** Register the workflow planner tools. */
export function apply(ctx: Context, config?: Partial<Config>): void {
  const resolved = normalizeConfig(config)
  registerRecipeTools(ctx, resolved)
  registerRecipeApi(ctx, resolved)
}

export { loadCapabilities, BUILT_IN_CAPABILITIES } from './capabilities.ts'
export { nextQuestion, defaultsFor, isWorkflowGoal } from './wizard.ts'
export { translateGoal } from './translate.ts'
export { validateBlueprint, renderValidation } from './validate.ts'
export { exportBlueprint, renderBlueprintMarkdown } from './export.ts'
