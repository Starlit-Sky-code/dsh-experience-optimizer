# DSH 插件体检

<p align="center"><a href="https://starlit-sky-code.github.io/dsh-experience-optimizer/">在线宣传页</a> · <a href="README.en.md">English</a> · <strong>简体中文</strong></p>

![DSH 插件体检](assets/banner.svg)

<p align="center">
  <a href="https://github.com/Starlit-Sky-code/dsh-experience-optimizer/actions/workflows/ci.yml"><img alt="持续集成" src="https://github.com/Starlit-Sky-code/dsh-experience-optimizer/actions/workflows/ci.yml/badge.svg"></a>
  <a href="https://www.npmjs.com/package/dsh-plugin-trim"><img alt="npm dsh-plugin-trim" src="https://img.shields.io/npm/v/dsh-plugin-trim?label=dsh-plugin-trim"></a>
  <a href="LICENSE"><img alt="许可证：AGPL-3.0" src="https://img.shields.io/badge/License-AGPL--3.0-blue.svg"></a>
</p>

<p align="center"><strong>插件体检 × 兼容性检查 × 安全瘦身</strong><br>
只读扫描插件常驻成本与冲突；低风险项经确认后应用，支持快照回滚。</p>

## 安装

```bash
# npm
npm i dsh-plugin-trim

# DSH CLI / 插件市场：
dsh plugin --profile web add dsh-plugin-trim
```

> 省略版本号即取 latest。
> 安装后如果设置页没有出现，重新加载 DSH，并确认当前工作区已安装该依赖；npm CDN 返回 404 时请使用下方 Release tarball。

安装后打开 **设置 → 插件体检**（Agent 预设下方），或 **设置 → 插件 → 插件体检**。

<details>
<summary>GitHub Release（备用）</summary>

```bash
# Release tarball
npm i "https://github.com/Starlit-Sky-code/dsh-experience-optimizer/releases/download/v0.5.0/dsh-plugin-trim-0.5.0.tgz"
```

