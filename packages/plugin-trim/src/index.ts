import type { Context } from '@deepseek-ai/cordis'
import { Config, normalizeConfig } from './config.ts'
import type { Config as TrimConfig } from './config.ts'
import { registerTrimTools } from './tools.ts'
import { registerCompatTool } from './compat/tool.ts'
import { UsageLedger } from './usage.ts'

export const name = 'dsh-plugin-trim'
export const inject = ['tools']
export { Config }
export type { TrimConfig }

/** Register trim tools and the local usage observer. */
export function apply(ctx: Context, config?: Partial<Config>): void {
  const resolved = normalizeConfig(config)
  const ledger = new UsageLedger({
    retentionDays: resolved.usageRetentionDays,
    enabled: resolved.trackUsage,
  })

  if (resolved.trackUsage) {
    ctx.on('tools/result', (exec, result) => {
      if (exec.name.startsWith('trim_') || exec.name.startsWith('recipe_')) return
      try {
        ledger.record(exec.name, !result.isError)
      } catch {
        // Usage is best-effort and must never affect a tool result.
      }
    })
  }

  ctx.effect(() => () => ledger.dispose(), 'trim.usage.flush')

  registerTrimTools(ctx, { config: resolved, ledger })
  registerCompatTool(ctx, resolved)
}

export { scanPlugins } from './scan.ts'
export { detectTask } from './task.ts'
export { buildSlimProfile } from './draft.ts'
export { applySlimProfile } from './apply.ts'
export { rollbackSlimProfile } from './rollback.ts'
export { analyzeCompatibility } from './compat/analyze.ts'
export { runCompatibilityRules } from './compat/report.ts'
export { collectCompatContext } from './compat/context.ts'
export { renderReport, buildReport } from './compat/report.ts'
export type * from './compat/model.ts'
