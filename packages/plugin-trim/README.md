# dsh-plugin-trim

DSH 插件生态的**体检**与**兼容性检查**插件。

## 安装

从 npm 安装（推荐）：

```bash
npm i dsh-plugin-trim
```

从 GitHub Release 安装（备用）：

```bash
npm i "https://github.com/Starlit-Sky-code/dsh-experience-optimizer/releases/download/v0.5.5/dsh-plugin-trim-0.5.5.tgz"
```

本地包：

```bash
npm i /absolute/path/to/packages/plugin-trim
```

> English overview: [README.en.md](../../README.en.md)

## Web 控制台

安装后在 DSH **设置 → 插件体检**（Agent 预设下方）或 **设置 → 插件 → 插件体检** 打开：

- 四维体检结论（加载 / 兼容 / 上下文 / 压缩链路）与可下钻证据；
- 上下文成本、兼容性矩阵、压缩链路卡与静态能力面；
- 应用后实测收益（待重启 / 已结算 / 受其他变化影响）；
- 按任务生成精简方案，勾选低风险项后显式应用；
- 一键回滚；
- 教程页：5 分钟上手、快速开始、常见问题；
- 设置页：当前审批/建议策略、保护名单、可复制配置片段；
- 工作流配方页签（已暂时废弃；仅当 `dsh-plugin-recipe` 仍启用时显示，且标注「已冻结」）。

界面只调用同源 JSON API；API 校验 DSH 浏览器会话与 `Origin`。

## 工具

| 工具 | 读写 | 说明 |
|---|---|---|
| `trim_scan_plugins` | 只读 | 插件清单、真实 prompt 上下文成本、使用统计、去重组、兼容性摘要 |
| `trim_analyze_compatibility` | 只读 | 兼容性矩阵：插件↔插件、插件↔DSH/Node/平台、Profile/工作区漂移 |
| `trim_suggest_profile` | 只写本地草稿 | 按当前任务生成 keep/enable/disable/review 建议与证据 |
| `trim_apply_profile` | 修改 profile | 提案 + 宿主审批 `allowed-once` 后应用低风险项 |
| `trim_rollback_profile` | 修改 profile | 宿主审批后恢复上一次应用 |

## 安全边界

- 默认只建议，不自动禁用。
- Web API 需要 DSH 连接认证、同源请求和 `x-dsh-trim-client: 1` 请求头；未通过时不返回数据。
- `trim_apply_profile` 必须 `confirm: true`，但默认还要宿主审批返回 `allowed-once` 才真正写入；`confirm` 只是提案标记。
- `trim_rollback_profile` 始终需要宿主审批。
- 只应用 `risk: low`、非受保护的 disable/enable 项。
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
    approvalMode: always
    suggestionPolicy: conservative
    approvalThreshold: 5
    protect:
      - my-important-plugin
    pinned:
      - my-pinned-plugin
    trackUsage: true
    compatScanAllProfiles: true
```

| key | 默认 | 说明 |
|---|---|---|
| `mode` | `advise` | `auto-safe` 只收窄建议范围 |
| `approvalMode` | `always` | `always`：每次工具应用都请求宿主审批；`risk-based`：仅超过阈值时审批 |
| `suggestionPolicy` | `conservative` | `conservative`：仅强证据才标“建议关闭”；`balanced`：保留旧评分，仍受周期/调用记录保护 |
| `approvalThreshold` | `5` | `risk-based` 模式下，超过该数量的草稿需要宿主审批 |
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
