import { describe, expect, it } from 'vitest'
import type { BundleProfile } from 'dsh-shared-meta'
import { summarizeCategories } from '../src/categories.ts'

function bundle(partial: Partial<BundleProfile>): BundleProfile {
  return {
    name: 'bundle',
    version: '1.0.0',
    enabled: true,
    installed: true,
    availability: 'profile',
    official: false,
    optional: false,
    removable: true,
    guardStatus: 'ok',
    rowModuleNames: ['bundle'],
    contextTokens: 0,
    usage: { calls: 0, successes: 0, sessionCalls: 0 },
    protected: false,
    findings: [],
    ...partial,
  }
}

describe('ecosystem category rollup', () => {
  it('groups enabled bundles and excludes disabled ones', () => {
    const categories = summarizeCategories([
      bundle({ name: 'dsh-context', description: 'context compaction engine', contextTokens: 400 }),
      bundle({ name: 'dsh-tool-bash', description: 'shell tool', contextTokens: 200 }),
      bundle({ name: '@deepseek-ai/dsh-base', official: true, contextTokens: 100 }),
      bundle({ name: 'dsh-client-ui-chat', description: 'chat UI', contextTokens: 100 }),
      bundle({ name: 'disabled-plugin', contextTokens: 999, enabled: false }),
    ])
    const byId = Object.fromEntries(categories.map((category) => [category.id, category]))
    expect(byId.memory.tokens).toBe(400)
    expect(byId.tools.tokens).toBe(200)
    expect(byId.core.tokens).toBe(100)
    expect(byId.ui.tokens).toBe(100)
    const total = categories.reduce((sum, category) => sum + category.tokens, 0)
    expect(total).toBe(800)
    expect(categories.reduce((sum, category) => sum + category.share, 0)).toBeCloseTo(100)
  })
})
