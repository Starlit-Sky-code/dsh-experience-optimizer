import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { Config } from '../config.ts'
import { analyzeCompatibility } from './analyze.ts'

/** Register the read-only compatibility analysis tool. */
export function registerCompatTool(ctx: Context, config: Config): void {
  ctx.tools.register(
    defineTool({
      name: 'trim_analyze_compatibility',
      description:
        'Read-only compatibility analysis for the current DSH profile: plugin-plugin conflicts (services, rows, configs, MCP namespaces, registrations), plugin-runtime mismatches (engines, peers, Node, platform, exemptions), and profile/workspace drift. Returns a compatibility matrix and writes a local JSON report. Never changes plugin enablement, grants exemptions, or edits patches.',
      parameters: {
        scope: {
          type: 'string',
          enum: ['current', 'profiles', 'all'],
          description:
            'current: this profile only; profiles: also compare all profiles under $DSH_HOME/profiles; all: profiles plus workspace instruction overlap.',
        },
        includeInfo: {
          type: 'boolean',
          description: 'Include info-level findings in the Markdown matrix; the JSON report always keeps them.',
        },
        maxFindings: {
          type: 'integer',
          description: 'Maximum findings in the report, 1..500. Defaults to the configured limit.',
        },
        writeReport: {
          type: 'boolean',
          description: 'Write the JSON report to $DSH_HOME/experience-optimizer/compat/report.json. Default true.',
        },
      },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args, exec) {
        const scope = args.scope ?? 'current'
        const result = await analyzeCompatibility(ctx, config, {
          scope,
          includeInfo: args.includeInfo,
          maxFindings: args.maxFindings,
          writeReport: args.writeReport,
          agent: exec.agent,
          toolSet: exec.toolSet,
        })
        const header = [
          '> 兼容性分析为只读操作，未修改任何插件、patch 或豁免。',
          result.reportPath === undefined ? '' : `> 报告文件：${result.reportPath}`,
          '',
        ]
          .filter((line) => line.length > 0)
          .join('\n')
        return `${header}\n\n${result.markdown}`
      },
      presentCall: () => ({
        card: 'generic',
        title: 'Analyze plugin compatibility',
        kind: 'read',
      }),
    }),
  )
}
