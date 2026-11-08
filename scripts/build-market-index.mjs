#!/usr/bin/env node
/**
 * Build a format-1 DSH plugin market index for this repository's two bundles.
 *
 * The index pins the current Git commit, so it must be generated after the
 * commit that contains the plugin sources. It is intended to be served from
 * raw.githubusercontent.com or GitHub Pages.
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseMarketIndex, marketInstallTarget } from '@deepseek-ai/dsh-plugin-market-index'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const repo = resolveRepo()
const commit = git(['rev-parse', 'HEAD']).trim()
if (!/^[0-9a-f]{40}$/.test(commit)) throw new Error(`invalid git commit: ${commit}`)
const publishTimestamp = Number(git(['log', '-1', '--format=%ct']).trim()) || Math.floor(Date.now() / 1000)
const repoUrl = `https://github.com/${repo}`
const rawBase = `https://raw.githubusercontent.com/${repo}/${commit}`
const indexUrl = `https://raw.githubusercontent.com/${repo}/main/marketplace/index.json`

const trim = readPackage('packages/plugin-trim')
const recipe = readPackage('packages/plugin-recipe')

const index = {
  format: 1,
  title: {
    en: 'DSH Experience Optimizer',
    zh: 'DSH 体验优化套件',
  },
  description: {
    en: 'Plugin diet, compatibility diagnostics, and workflow blueprints for DeepSeek Harness.',
    zh: 'DSH 插件减负、兼容性体检与工作流蓝图套件。',
  },
  metadata: {
    categories: {
      'plugin-suite': { title: { en: 'Plugin Suite', zh: '插件套件' } },
      compatibility: { title: { en: 'Compatibility', zh: '兼容性' } },
      workflow: { title: { en: 'Workflow', zh: '工作流' } },
    },
    labels: {
      compatibility: { title: { en: 'Compatibility diagnostics', zh: '兼容性诊断' } },
      diet: { title: { en: 'Context diet', zh: '上下文减负' } },
      workflow: { title: { en: 'Workflow planning', zh: '工作流规划' } },
    },
    sortKeys: {},
  },
  plugins: [
    pluginEntry({
      pkg: trim,
      directory: 'packages/plugin-trim',
      title: { en: 'DSH Plugin Trim', zh: 'DSH 插件减负与兼容性体检' },
      description: {
        en: 'Scan plugin context cost, detect plugin/plugin, plugin/runtime, and profile/workspace conflicts, then apply low-risk reversible trimming only after confirmation.',
        zh: '扫描插件上下文成本，检测插件↔插件、插件↔DSH、Profile/工作区冲突；只在用户确认后应用低风险、可回滚的精简项。',
      },
      keywords: ['dsh', 'dsh-plugin', 'compatibility', 'plugin-manager', 'context', 'diet'],
      labels: ['compatibility', 'diet'],
    }),
    pluginEntry({
      pkg: recipe,
      directory: 'packages/plugin-recipe',
      title: { en: 'DSH Workflow Recipe', zh: 'DSH 工作流配方' },
      description: {
        en: 'Turn a business goal into a validated workflow blueprint with steps, capabilities, minimum plugin set, permissions, failure policy, acceptance, and rollback.',
        zh: '把业务目标翻译成可校验的工作流蓝图，包含步骤、能力、最小插件集、权限、失败策略、验收与回滚。',
      },
      keywords: ['dsh', 'dsh-plugin', 'workflow', 'planning', 'automation', 'compatibility'],
      labels: ['workflow', 'compatibility'],
    }),
  ],
}

// Throws on any format violation before writing.
parseMarketIndex(index, indexUrl)

const output = `${JSON.stringify(index, null, 2)}\n`
const target = join(root, 'marketplace', 'index.json')
if (process.argv.includes('--check')) {
  let current = ''
  try {
    current = readFileSync(target, 'utf8')
  } catch {
    console.error('marketplace/index.json is missing; run pnpm market:index')
    process.exit(1)
  }
  const parsed = parseMarketIndex(JSON.parse(current), indexUrl)
  for (const expected of index.plugins) {
    const actual = parsed.plugins.find((plugin) => plugin.name === expected.name)
    if (actual === undefined) {
      console.error(`marketplace/index.json is missing ${expected.name}`)
      process.exit(1)
    }
    if (actual.versions[0]?.version !== expected.versions[0]?.version) {
      console.error(`marketplace/index.json has stale version for ${expected.name}`)
      process.exit(1)
    }
  }
  console.log('marketplace/index.json is valid for the current package versions')
} else {
  mkdirSync(join(root, 'marketplace'), { recursive: true })
  writeFileSync(target, output)
  console.log(`wrote marketplace/index.json (${commit})`)
  console.log(`index URL: ${indexUrl}`)
  for (const plugin of index.plugins) {
    const version = plugin.versions[0]
    const targetInfo = marketInstallTarget(plugin.name, version)
    console.log(`install ${plugin.name}: plugin_manager install_bundle target=${targetInfo.spec}`)
  }
}

function resolveRepo() {
  const configured = process.env.GITHUB_REPOSITORY?.trim()
  if (configured) return configured.replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '')
  try {
    const remote = git(['remote', 'get-url', 'origin']).trim()
    const match = /github\.com[/:]([^/]+)\/([^/]+?)(?:\.git)?$/.exec(remote)
    if (match !== null) return `${match[1]}/${match[2]}`
  } catch {
    // Fall through to the configured default.
  }
  return 'StarlitSky/dsh-experience-optimizer'
}

function git(args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
}

function readPackage(directory) {
  return JSON.parse(readFileSync(join(root, directory, 'package.json'), 'utf8'))
}

function pluginEntry({ pkg, directory, title, description, keywords, labels }) {
  return {
    name: pkg.name,
    title,
    description,
    icon: `${rawBase}/${directory}/icon.png`,
    author: pkg.author ?? 'StarlitSky',
    homepage: `${repoUrl}/tree/main/${directory}#readme`,
    repository: { url: repoUrl, directory },
    metadata: {
      category: 'plugin-suite',
      keywords,
      labels,
      sortKeys: {},
    },
    versions: [
      {
        version: pkg.version,
        publishTimestamp,
        source: {
          type: 'git',
          url: repoUrl,
          commit,
          path: directory,
        },
        engines: { dsh: pkg.engines?.dsh ?? '>=0.2.2-rc.1 <0.3.0' },
      },
    ],
  }
}
