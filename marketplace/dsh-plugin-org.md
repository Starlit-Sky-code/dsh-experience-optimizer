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
context
```

**标题**

```text
DSH Plugin Checkup — 插件体检、兼容性检查与安全瘦身
```

**短描述**

```text
四维体检 DSH 插件的上下文成本、兼容性与压缩链路，生成可解释、可回滚的精简方案；只在用户确认后应用低风险项。
```

**安装命令**

```bash
dsh plugin --profile web add dsh-plugin-trim
```

**长描述**

`dsh-experience-optimizer` 面向已安装多个 DSH 插件、但被上下文成本和插件冲突困扰的
开发者。核心是 `dsh-plugin-trim`：

- 四维结论：加载、兼容、上下文、压缩链路；对插件↔插件、插件↔DSH 运行时、
  Profile/工作区之间的冲突生成兼容性矩阵；按任务给出可解释的保留/启用/禁用建议。
- 只读压缩链路审计：识别双后端、缺失后端、阈值冲突；活跃后端不会被建议关闭。
- 默认只建议，显式确认后才应用，并可一键回滚；核心、preset、用户锁定项永不改动。
- 分析只读、不联网、不执行 `!!js`、不修改第三方插件源码；版本豁免和插件升级只报告，
  不自动执行。

`dsh-plugin-recipe`（工作流配方）已自 2026-11-22 起暂时废弃：不再新增功能，现有安装
仍可生成/校验/导出蓝图；DSH 原生 `workflow` / `dsh-tool-workflow` 已覆盖执行层。
许可证 AGPL-3.0。

**许可证**

AGPL-3.0

**兼容性**

DSH `>=0.2.2-rc.1 <0.3.0`；Node `>=20`。

**维护者**

Starlit-Sky-code
