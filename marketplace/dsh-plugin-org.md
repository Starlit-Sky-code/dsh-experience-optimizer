# DSH Plugin Hub 提交文案

**仓库**

```text
https://github.com/Starlit-Sky-code/dsh-experience-optimizer
```

**建议 Topics**

```text
dsh-plugin
deepseek-harness
dsh-plugin-suite
plugin-compatibility
plugin-management
context
compaction
```

**标题**

```text
DSH Plugin Checkup — 插件体检：常驻成本、压缩链路与实测收益
```

**短描述**

```text
对 DSH 插件的加载、兼容、上下文与压缩链路做四维体检；只读审计双后端/缺后端/阈值冲突，应用后实测收益，可回滚。
```

**安装命令**

```bash
# DSH CLI / 插件市场（固定本次发布版本）
dsh plugin --profile web add dsh-plugin-trim@0.5.6

# npm
npm i dsh-plugin-trim@0.5.6
```

**长描述**

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
  核心、preset、用户锁定项永不改动。
- 分析只读、不联网、不执行 `!!js`、不修改第三方插件源码；版本豁免和插件升级只报告，
  不自动执行。

token 成本按字符估算，不是账单金额；54% 是示例降幅，不是关闭目标。

`dsh-plugin-recipe`（工作流配方）已自 2026-11-22 起暂时废弃：不再新增功能，仅保留现有
安装的生成/校验/导出能力；DSH 原生 `workflow` / `dsh-tool-workflow` 已覆盖执行层。
许可证 AGPL-3.0。

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
版本：0.5.6
许可证：AGPL-3.0
DSH：>=0.2.2-rc.1 <0.3.0
Node：>=20
维护者：Starlit-Sky-code
```
