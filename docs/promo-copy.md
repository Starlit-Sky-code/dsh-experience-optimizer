# dsh-plugin-trim 0.5.7 宣传语料

本文件面向 `dsh-plugin-trim@0.5.7`，内容可直接用于 README、dsh-plugin.org、dsh.so、短视频与社交平台。

口径约定：

- **token 成本为字符估算**，不是账单金额，也不是模型计费。
- **54% 只是示例降幅**，不是关闭目标，也不是任何场景的收益承诺。
- 所有“收益”只指应用低风险项后、由下一次体检结算的**可归属 token 差值**；同窗口有其他插件变化时标“仅供参考”。

---

## 1. 一句话定位（中英）

**中文**

> `dsh-plugin-trim` 不是另一个上下文面板：它回答“哪个插件常驻贵、压缩链路是否打架、关掉之后实测省了多少”。

**English**

> `dsh-plugin-trim` is not another context dashboard. It answers three sharper questions: which plugin is expensive at rest, whether the compaction stack is fighting itself, and what an apply actually saved.

**更短的中文版（适合横幅/视频尾卡）**

> 先体检，再决定关什么。

**更短的英文版（适合横幅/视频尾卡）**

> Measure first. Then decide what to close.

---

## 2. README 首屏块（中英）

以下中文块可直接粘贴到 `README.md` 顶部；英文块对应 `README.en.md`。块内 `assets/...` 路径相对仓库根目录。

### 中文首屏块

```markdown
# DSH 插件体检

<p align="center"><strong>插件体检 × 兼容性检查 × 安全瘦身</strong><br>
回答“哪个插件常驻贵、压缩链路是否打架、关掉之后实测省了多少”。</p>

![DSH 插件体检](assets/banner.svg)

- **四维结论**：加载 / 兼容 / 上下文 / 压缩链路，一屏给结论与可下钻证据。
- **压缩链路只读审计**：双后端、缺后端、阈值冲突直接告警；活跃后端受保护，不会被建议关闭。
- **应用后实测收益**：应用前记录基线，重启后下一次体检结算差值；同窗口其他插件变化标“仅供参考”。

![两帧走查：四维结论 → 压缩链路](assets/walkthrough.gif)

| 工具 | 回答的问题 | 边界 |
|---|---|---|
| `dsh-context` | 这次请求/会话花了多少 token、钱和缓存命中 | 不负责插件常驻成本与压缩链路 |
| `dsh-plugin-health` | 哪个插件坏了、能不能修 | 不负责成本归属与“关掉后省多少” |
| `dsh-plugin-trim` | **哪个插件常驻贵、压缩链路是否打架、关掉之后实测省了多少** | 不替代前两者；不做 0–100 健康分，也不是安全审计 |

> token 成本按字符估算，不是账单金额。
```

### English first-screen block

```markdown
# DSH Plugin Checkup

<p align="center"><strong>Plugin checkup · compatibility checks · safe trimming</strong><br>
Answers: which plugin is expensive at rest, is the compaction stack coherent, and what did an apply actually save?</p>

![DSH Plugin Checkup](assets/banner.svg)

- **Four-check verdict**: load / compatibility / context / compaction stack, with evidence one click away.
- **Read-only compaction audit**: duplicate backends, a missing backend, and threshold conflicts are flagged; active backends are protected from disable suggestions.
- **Measured result after apply**: baseline before apply, delta settled on the next checkup after restart; unrelated changes are marked indicative.

![Two-frame walkthrough: verdict → compaction stack](assets/walkthrough.gif)

| Tool | Answers | Boundary |
|---|---|---|
| `dsh-context` | What did this request/session cost in tokens, money, and cache hits? | Not responsible for per-plugin resting cost or the compaction stack. |
| `dsh-plugin-health` | Which plugin broke, and can it be repaired? | Not responsible for cost attribution or measured savings. |
| `dsh-plugin-trim` | **Which plugin is expensive at rest, is the compaction stack coherent, and what did an apply actually save?** | Does not replace them; no 0–100 health score; not a security audit. |

> Token costs are character-based estimates, not billing amounts.
```

---

## 3. dsh-plugin.org 提交文案

**标题**

```text
DSH Plugin Checkup — 插件体检：常驻成本、压缩链路与实测收益
```

