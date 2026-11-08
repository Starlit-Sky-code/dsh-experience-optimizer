import { join } from 'node:path'
import { scopeOf } from '@deepseek-ai/dsh-scope'
import type { Context } from '@deepseek-ai/cordis'
import { resolveDshHome } from 'dsh-shared-meta'
import type {
  CompatConfigLike,
  LoaderLike,
  PluginInventoryLike,
  PluginManagerLike,
  PromptAdapterLike,
} from './model.ts'

export interface ProfileFacts {
  name: string
  dir: string
  dshHome: string
  cwd: string
  bundles?: string[]
  dependencies?: Record<string, string>
}

/** Resolve the current profile facts from Cordis, falling back to environment/defaults. */
export function resolveProfileFacts(ctx: Context, agent?: unknown): ProfileFacts {
  const profileContext = safeGet<{
    name?: unknown
    dir?: unknown
    home?: unknown
    cwd?: unknown
    startedBundles?: unknown
  }>(ctx, 'profileContext')
  const name =
    typeof profileContext?.name === 'string'
      ? profileContext.name
      : (process.env.DSH_PROFILE?.trim() || 'web')
  const dshHome =
    typeof profileContext?.home === 'string' && profileContext.home.length > 0
      ? profileContext.home
      : resolveDshHome()
  const dir =
    typeof profileContext?.dir === 'string' && profileContext.dir.length > 0
      ? profileContext.dir
      : join(dshHome, 'profiles', name)
  const cwd =
    typeof profileContext?.cwd === 'string' && profileContext.cwd.length > 0
      ? profileContext.cwd
      : sessionCwd(agent) ?? process.cwd()
  const bundles = Array.isArray(profileContext?.startedBundles)
    ? profileContext.startedBundles.filter((item): item is string => typeof item === 'string')
    : undefined
  return { name, dir, dshHome, cwd, bundles }
}

function sessionCwd(agent: unknown): string | undefined {
  if (!isObject(agent)) return undefined
  const session = agent.session
  if (!isObject(session)) return undefined
  const header = session.header
  if (!isObject(header)) return undefined
  return typeof header.cwd === 'string' ? header.cwd : undefined
}

export function getPluginManager(ctx: Context): PluginManagerLike | undefined {
  return safeGet<PluginManagerLike>(ctx, 'pluginManager')
}

export function getInventory(ctx: Context): PluginInventoryLike | undefined {
  return safeGet<PluginInventoryLike>(ctx, 'pluginInventory')
}

export function getLoader(ctx: Context): LoaderLike | undefined {
  return safeGet<LoaderLike>(ctx, 'loader')
}

/** Build a prompt adapter that preserves the agent scope and step tool set. */
export function getPromptAdapter(ctx: Context, agent?: unknown): PromptAdapterLike | undefined {
  const systemPrompt = safeGet<{
    assemble?: (context?: {
      agent?: unknown
      scope?: object
      toolSet?: unknown
    }) => Promise<unknown>
  }>(ctx, 'systemPrompt')
  if (typeof systemPrompt?.assemble !== 'function') return undefined
  let scope: object | undefined
  if (isObject(agent) && isObject(agent.ctx)) {
    try {
      scope = scopeOf(agent.ctx as unknown as Context)
    } catch {
      scope = undefined
    }
  }
  return {
    async assemble(agentArg, toolSet) {
      const assembly = await systemPrompt.assemble!({
        agent: agentArg,
        scope,
        toolSet,
      })
      return isObject(assembly)
        ? (assembly as {
            sections: Array<{ name: string; text: string }>
            contexts: Array<{ name: string; text: string }>
            tools: Array<{ name: string; description?: string; parameters?: unknown }>
          })
        : undefined
    },
  }
}

/** Narrow a config-like object for the compat collector. */
export function toCompatConfig(config: CompatConfigLike): CompatConfigLike {
  return {
    compatEnabled: config.compatEnabled,
    compatScanAllProfiles: config.compatScanAllProfiles,
    compatMaxProfiles: config.compatMaxProfiles,
    compatIncludeInfo: config.compatIncludeInfo,
    compatMaxFindings: config.compatMaxFindings,
    compatReadLockfile: config.compatReadLockfile,
    compatReadWorkspace: config.compatReadWorkspace,
    compatStrictOfficialOverrides: config.compatStrictOfficialOverrides,
    compatCacheTtlMs: config.compatCacheTtlMs,
    toolOwners: config.toolOwners,
  }
}

function safeGet<T>(ctx: Context, key: string): T | undefined {
  try {
    return ctx.get(key) as T | undefined
  } catch {
    return undefined
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
