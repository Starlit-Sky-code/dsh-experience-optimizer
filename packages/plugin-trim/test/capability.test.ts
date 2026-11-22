import { describe, expect, it } from 'vitest'
import type { LoaderEntrySnapshot, PatchLayerRow } from '../src/compat/model.ts'
import { inspectCapabilities } from '../src/capability.ts'

function tool(name: string, owner = 'demo') {
  return { name, owner, tokens: 10 }
}

function entry(partial: Partial<LoaderEntrySnapshot>): LoaderEntrySnapshot {
  return {
    id: 'row',
    parentId: null,
    depth: 0,
    moduleName: 'module',
    enabled: true,
    group: false,
    fiberState: 'active',
    provide: [],
    inject: [],
    source: 'loader',
    ...partial,
  }
}

function patch(partial: Partial<PatchLayerRow>): PatchLayerRow {
  return { layer: 'bundle', id: 'row', sourceFile: 'cordis.patch.yml', ...partial }
}

describe('static capability surface', () => {
  it('classifies shell, file write, and network tools without counting read-only tools', () => {
    const surface = inspectCapabilities({
      tools: [
        tool('bash'),
        tool('web_fetch'),
        tool('write'),
        tool('apply_patch'),
        tool('read'),
        tool('grep'),
      ],
      loaderEntries: [],
      patchRows: [],
    })
    const byId = Object.fromEntries(surface.groups.map((group) => [group.id, group]))
    expect(byId.shell.items.map((item) => item.name)).toEqual(['bash'])
    expect(byId['filesystem-write'].items.map((item) => item.name).sort()).toEqual(['apply_patch', 'write'])
    expect(byId.network.items.map((item) => item.name)).toEqual(['web_fetch'])
    expect(surface.notes.join(' ')).toContain('not a security audit')
  })

  it('lists MCP servers and !!js patch sentinels', () => {
    const surface = inspectCapabilities({
      tools: [],
      loaderEntries: [
        entry({ id: 'mcp-1', moduleName: 'mcp-client', source: 'mcp', mcpServerName: 'github' }),
      ],
      patchRows: [
        patch({ id: 'dynamic-row', config: { value: { __js: 'ctx.get("x")' } } }),
        patch({ id: 'plain-row', config: { value: 'ok' } }),
      ],
    })
    const byId = Object.fromEntries(surface.groups.map((group) => [group.id, group]))
    expect(byId.mcp.items.map((item) => item.name)).toEqual(['github'])
    expect(byId['dynamic-config'].items.map((item) => item.name)).toEqual(['bundle:dynamic-row'])
  })

  it('does not list official base-layer !!js wiring as a capability', () => {
    const surface = inspectCapabilities({
      tools: [],
      loaderEntries: [],
      patchRows: [
        patch({ layer: '@deepseek-ai/dsh-base', id: 'core-row', config: { value: { __js: 'ctx.get("x")' } } }),
        patch({ layer: 'my-plugin-bundle', id: 'plugin-row', config: { value: { __js: 'ctx.get("y")' } } }),
      ],
    })
    const dynamic = surface.groups.find((group) => group.id === 'dynamic-config')
    expect(dynamic?.items.map((item) => item.name)).toEqual(['my-plugin-bundle:plugin-row'])
  })

  it('caps each group at 20 items', () => {
    const tools = Array.from({ length: 30 }, (_, index) => tool(`bash_${index}`))
    const surface = inspectCapabilities({ tools, loaderEntries: [], patchRows: [] })
    expect(surface.groups.find((group) => group.id === 'shell')?.count).toBe(20)
  })
})
