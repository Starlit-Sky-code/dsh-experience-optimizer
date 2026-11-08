# 架构

## 包

```text
packages/shared-meta/   私有共享包：类型、原子存储、审计、文本估算
packages/plugin-trim/   减负 + 兼容性体检（Host，工具面）
packages/plugin-recipe/ 业务目标 → 工作流蓝图（Host，工具面）
```

`dsh-shared-meta` 在构建时被 tsdown 内联进两个插件（`noExternal`/`alwaysBundle`），
不进入 profile 的运行时依赖。两个插件都只依赖 DSH 的公开 peer 包。

## 数据流

### trim

```text
tool call
  → agent.session.deriveMessages() 提取最近任务文本与 tool-call 名称
  → detectTask() 得到 TaskProfile（tag/confidence/keywords/evidence）
  → analyzeCompatibility()
      → loader.entries() / pluginInventory / pluginManager / manifests
      → systemPrompt.assemble()
      → runtime/profile/lockfile/workspace rules
      → CompatReport → <dataDir>/compat/report.json
  → scanPlugins()
      → prompt sections/tools 的真实 token 估算与 owner 归属
      → usage ledger + 当前会话使用量
      → 保护名单
  → buildSlimProfile() 评分 + 去重 + 兼容性硬约束
  → <dataDir>/trim/profiles/<profileId>.json
  → 返回 Markdown（未改插件状态）
```

apply：

```text
trim_apply_profile({ profileId, confirm: true })
  → 读取草稿，过滤 low-risk disable/enable
  → 重新读取当前 enabled 状态，跳过 stale
  → 写 snapshot（pending）
  → 逐项 setBundleEnabled / setPluginEnabled
  → 每项后原子写 snapshot + audit
  → 任一项失败：逆序回滚本次已成功项
  → 返回 rollbackToken
```

rollback：

```text
trim_rollback_profile({ token? })
  → 读取 snapshot
  → 逆序恢复 applied 项
  → 当前状态既非 applied 也非 previous 的项标 externally-changed，不覆盖
```

### recipe

```text
recipe_plan_workflow({ goal, answers })
  → isWorkflowGoal()
  → nextQuestion() 最多 4 组追问
  → defaultsFor() 填默认值
  → availableCapabilities() 用 ctx.tools.get(name, agent) 检查工具
  → translateGoal() 生成步骤（weekly-report / generic）
  → validateBlueprint() 校验
  → 返回蓝图 + 校验 + uncertainties
```

`recipe` 读 `<dataDir>/compat/report.json`，把 error 主体排除在能力之外，并在
`recipe_validate_workflow` 中产出 `COMPAT_CONFLICT` / `COMPAT_WARN`。

## 兼容性模块（trim 内）

```text
src/compat/
  model.ts        内部快照类型与 adapter 接口
  adapters.ts     Cordis → profile/loader/pluginManager/inventory/prompt 适配
  loader-graph.ts loader/preset/MCP 行、provide/inject
  manifests.ts    package.json 解析、engines/peers/platforms
  patches.ts       patch 层解析，!!js 只做哨兵
  lockfile.ts     pnpm-lock.yaml 重复版本
  profiles.ts     多 profile + workspace instruction
  runtime-check.ts app-boot 兼容检查 + 本地回退
  rules-runtime.ts 插件 ↔ DSH/Node/平台
  rules-plugin.ts  插件 ↔ 插件
  rules-profile.ts Profile / 工作区
  finding.ts       finding 构造/去重/排序
  report.ts        规则汇总、矩阵、Markdown/JSON
  analyze.ts       采集 + 缓存 + 落盘 + 审计
  tool.ts          trim_analyze_compatibility
```

## 保护名单

不可建议禁用、不可应用：

- 套件自身、plugin-manager、tools、system-prompt、agent/session/llm 核心。
- base/web-app/headless/sdk-app/sdk-minimal 及任何 `readOnlyReason` 项。
- agent preset 行（`pluginInventory.agentPresets[].rows[].moduleName`）。
- 用户 `protect`/`pinned`、当前 profile 强依赖。

## 数据文件

```text
<dshHome>/experience-optimizer/
├── audit.jsonl
├── audit.1.jsonl
├── capabilities.json
├── compat/report.json
├── trim/
│   ├── profiles/<profileId>.json
│   ├── snapshots/<token>.json
│   └── usage.jsonl
└── recipe/blueprints/<id>.md|.json
```

目录 `0700`，文件 `0600`。审计只存摘要/计数，不存会话原文、工具参数或规则全文。

## 构建

- TypeScript `^5.9.3`，tsdown `^0.23.7`，vitest `^5.1.0`。
- `fixedExtension: false` 输出 `dist/index.js` / `index.d.ts`。
- `pnpm build` 先构建 shared-meta，再构建两个插件。
- `pnpm verify` = build + 打包契约检查 + vitest。