**短描述**

```text
对 DSH 插件的加载、兼容、上下文与压缩链路做四维体检；只读审计双后端/缺后端/阈值冲突，应用后实测收益，可回滚。
```

**长描述**

```text
dsh-plugin-trim 是给装了很多 DSH 插件的开发者的一套“体检”工具，不替代 dsh-context 或 dsh-plugin-health，而是回答更具体的三个问题：哪个插件常驻最贵、压缩链路是否在打架、关掉之后实测省了多少。

- 四维结论：加载 / 兼容 / 上下文 / 压缩链路。每个维度给状态、计数和可下钻证据，不压成 0–100 健康分。
- 压缩链路只读审计：识别压缩后端、工具结果裁剪、图像卸载、/compact、阈值控制面；双后端、缺后端、阈值冲突或越界会直接告警。活跃后端会进入保护名单，不会被建议关闭。
- 静态能力面：按工具名、MCP 行和 patch 哨兵列出 shell / 文件写入 / 网络 / MCP / !!js 五组清单。这是事实清单，不是安全审计，也不改变任何插件。
- 应用后实测收益：应用前记录可归属 token 与启用基线；重启后下一次体检自动结算差值。同窗口内其他插件发生变化时标“差值仅供参考”，不把别人的变化算成自己的收益。
- 体检历史：每次体检保存一条快照（10 分钟节流，最多 60 条），只存插件名、启用 bundle 名与 token 计数等元数据，不存对话、提示词或工具参数。
- 一键复制 Markdown 体检报告：结论、上下文、压缩链路、能力面、兼容发现、历史与实测收益一次带走。
- 默认只建议，网页里点应用就是你的确认，Agent 工具路径默认还需宿主审批（confirm 只是提案标记，allowed-once 才是授权）；应用前写快照，支持回滚。核心、preset、用户锁定项永不改动。
- 分析只读、不联网、不执行 !!js、不修改第三方插件源码；版本豁免和插件升级只报告，不自动执行。

token 成本按字符估算，不是账单金额。54% 是示例降幅，不是关闭目标。dsh-plugin-recipe（工作流配方）已自 2026-11-22 起暂时废弃：不再新增功能，仅保留现有安装的生成/校验/导出能力；DSH 原生 workflow / dsh-tool-workflow 已覆盖执行层。
```

**安装命令**

```bash
# DSH CLI / 插件市场（固定本次发布版本）
dsh plugin --profile web add dsh-plugin-trim@0.5.7

# npm
npm i dsh-plugin-trim@0.5.7
```

**分类**

```text
建议：开发工具 / 插件管理（以 dsh-plugin.org 现有分类为准）
```

**截图链接**

```text
控制台总览：
https://raw.githubusercontent.com/Starlit-Sky-code/dsh-experience-optimizer/main/assets/ui-preview.png

压缩链路：
https://raw.githubusercontent.com/Starlit-Sky-code/dsh-experience-optimizer/main/assets/ui-compaction.png

两帧走查（真实界面，800×900，4 秒循环）：
https://raw.githubusercontent.com/Starlit-Sky-code/dsh-experience-optimizer/main/assets/walkthrough.gif
```

**版本 / 许可证 / 兼容性**

```text
版本：0.5.7
许可证：AGPL-3.0
DSH：>=0.2.2-rc.1 <0.3.0
Node：>=20
维护者：Starlit-Sky-code
```

---

## 4. dsh.so 英文文案

**Title**

```text
DSH Plugin Checkup
```

**Short description**

```text
Four-check plugin diagnostics for DSH: load, compatibility, context cost, and compaction-stack conflicts — with measured results and reversible applies.
```

**Long description**

