# 宣传与发布素材

## 宣传标语

**主标语（中文）**

> 少一点插件负担，多一点兼容确定性。

**副标语**

> 让 DSH 插件生态更轻、更兼容、更可验证。

**英文**

> Trim the noise. Keep the power.

**一句话介绍**

> 插件体检 × 兼容性检查 × 安全瘦身：给装了很多 DSH 插件的开发者的一套“体检”工具。

## 短描述（≤ 120 字符）

> 四维体检插件成本、兼容性与压缩链路，生成可解释、可回滚的精简方案。

## 长描述

`dsh-experience-optimizer` 面向已安装多个 DSH 插件、但被上下文成本和插件冲突困扰的
开发者。核心是 `dsh-plugin-trim`：扫描插件与当前 prompt 的真实上下文成本，按任务给出
可解释的保留/启用/禁用建议；对插件↔插件、插件↔DSH 运行时、Profile/工作区之间的冲突
生成兼容性矩阵和只读压缩链路审计；所有变更默认只是建议，显式确认后才应用，并可一键回滚。

`dsh-plugin-recipe`（工作流配方）已自 2026-11-22 起暂时废弃：不再新增功能，现有安装
仍可生成/校验/导出蓝图；DSH 原生 `workflow` / `dsh-tool-workflow` 已覆盖执行层。

设计原则是“建议而非擅自执行”：受保护的核心/preset/用户锁定项永不改动；版本豁免、
插件升级和 patch 编辑只报告，不自动执行；只读分析不联网、不执行 `!!js`、不修改
第三方插件源码。

## 关键词

`dsh`, `dsh-plugin`, `deepseek-harness`, `plugin-manager`, `compatibility`,
`context`, `plugin-suite`, `plugin-diet`, `plugin-conflict`

## 宣传图

- `assets/promo.png` — 1200×630，GitHub social preview / 市场宣传图
- `assets/promo.svg` — 可编辑源文件
- `assets/banner.png` — 1600×500，README 顶部横幅
- `assets/banner.svg` — 可编辑源文件
- `icon.png` — 320×320，套件与两个插件的图标

重新生成：

```bash
pnpm promo
```

脚本使用 `rsvg-convert` 或 ImageMagick 将 SVG 转为 PNG；如果二者都不可用，只保留 SVG。

## 市场提交信息

### DSH Plugin Hub（dsh-plugin.org）

- 提交页：https://dsh-plugin.org/zh/submit
- 要求：公开 GitHub 仓库、`dsh-plugin` topic、README 安装命令、`apply(ctx)`、许可证。
- 提交文案：见 `marketplace/dsh-plugin-org.md`

### dsh.so

- 提交页：https://www.dsh.so/submit/
- 要求：DSH 兼容信号（`dsh` 字段 / topic）、README 安装说明、SPDX 许可证、可扫描源码、
  安全扫描通过。
- 提交文案：见 `marketplace/dsh-so.md`

### DSH 自定义插件市场索引

`marketplace/index.json` 是格式 1 的 DSH 插件市场索引。把它托管到 GitHub Pages 或
raw.githubusercontent.com 后，在 DSH 的插件市场设置中加入索引 URL 即可。

```bash
pnpm market:index
```

生成后会在 `marketplace/index.json` 写入 `dsh-plugin-trim` 的条目；`dsh-plugin-recipe`
已暂时废弃，不再进入索引。
