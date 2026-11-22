import type { BundleProfile, EcosystemCategory } from 'dsh-shared-meta'

/** Group bundles into coarse ecosystem categories for a composition view. */
export function summarizeCategories(bundles: readonly BundleProfile[]): EcosystemCategory[] {
  const byId = new Map<EcosystemCategory['id'], EcosystemCategory>()
  for (const bundle of bundles) {
    if (!bundle.enabled) continue
    const id = categoryOf(bundle)
    const current = byId.get(id) ?? {
      id,
      label: LABELS[id],
      bundles: 0,
      tokens: 0,
      share: 0,
    }
    current.bundles += 1
    current.tokens += Math.max(0, bundle.contextTokens)
    byId.set(id, current)
  }
  const total = [...byId.values()].reduce((sum, item) => sum + item.tokens, 0)
  return [...byId.values()]
    .map((item) => ({
      ...item,
      share: total > 0 ? (item.tokens / total) * 100 : 0,
    }))
    .sort((a, b) => b.tokens - a.tokens || a.id.localeCompare(b.id))
}

const LABELS: Record<EcosystemCategory['id'], string> = {
  core: '核心',
  ui: '界面',
  memory: '上下文/记忆',
  tools: '工具',
  workflow: '工作流',
  integration: '集成',
  other: '其他',
}

function categoryOf(bundle: BundleProfile): EcosystemCategory['id'] {
  const text = `${bundle.name} ${bundle.description ?? ''}`.toLowerCase()
  if (/(client-ui|ui-|theme|icon|style|widget)/.test(text)) return 'ui'
  if (/(context|memory|compact|recall|rag|knowledge|history)/.test(text)) return 'memory'
  if (/(workflow|recipe|schedule|automation|task|goal)/.test(text)) return 'workflow'
  if (/(tool|bash|fs|web|mcp|skill|terminal)/.test(text)) return 'tools'
  if (/(remote|connect|notify|matrixmedia|integration|api-)/.test(text)) return 'integration'
  if (bundle.official && bundle.name.startsWith('@deepseek-ai/')) return 'core'
  return 'other'
}