```text
dsh-plugin-trim is the checkup layer for DSH users who have accumulated many plugins and now face resting context cost and plugin conflicts. It is not a replacement for dsh-context or dsh-plugin-health; it answers three narrower questions: which plugin is expensive at rest, is the compaction stack coherent, and what did an apply actually save?

- Four-check verdict: load / compatibility / context / compaction stack. Each check has a status, a count, and drill-down evidence. There is deliberately no 0–100 health score.
- Read-only compaction audit: identifies compaction backends, tool-result pruners, image offload, /compact, and threshold owners. Duplicate backends, a missing backend, and conflicting or out-of-range thresholds are flagged. Active backends are protected from disable suggestions.
- Static capability surface: shell, file-write, network, MCP, and !!js dynamic config, inferred from tool names, MCP rows, and patch sentinels. It is a factual inventory, not a security audit, and changes nothing.
- Measured result after apply: trim records the attributable-token and enabled-entry baseline before an apply. After a restart, the next checkup settles the measured delta. If unrelated plugins changed in the same window, the delta is marked indicative rather than claimed as savings.
- Checkup history: one snapshot per checkup, throttled to 10 minutes and capped at 60 records. Only plugin names, enabled bundle names, token counts, and small counters are stored — no prompts, section text, or tool arguments.
- One-click Markdown report: verdict, context, compaction stack, capability surface, compatibility findings, history, and measured result in one copyable report.
- Suggestions stay advisory: low-risk items apply only after explicit confirmation; the web apply button is a user action, while the agent tool path also asks the host by default (confirm is a proposal marker, allowed-once is the real grant). A snapshot is written first; agent-path rollback also requires host approval. Core, preset, and user-pinned items never change.
- Read-only analysis: no network requests, no !!js execution, no third-party source edits; version exemptions and plugin upgrades are reported, never applied automatically.

Token costs are character-based estimates, not billing amounts. 54% is sample data, not a close target. dsh-plugin-recipe (workflow recipe) is temporarily deprecated as of 2026-11-22: existing installs keep working, but no new features are planned; DSH native workflow / dsh-tool-workflow covers execution.
```

**Install**

```bash
npm i dsh-plugin-trim@0.5.7
```

**Topics**

```text
dsh-plugin
deepseek-harness
dsh-plugin-suite
plugin-compatibility
plugin-management
context
compaction
```

---

## 5. 30 秒视频脚本（仅脚本，未成片）

**总时长**：30 秒（4 个主镜头 + 2 秒尾卡）

**演示状态说明**：画面里的“2 个后端”“需处理 2 项”是演示状态，不是所有 profile 的固定结果；不要把示例状态说成普遍现象。

### 中文分镜

| 时间 | 镜头 | 画面 | 屏幕文字 | 中文字幕 / 旁白 |
|---|---|---|---|---|
| 0–5s | 1. 双压缩插件 | 设置页，两个压缩插件同时启用；鼠标停在「插件体检」 | 装了两个压缩插件？ | 装了两个压缩插件？先别猜，体检。 |
| 5–13s | 2. 结论条 + 双后端告警 | 四维结论条变为“需处理”；压缩卡标出 2 个后端，兼容卡出现冲突提示 | 双后端 / 缺后端 / 阈值冲突 | 加载、兼容、上下文、压缩链路，一屏四维。双后端、缺后端、阈值打架，直接标出来；活跃后端不会被建议关掉。 |
| 13–21s | 3. 应用低风险项 | 勾选低风险项 → 点应用 → 确认弹窗 → 出现还原点 token | 只应用低风险项 / 网页确认 · Agent 审批 | 只应用低风险项。网页点应用就是确认；Agent 工具默认还要宿主审批。先写快照，随时回滚。 |
| 21–28s | 4. 重启后实测收益 | 重启 DSH，重新打开体检；实测收益卡显示差值，旁边出现“仅供参考”标记 | 重启后，看实测 | 重启后再体检，结算实测差值；同窗口有别的插件变化，标“仅供参考”。 |
| 28–30s | 尾卡 | 产品名、版本、仓库、安装命令 | dsh-plugin-trim 0.5.7 / 先体检，再决定关什么 | （无旁白，轻音乐收尾） |

**尾卡文字**

```text
dsh-plugin-trim 0.5.7
先体检，再决定关什么
dsh plugin --profile web add dsh-plugin-trim@0.5.7
github.com/Starlit-Sky-code/dsh-experience-optimizer
```

### English short version

