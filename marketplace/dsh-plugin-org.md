# DSH Plugin Hub 提交文案

**仓库**

```text
https://github.com/StarlitSky/dsh-experience-optimizer
```

**建议 Topics**

```text
dsh-plugin
deepseek-harness
dsh-plugin-suite
plugin-compatibility
workflow
```

**标题**

```text
DSH Experience Optimizer — 插件减负、兼容性体检与工作流蓝图
```

**短描述**

```text
扫描 DSH 插件上下文成本与兼容性冲突，生成可回滚的精简方案，并把业务目标翻译成可校验的工作流蓝图。
```

**安装命令**

```bash
dsh plugin --profile web add dsh-plugin-trim
dsh plugin --profile web add dsh-plugin-recipe
```

**长描述**

`dsh-experience-optimizer` 面向已安装多个 DSH 插件、但被上下文成本、插件冲突和编排门槛
困扰的开发者。它由两个可独立安装的插件组成：

- `dsh-plugin-trim`：扫描插件与当前 prompt 的真实上下文成本；对插件↔插件、插件↔DSH
  运行时、Profile/工作区之间的冲突生成兼容性矩阵；按任务给出可解释的保留/启用/禁用建议。
  默认只建议，显式确认后才应用，并可一键回滚；核心、preset、用户锁定项永不改动。
- `dsh-plugin-recipe`：把“每周自动整理项目周报”这类业务目标翻译成步骤、能力、最小插件集、
  权限、失败策略、验收清单和回滚说明，并校验依赖、循环、人工确认和兼容性冲突。

分析只读、不联网、不执行 `!!js`、不修改第三方插件源码；版本豁免和插件升级只报告，
不自动执行。许可证 MIT。

**许可证**

MIT

**兼容性**

DSH `>=0.2.2-rc.1 <0.3.0`；Node `>=20`。

**维护者**

StarlitSky