源码开发见下方[开发](#开发)一节。

</details>

## 一眼看懂

![插件体检网页控制台](assets/ui-preview.png)

<p align="center"><sub>设置 → 插件体检：上下文、兼容性、精简方案在同一个原生设置页里。</sub></p>

![两条路径，一个授权边界](assets/readme/flow.svg)

## 它解决什么

DSH 插件装得越多，越容易出现两类问题：

- **上下文变贵**：插件提示词、工具描述和重复段落持续占用 token。
- **兼容性变脆**：插件↔插件、插件↔DSH 运行时、配置集/工作区之间互相冲突。

`dsh-experience-optimizer` 把这两件事放进一个套件：

| 插件 | 职责 |
|---|---|
| [`dsh-plugin-trim`](packages/plugin-trim) | 只读扫描上下文成本与兼容性，生成可解释的保留/启用/禁用建议；低风险项经用户确认与宿主审批后应用，支持快照回滚 |
| `dsh-plugin-recipe` | **暂时废弃**：工作流蓝图规划器，保留现有安装，不再新增功能 |

`dsh-shared-meta` 是私有共享包，构建时内联，不增加运行时安装负担。

## 先看结论，再看细节

打开 **设置 → 插件体检**，顶部是一条四维结论：

```text
体检结论：需处理 2 项
加载 通过 · 兼容 1 警告 · 上下文 12.4k · 压缩链路 1 冲突
[处理兼容性] [查看压缩链路] [生成瘦身方案]
```

- **不做 0–100 健康分**：四个不同严重度的维度不压成一个唬人的数字；用状态灯 + 计数 + 可下钻证据。
- **加载**：插件行是否真的起来、peer/运行时是否匹配。
- **兼容**：插件↔插件、插件↔DSH、Profile/工作区冲突。
- **上下文**：可归属 token、Top 1 owner、重复提示词。
- **压缩链路**：只读识别压缩后端、工具结果裁剪、图像卸载、`/compact`、阈值控制面；发现双引擎、缺失后端、阈值冲突会直接告警，并把活跃后端加入保护名单，避免体检把唯一压缩后端建议关掉。

对话上方只在结论需要处理时出提醒（例如“压缩链路：2 个后端同时启用”）；没事时不打扰。

## “建议关闭”怎么判断？

54% 这类数字之所以扎人，是因为它把插件**常驻上下文**变成了可见的占比；但你砍的是工具白名单，真正难量的是插件本身。`trim_scan_plugins` 会读取每个 bundle 的可归属上下文成本；网页控制台的插件清单新增了 **上下文 / 占比** 两列，并单独标出 `unattributedTokens`，避免把“未归属”误算到某个插件头上。

**54% 是示例降幅，不是关闭目标；关错了比开着更贵。** 判断不是看词像不像：先看本任务/会话是否调用，再看账本、周期和成本；任一不确定只进入复核。平时不吭声、关键时刻才出手的插件最容易误关，周期/触发、已有调用、无账本都会先保护或复核。

判断顺序不是“描述像不像当前任务”这么简单：

| 信号 | 代码里怎么用 | 单独能建议关闭吗 |
|---|---|---|
| 描述 / 名称关键词 | 只计算任务相关性（`taskMatch`） | 不能，最多进入复核 |
| 历史 / 本会话调用 | 有调用记录 → 直接阻止自动建议 | 不能，反而保护 |
| 使用账本窗口内 0 调用 | 必要证据；账本为空时视为“未知” | 不能 |
| 周期 / 触发器语义 | `schedule`、`cron`、`每月`、`周报`、`提醒`、`dream` 等 → 保护 | 不能 |
| 可归属上下文成本 | 成本 > 0 才值得优化 | 不能 |
| 任务置信度 | 低于阈值 → 只复核 | 不能 |

默认 `suggestionPolicy: conservative`：只有**窗口内 0 调用 + 有上下文成本 + 非周期 + 当前任务高置信 + 描述低相关**同时成立，才会出现“建议关闭”。其余全部进入人工复核；应用仍需 `confirm: true` 与宿主审批 `allowed-once`。

这也是为什么不会因为“上次没调用”就误伤每月一次的梦整理：周期/触发器语义是硬保护，历史有调用也会阻止自动建议。

## 核心机制

### 先建议，后授权

`trim_apply_profile` 的 `confirm: true` 只是**提案标记**。默认流程是：

```text
草稿 → confirm: true → ctx.approval.request() → allowed-once → 快照 → 应用
```

- 审批缺失、抛错、`rejected`、`cancelled`、`unavailable` 一律失败即拒绝
- 审批原因带配置集、草稿 id、快照 id 和具体条目
- 只应用低风险、非受保护项；受保护/核心/预设/固定项永不改
- 失败自动回滚；回滚工具同样需要宿主审批

### 兼容性矩阵

覆盖四个域：

| 域 | 例子 |
|---|---|
| 插件 ↔ 插件 | peer 依赖缺失、提示词重复、互斥能力 |
| 插件 ↔ DSH | DSH 版本、Node/平台、官方配置行覆盖 |
| 配置集 | 多个配置集的启用差异、锁文件漂移 |
| 工作区 | `AGENTS.md`/`CLAUDE.md` 与插件规则重叠 |

### 工作流蓝图（暂时废弃）

`dsh-plugin-recipe` 自 2026-11-22 起暂时冻结，不再新增功能。现有安装仍可生成、校验和导出蓝图；DSH 原生 `workflow` 工具已覆盖执行层。详见[暂时废弃说明](#暂时废弃工作流配方)。

## 网页控制台

- **体检结论**：四维状态灯与待办；点击按钮滚动到对应卡片
- **体检与兼容**：摘要指标、兼容性搜索/级别过滤、上下文成本、插件清单搜索/筛选/排序、压缩链路、精简方案、应用/回滚
- **教程**：5 分钟上手、按任务快速开始、常见问题
- **关于**：Hero SVG、项目链接、版本、许可证、版权、QQ 群 `1134419871`、捐赠占位
- **设置**：界面偏好（内容排列/密度/折叠）、可编辑的插件策略（改动后才出现「应用修改」）、检查更新、新建 Issue、保护名单与配置片段
- **对话内**：输入框上方短暂显示「先量成本，再决定关什么」提醒；展开 thought line 显示 token 摘要；只读、每会话一次、可关闭
- 首次启用后，插件管理器会显示 5 步教程卡；主界面右下角还有「更多 → 设置 → 插件体检」路径引导
- 同源 JSON API 校验 DSH 浏览器会话与 `Origin`；未登录返回 401
- 网页界面的应用/回滚按钮本身就是用户操作，因此不重复弹宿主审批；Agent 工具路径默认走审批

详见 [docs/ui.md](docs/ui.md)。

## 工具

| 工具 | 作用 |
|---|---|
| `trim_scan_plugins` | 只读扫描插件、上下文成本、兼容性摘要 |
| `trim_analyze_compatibility` | 只读兼容性矩阵：插件↔插件、插件↔DSH、配置集/工作区 |
| `trim_suggest_profile` | 按任务生成精简方案草稿，不修改插件 |
| `trim_apply_profile` | 提案 + 宿主审批 `allowed-once` 后应用低风险项 |
| `trim_rollback_profile` | 宿主审批后恢复上一次精简方案 |

## 暂时废弃：工作流配方

`dsh-plugin-recipe` 自 **2026-11-22** 起暂时废弃（temporarily deprecated），不再新增功能。

- 现有安装仍可生成、校验和导出蓝图；仅接收安全/兼容修复。
- DSH 原生 `workflow` / `dsh-tool-workflow` 已覆盖执行层；纯静态蓝图不再是最高杠杆。
- 未安装 recipe 时，设置页不再显示「工作流配方」页签；已安装时页签会标注「已冻结」并显示说明。
- npm 包不会被删除；安装旧版本会看到 deprecation 提示。
- 复活条件见 [`packages/plugin-recipe/README.md`](packages/plugin-recipe/README.md)。

## 市场与发布

- npm：<https://www.npmjs.com/package/dsh-plugin-trim>
- Release：<https://github.com/Starlit-Sky-code/dsh-experience-optimizer/releases>
- dshopen.org：<https://dshopen.org/zh/plugins/dsh-plugin-trim/>
- dshbase.com：<https://dshbase.com/plugins/dsh-plugin-trim/>
- dsh.so：<https://www.dsh.so/artifact/dsh-experience-optimizer/>
- DSH 自定义索引：
  ```text
  https://raw.githubusercontent.com/Starlit-Sky-code/dsh-experience-optimizer/main/marketplace/index.json
  ```

市场收录状态见 [marketplace/DISTRIBUTION.md](marketplace/DISTRIBUTION.md)。

## 开发

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
pnpm verify
```

- 设计：[docs/architecture.md](docs/architecture.md)
- 兼容性规则：[docs/compatibility.md](docs/compatibility.md)
- 界面与 API：[docs/ui.md](docs/ui.md)
- 市场文案：[docs/marketing.md](docs/marketing.md)
- 发布状态：[marketplace/STATUS.md](marketplace/STATUS.md)

## 安全

- 默认只建议，不自动禁用。
- Web API 先经过 DSH 连接认证、同源检查和自定义 `x-dsh-trim-client` 请求头；不提供跨站 CORS。
- 兼容性分析只读本地元数据，不执行 `!!js`、不 import 未加载插件、不联网。
- 数据写入 `$DSH_HOME/experience-optimizer/`，目录 `0700`、文件 `0600`。
- 版本豁免、插件升级、patch 编辑只报告，不自动执行。

## 许可证

[AGPL-3.0-only](LICENSE)。修改后通过网络向用户提供服务时，需要按 AGPL 提供对应源代码。

<p align="center"><img src="icon.png" width="56" alt="DSH 插件体检图标"></p>
<p align="center"><sub>Copyright © 2026 Starlit Sky · AGPL-3.0-only</sub></p>