| Time | Voiceover |
|---|---|
| 0–5s | Two compaction plugins? Run a checkup first. |
| 5–13s | Load, compatibility, context, compaction: four checks, one verdict. Duplicate or missing backends and threshold conflicts are flagged; active backends stay protected. |
| 13–21s | Apply only low-risk items. The web button is your confirmation; agent tools ask the host by default. A snapshot is written first. |
| 21–28s | Restart, reopen, and settle the measured delta. If other plugins changed, the result is marked indicative. |
| 28–30s | dsh-plugin-trim 0.5.7. Measure first, then decide what to close. |

**拍摄注意**

- 只录真实控制台；不要伪造“省了 54%”的收益数字。
- 应用镜头必须露出确认弹窗或宿主审批状态，不能剪成“点一下自动关”。
- 结尾不要加“保证省 X%”“10k 用户”等无法核验的字幕。

---

## 6. 3 条社交文案

### 文案 1：装了两个压缩插件？先体检

**钩子**

```text
装了两个压缩插件？先体检
```

**正文**

```text
别急着删。打开设置 → 插件体检，先看压缩链路：几个后端、谁在管阈值、有没有缺失。活跃后端会被保护，不会建议你把唯一的压缩引擎关掉。先量，再决定。

安装：dsh plugin --profile web add dsh-plugin-trim@0.5.7
```

**配图**

`assets/ui-compaction.png`（压缩链路卡，双后端告警状态）

**标签**

```text
#DSH #DeepSeekHarness #插件开发 #上下文工程
```

### 文案 2：关掉插件到底省没省

**钩子**

```text
关掉插件到底省没省
```

**正文**

```text
别拿别人的 54% 当目标——那只是示例。体检会在应用前记录基线，重启后结算可归属 token 差值；同窗口其他插件有变化，会标“仅供参考”，不把别人的变化算成你的收益。先量，再关。

安装：dsh plugin --profile web add dsh-plugin-trim@0.5.7
```

**配图**

`assets/ui-preview.png`（实测收益卡 / 上下文卡）

**标签**

```text
#DSH #上下文成本 #插件管理 #可观测性
```

### 文案 3：0.5.7 真实控制台截图

**钩子**

```text
0.5.7 真实控制台截图
```

**正文**

```text
四维结论、压缩链路、能力面、实测收益在同一页。截图来自 0.5.7 真实控制台；token 数为字符估算，不是账单。

安装：npm i dsh-plugin-trim@0.5.7
或：dsh plugin --profile web add dsh-plugin-trim@0.5.7
```

**配图**

`assets/ui-preview.png` + `assets/ui-compaction.png`（两张真实控制台截图）

**标签**

```text
#DSH #DeepSeekHarness #插件体检 #开源
```

---

## 7. 事实边界与禁用表述清单

### 可以说的（附出处）

| 表述 | 出处 |
|---|---|
| 四维结论：加载 / 兼容 / 上下文 / 压缩链路 | `packages/plugin-trim/src/verdict.ts` 的 `buildVerdict()` / `compactionCheck()` |
| 压缩链路只读审计，识别双后端、缺后端、阈值冲突/越界 | `packages/plugin-trim/src/compat/compaction.ts` 的 `inspectCompactionStack()` 与 `PP_COMPACTION_*` 冲突码 |
| 活跃后端进入保护名单，不会被建议关闭 | `packages/plugin-trim/src/compat/compaction.ts` 的 `criticalModules`；`packages/plugin-trim/src/protect.ts` 的 `buildProtection({ extraProtect })` |
| 静态能力面：shell / 文件写入 / 网络 / MCP / `!!js`；不是安全审计 | `packages/plugin-trim/src/capability.ts` 的 `inspectCapabilities()` 与 `notes` |
| 应用前记基线，重启后下一次体检结算差值 | `packages/plugin-trim/src/verification.ts` 的 `beginVerification()` / `settleVerification()` |
| 同窗口其他插件变化标“仅供参考” | `packages/plugin-trim/src/verification.ts` 的 `confounded`；`packages/plugin-trim/client.js` 的 `last.confounded` 提示与 `copyCheckupReport()` |
| 体检历史 10 分钟节流、最多 60 条 | `packages/plugin-trim/src/history.ts` 的 `MAX_RECORDS = 60` / `THROTTLE_MS = 10 * 60 * 1000`；`client.js` 的快照文案 |
| 历史只存插件名、启用 bundle 名与 token 计数等元数据，不存对话/提示词/工具参数 | `packages/plugin-trim/src/history.ts` 的 `snapshotRecord()`；`docs/ui.md` 的“自上次体检”一节 |
| 一键复制 Markdown 体检报告 | `packages/plugin-trim/client.js` 的 `copyCheckupReport()` 与「复制报告」按钮 |
| 网页应用/回滚是用户操作；Agent 工具路径默认走宿主审批 | `README.md` 的“网页控制台”一节；`packages/plugin-trim/src/tools.ts` 的 `trim_apply_profile` / `trim_rollback_profile`；`packages/plugin-trim/src/api.ts` 的 `/apply`、`/rollback` |
| 版本 0.5.7，npm 已发布 | `packages/plugin-trim/package.json` 的 `version`；`marketplace/STATUS.md` 的 npm 段；`npm view dsh-plugin-trim dist-tags.latest` → `0.5.7` |
| 54% 是示例降幅，不是关闭目标 | `packages/plugin-trim/client.js` 的 54% 提示；`README.md` 的“建议关闭怎么判断”一节 |
| token 成本按字符估算 | `packages/shared-meta/src/text.ts` 的 `estimateTokens()`；`packages/plugin-trim/src/config.ts` 的 `tokenRatio` |
| `dsh-plugin-recipe` 已暂时废弃，不宣传 | `README.md` 的“暂时废弃：工作流配方”一节；`marketplace/STATUS.md` |

