# 宣传与发布素材

## 宣传标语

**主标语（中文）**

> 不是另一个上下文面板，而是插件体检。

**副标语**

> 先量常驻成本，再看压缩链路，最后用实测决定关什么。

**英文**

> Not another context dashboard. A checkup for what stays expensive.

**一句话介绍**

> `dsh-plugin-trim` 回答三个问题：哪个插件常驻贵、压缩链路是否打架、关掉之后实测省了多少。

## 短描述（≤ 120 字符）

> 对 DSH 插件的加载、兼容、上下文与压缩链路做四维体检；只读审计双后端/缺后端/阈值冲突，应用后实测收益，可回滚。

## 长描述

`dsh-experience-optimizer` 面向已安装多个 DSH 插件、但被常驻上下文成本和插件冲突困扰的
开发者。核心是 `dsh-plugin-trim`：它不替代 `dsh-context` 或 `dsh-plugin-health`，而是回答
更具体的三个问题——哪个插件常驻最贵、压缩链路是否在打架、关掉之后实测省了多少。

- 四维结论：加载 / 兼容 / 上下文 / 压缩链路；每个维度给状态、计数与可下钻证据，不压成
  0–100 健康分。
- 压缩链路只读审计：识别压缩后端、工具结果裁剪、图像卸载、`/compact`、阈值控制面；
  双后端、缺后端、阈值冲突或越界会告警。活跃后端进入保护名单，不会被建议关闭。
- 静态能力面：shell / 文件写入 / 网络 / MCP / `!!js` 五组清单；按工具名、MCP 行和 patch
  哨兵推断，不是安全审计，也不改变任何插件。
- 应用后实测收益：应用前记录可归属 token 与启用基线；重启后下一次体检结算差值；同窗口
  其他插件变化标“仅供参考”，不把别人的变化算成自己的收益。
- 体检历史：10 分钟节流、最多 60 条；只存插件名、启用 bundle 名与 token 计数等元数据，
  不存对话、提示词或工具参数。
- 一键复制 Markdown 体检报告；默认只建议，网页里点应用就是你的确认，Agent 工具路径默认
  还需宿主审批（`confirm` 只是提案标记，`allowed-once` 才是授权）；应用前写快照，支持回滚。

token 成本按字符估算，不是账单金额；54% 是示例降幅，不是关闭目标。

`dsh-plugin-recipe`（工作流配方）已自 2026-11-22 起暂时废弃：不再新增功能，仅保留现有
安装的生成/校验/导出能力；DSH 原生 `workflow` / `dsh-tool-workflow` 已覆盖执行层。

设计原则是“建议而非擅自执行”：受保护的核心/preset/用户锁定项永不改动；版本豁免、
插件升级和 patch 编辑只报告，不自动执行；只读分析不联网、不执行 `!!js`、不修改
第三方插件源码。

## 关键词

`dsh`, `dsh-plugin`, `deepseek-harness`, `plugin-manager`, `compatibility`,
`context`, `context-cost`, `compaction`, `plugin-audit`, `plugin-suite`,
`plugin-diet`, `plugin-conflict`

## 宣传图

- `assets/promo.png` — 1200×630，GitHub social preview / 市场宣传图
- `assets/promo.svg` — 可编辑源文件
- `assets/banner.png` — 1600×500，README 顶部横幅
- `assets/banner.svg` — 可编辑源文件
- `assets/walkthrough.gif` — 两帧走查（四维结论 → 压缩链路，真实 UI，800×900，4 秒循环）
- `icon.png` — 320×320，套件与两个插件的图标

重新生成：

```bash
pnpm promo
```

脚本使用 `rsvg-convert` 或 ImageMagick 将 SVG 转为 PNG；如果二者都不可用，只保留 SVG。

## 发布口径

- 不写用户量、下载量、排名、奖项等无法核验的数据。
- 收益只描述“应用前基线 → 重启后结算”的实测差值，不承诺百分比。
- 54% 只作示例降幅，不是关闭目标；token 数字标注“字符估算”。
- 能力面只列静态事实，不写成安全审计。
- `dsh-plugin-recipe` 已暂时废弃，不作为当前卖点。

## 市场提交信息

### DSH Plugin Hub（dsh-plugin.org）

- 提交页：https://dsh-plugin.org/zh/submit
- 要求：公开 GitHub 仓库、`dsh-plugin` topic、README 安装命令、`apply(ctx)`、许可证。
- 提交文案：见 `marketplace/dsh-plugin-org.md`（标题 / 短描述 / 长描述 / 安装命令 / 分类 / 截图链接）

### dsh.so

- 提交页：https://www.dsh.so/submit/
- 要求：DSH 兼容信号（`dsh` 字段 / topic）、README 安装说明、SPDX 许可证、可扫描源码、
  安全扫描通过。
- 提交文案：见 `marketplace/dsh-so.md`（英文标题 / 短描述 / 长描述 / topics）

### DSH 自定义插件市场索引

`marketplace/index.json` 是格式 1 的 DSH 插件市场索引。把它托管到 GitHub Pages 或
raw.githubusercontent.com 后，在 DSH 的插件市场设置中加入索引 URL 即可。

```bash
pnpm market:index
```

生成后会在 `marketplace/index.json` 写入 `dsh-plugin-trim` 的条目；`dsh-plugin-recipe`
已暂时废弃，不再进入索引。
