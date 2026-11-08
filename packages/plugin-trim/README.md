# dsh-plugin-trim

DSH 插件生态的**减负**与**兼容性体检**插件。

## 安装

从 GitHub Release 安装（当前推荐，无需 npm）：

```bash
dsh plugin --profile web add "https://github.com/Starlit-Sky-code/dsh-experience-optimizer/releases/download/v0.2.2/dsh-plugin-trim-0.2.2.tgz"
```

发布到 npm 后：

```bash
dsh plugin --profile web add dsh-plugin-trim
```

本地开发：

```bash
dsh plugin --profile web add /absolute/path/to/packages/plugin-trim
```

## Web 控制台

安装后在 DSH **设置 → 插件 → 体验优化** 打开：

- 上下文成本与兼容性矩阵；
- 按任务生成精简方案，勾选低风险项后显式应用；
- 一键回滚；
- 工作流配方页签（由 `dsh-plugin-recipe` 提供 Host API）。

界面只调用同源 JSON API；API 校验 DSH 浏览器会话与 `Origin`。

## 工具

| 工具 | 读写 | 说明 |
|---|---|---|
| `trim_scan_plugins` | 只读 | 插件清单、真实 prompt 上下文成本、使用统计、去重组、兼容性摘要 |
| `trim_analyze_compatibility` | 只读 | 兼容性矩阵：插件↔插件、插件↔DSH/Node/平台、Profile/工作区漂移 |
| `trim_suggest_profile` | 只写本地草稿 | 按当前任务生成 keep/enable/disable/review 建议与证据 |
| `trim_apply_profile` | 修改 profile | 用户显式确认后应用低风险项，返回回滚 token |
| `trim_rollback_profile` | 修改 profile | 恢复上一次应用 |

## 安全边界

- 默认只建议，不自动禁用。
- `trim_apply_profile` 必须 `confirm: true`，只应用 `risk: low` 的 disable/enable 项。
- 受保护项永不改：核心、管理、agent preset、当前 profile 依赖、用户 `protect`/`pinned`、套件自身。
- 版本豁免、插件升级、patch 编辑只报告，不自动执行。
- 兼容性扫描不执行 `!!js`、不 import 未加载插件、不联网。
- 本地数据写入 `$DSH_HOME/experience-optimizer/`，目录 `0700`、文件 `0600`。

## 配置

在 profile patch 中覆盖 `dsh-plugin-trim` 的配置：

```yaml
- id: dsh-plugin-trim
  config:
    mode: advise
    protect:
      - my-important-plugin
    pinned:
      - my-pinned-plugin
    trackUsage: true
    compatScanAllProfiles: true
```

| key | 默认 | 说明 |
|---|---|---|
| `mode` | `advise` | `auto-safe` 只收窄建议范围，不绕过 confirm |
| `protect` | `[]` | 额外保护包名/entry id |
| `pinned` | `[]` | 永不建议禁用 |
| `trackUsage` | `true` | 记录工具名/成败/时间，不记录参数 |
| `usageRetentionDays` | `30` | 使用记录保留天数 |
| `maxDrafts` | `20` | 草稿/快照保留数 |
| `enableDedupe` | `true` | prompt 重复检测 |
| `persistExcerpts` | `false` | 是否在去重草稿保存 160 字符摘要 |
| `toolOwners` | `{}` | 补充 tool → 包名映射 |
| `compatEnabled` | `true` | 启用兼容性分析 |
| `compatScanAllProfiles` | `true` | 扫描 `$DSH_HOME/profiles/*` |
| `compatMaxProfiles` | `20` | profile 扫描上限 |
| `compatIncludeInfo` | `false` | Markdown 是否包含 info |
| `compatMaxFindings` | `100` | 报告发现上限 |
| `compatReadLockfile` | `true` | 解析 `pnpm-lock.yaml` |
| `compatReadWorkspace` | `true` | 对比 `AGENTS.md`/`CLAUDE.md` 与插件 prompt |
| `compatStrictOfficialOverrides` | `false` | 是否报告官方 bundle 的刻意覆盖 |

## 数据文件

```text
<dshHome>/experience-optimizer/
├── audit.jsonl
├── compat/report.json
└── trim/
    ├── profiles/<profileId>.json
    ├── snapshots/<token>.json
    └── usage.jsonl
```

## 已知限制

- agent preset 自带的工具不是可单独开关的 Loader entry，trim 只能报告，不能裁剪。
- 上下文成本按 prompt section/tool schema 估算；无法归属的部分标为 `unattributed`。
- 去重只给建议，不修改第三方插件源码；语义冲突只标记。
- 兼容性规则依赖 Loader/pluginManager/manifest 的可用性；缺失时降级为 info。
- 没有可用的 `dsh-plugin-guard` 服务；运行时兼容判断使用 `@deepseek-ai/dsh-app-boot` 的公开函数与 `pluginManager` 结果。
