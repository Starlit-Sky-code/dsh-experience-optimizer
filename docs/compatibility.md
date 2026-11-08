# 兼容性规则

`trim_analyze_compatibility` 输出三个维度的矩阵：

1. **插件 ↔ 插件**：服务、row/config、MCP 命名空间、运行时注册、能力/prompt 重叠、重复包版本。
2. **插件 ↔ DSH 运行时**：`engines.dsh`、DSH peer、`engines.node`、平台、preflight、豁免、重复 DSH 副本。
3. **Profile / 工作区**：bundle 漂移、版本/豁免漂移、重复/孤儿 bundle、patch 冲突、`AGENTS.md` 规则重叠。

## 严重度

| 级别 | 含义 |
|---|---|
| `error` | 明确不兼容或会冲突；不应自动启用/应用 |
| `warn` | 风险较高或需要人工确认；可继续但应处理 |
| `info` | 提示/重复/漂移；不阻断 |

## 规则表

### 插件 ↔ DSH 运行时

| code | 级别 | 证据 | 修复 |
|---|---|---|---|
| `RT_ENGINE_UNMET` | error | manifest `engines.dsh` 不满足 | 升级插件/DSH；豁免需显式接受风险 |
| `RT_PEER_UNMET` | error | DSH peer 范围不满足 | 同上 |
| `RT_NODE_UNMET` | error | `engines.node` 不匹配 | 切换 Node 或升级插件 |
| `RT_PLATFORM_UNSUPPORTED` | error | `dsh.bundle.platforms` 不含当前平台 | 禁用/移除可选 bundle |
| `RT_PREFLIGHT_DENIED` | error | pluginManager/preflight 拒绝 | 升级/豁免；不自动 |
| `RT_EXEMPTION_ACTIVE` | warn | `compatibility.json` 豁免生效 | 记录风险；优先升级 |
| `RT_DUPLICATE_DSH_COPIES` | warn | lockfile 中同一 DSH 包多版本 | pnpm overrides/dedupe |
| `RT_MANIFEST_UNAVAILABLE` | info | manifest 解析失败 | 降级为 pluginManager 结果 |
| `RT_LOCKFILE_UNAVAILABLE` | info | lockfile 缺失/解析失败 | 跳过重复版本分析 |

### 插件 ↔ 插件

| code | 级别 | 证据 | 修复 |
|---|---|---|---|
| `PP_SERVICE_DUPLICATE` | error | 同一作用域两个 active fiber 提供同名服务 | 禁用其一 |
| `PP_SERVICE_MISSING` | warn/error | inject 的服务无 provider，fiber pending/failed | 启用 provider 或禁用 consumer |
| `PP_SERVICE_CYCLE` | warn | provide/inject 图成环（启发式，长度 ≤5） | 调整顺序/禁用 |
| `PP_ROW_DUPLICATE` | error | 两个 enabled bundle 声明同一 row id | 禁用其一 |
| `PP_CONFIG_CONFLICT` | warn | 同一 row 在不同 bundle patch 中 config 不同 | 编辑 patch |
| `PP_MCP_SERVER_DUPLICATE` | error | 两个 MCP entry 同名 | 重命名/禁用 |
| `PP_MCP_STARTUP_FAILED` | warn | MCP fiber failed | 修复 transport/命令/网络 |
| `PP_RUNTIME_REGISTRATION_FAILED` | error | diagnostic 命中 duplicate/conflict 等 | 查看 entry，禁用其一 |
| `PP_CAPABILITY_OVERLAP` | info | 两个 bundle 描述高度重叠 | 建议保留一个 |
| `PP_PROMPT_OVERLAP` | info/warn | prompt 段落重复/冲突 | 保留权威来源 |
| `PP_PACKAGE_VERSION_DUPLICATE` | warn | lockfile 中同一非 DSH 包多版本 | pnpm dedupe/overrides |
| `PP_MISSING_PEER_BUNDLE` | warn | 第三方 bundle 的 DSH peer 不在 profile | 安装/选中 peer |

### Profile / 工作区

| code | 级别 | 证据 | 修复 |
|---|---|---|---|
| `PW_DUPLICATE_BUNDLE` | error | `dsh.profile.bundles` 重复 | 编辑 profile |
| `PW_ORPHAN_BUNDLE` | warn | 已安装未选中，或选中未声明 | 安装/选中/移除 |
| `PW_PATCH_CONFLICT` | warn | profile patch 与 bundle patch config 不同 | 编辑 patch |
| `PW_BUNDLE_DRIFT` | info | 多 profile bundle 集合不同 | 按需对齐 |
| `PW_VERSION_DRIFT` | warn | 同一 bundle 多 profile 版本不同 | 对齐/升级 |
| `PW_EXEMPTION_DRIFT` | warn | 多 profile 豁免不同 | 对齐 |
| `PW_COMPAT_FILE_INVALID` | warn | compatibility.json 有被拒记录 | 手工修复 |
| `PW_WORKSPACE_RULE_OVERLAP` | info | AGENTS.md 与插件 prompt 高度重叠 | 保留一个权威来源 |

## 证据与置信度

- `manifest`：package.json 的 engines/peers/platforms。
- `loader`：entry/provide/inject/preset/MCP。
- `plugin-manager`：fiber 状态、diagnostic、bundle error、豁免。
- `profile-file`：package.json、cordis.patch.yml、compatibility.json。
- `lockfile`：pnpm-lock.yaml。
- `prompt`：systemPrompt.assemble 的 sections/contexts。
- `runtime`：DSH/Node/平台版本。

`confidence`：

- `high`：运行时/管理者给出的直接证据。
- `medium`：静态规则或需要解析的推断。
- `low`：manifest 缺失、根因不确定、或仅启发式。

## 误报与边界

- 官方 base/web-app 的 row 覆盖是刻意行为；默认不报 `PP_CONFIG_CONFLICT`，除非 `compatStrictOfficialOverrides: true`。
- agent preset 之间的同名服务不视为冲突；preset 与全局之间只给 medium 提示。
- 工具名冲突的可靠来源是运行时 diagnostic；静态规则不猜测。
- `!!js` 只解析为 `{ __js: source }`，不执行、不比较环境值。
- 多 profile 比较只读文件，不启动其他 profile；manifest 解析失败只记 info。
- 工作区只检查 `AGENTS.md`/`CLAUDE.md` 链，不扫描整个项目。

## 如何阅读矩阵

```text
| 主体 | 运行时 | 插件间 | Profile/工作区 |
|------|--------|--------|----------------|
| pkg  | E:RT_ENGINE_UNMET | — | — |
```

- `E/W/I` = error/warn/info，后面是 code。
- 同一主体多个发现时最多显示两个，完整列表在“详细发现”和 JSON 中。
- 只读工具不会自动修复；`trim_apply_profile` 只处理草稿里的低风险项，且受保护项永不改。