### 禁止说 / 不要暗示

- ❌ “10k 用户”“百万下载”“最受欢迎的 DSH 插件”——没有可核验数据，不写。
- ❌ “保证省 30%”“平均省一半”“立省 X%”——收益取决于 profile 与任务，无法保证。
- ❌ 把“54%”写成目标、承诺或普遍结果——它只是界面示例。
- ❌ “安全审计”“安全评分”“能阻止恶意插件”——能力面只列静态事实。
- ❌ “自动优化”“自动关闭插件”——网页需显式确认；Agent 工具路径默认还需宿主审批。
- ❌ “修复所有兼容问题”“零冲突”——兼容分析只给发现与修复方向。
- ❌ “替代 `dsh-context` / `dsh-plugin-health`”——三者回答不同问题。
- ❌ “兼容所有 DSH 版本”——只声明 `>=0.2.2-rc.1 <0.3.0`。
- ❌ “token 计费精确到元/分”——token 数是字符估算，不是账单。
- ❌ “关掉一定省”——只结算可归属 token 差值，可能被同窗口变化影响。
- ❌ “100% 识别插件归属”——无法归属的部分明确标为 `unattributed`。
- ❌ 把 `dsh-plugin-recipe` 的工作流蓝图当作当前卖点——它已暂时废弃，只保留说明。
- ❌ “零风险”“绝对安全”“不会误关”——只承诺保护名单、确认/审批、快照与回滚这些机制。

### 数字口径

| 数字 | 口径 | 发布时怎么写 |
|---|---|---|
| 54% | 界面示例降幅 | “54% 是示例降幅，不是关闭目标” |
| 12.4k tokens | 某次演示的上下文估算 | 标注“字符估算”，不要写成账单 |
| 10 分钟 / 60 条 | 体检快照节流与上限 | 可直接写，属于产品行为 |
| 2 个后端 / 需处理 2 项 | 演示 profile 的状态 | 标注“演示状态”，不要写成普遍现象 |
| 0.5.7 | 当前发布版本 | 安装命令固定 `@0.5.7` |
| 30 秒 | 视频时长（脚本，未成片） | 成片控制在 28–30 秒，尾卡不抢旁白 |

### 发布前检查

- [ ] 所有 token 数字旁边有“字符估算”或同义标注。
- [ ] 所有收益表述都能落到“应用前基线 → 重启后结算 → 可能仅供参考”。
- [ ] 没有用户量、下载量、排名、奖项等未核验数据。
- [ ] 没有把能力面写成安全审计。
- [ ] 没有把 recipe 的工作流蓝图写成当前卖点。
- [ ] 安装命令带 `@0.5.7`，或明确说明省略版本号即取 latest。
- [ ] 截图/GIF 均来自 0.5.7 真实控制台；发布前确认 `assets/walkthrough.gif` 已入库。
