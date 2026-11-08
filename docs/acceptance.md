# 验收

## 自动检查

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
pnpm verify
```

`pnpm verify` 会：

1. 构建 shared-meta、plugin-recipe、plugin-trim；
2. 检查两个插件的 `package.json`、`dsh.bundle.patch`、`dist` 导出；
3. 确认 dist 不再 import `dsh-shared-meta`；
4. 跑全部 vitest。

## 临时 profile 冒烟

```bash
DSH_BIN=/path/to/dsh pnpm smoke:profile
```

脚本会：

1. 创建 `dsh-exp-smoke-<pid>` profile；
2. 用 `dsh plugin add <local package>` 安装两个插件；
3. `dsh --profile ... --dump-config` 断言两个 bundle 行存在；
4. 只删除这个临时 profile。

> 如果当前环境的 `pnpm` 是 shebang-less shim，需要给它一个 wrapper 或把可执行 pnpm 放入 PATH。

## 手动验收

### A. 扫描与兼容性

1. 在测试 profile 安装 `dsh-plugin-trim`。
2. 问：“扫描当前插件上下文成本”。
3. 期望 `trim_scan_plugins`：
   - 显示真实 prompt section/tool 成本；
   - 显示 preset 提供、不可调整的模块；
   - 显示兼容性摘要。
4. 问：“检查当前插件兼容性”。
5. 期望 `trim_analyze_compatibility`：
   - 输出矩阵与详细发现；
   - 对已知核心 bundle 不产生 error；
   - 写 `<dshHome>/experience-optimizer/compat/report.json`；
   - 明确“未修改任何插件”。

### B. 精简方案与回滚

1. 说：“为当前修 bug 任务生成精简方案”。
2. 期望 `trim_suggest_profile`：
   - 任务 tag/置信度/关键词证据；
   - keep/enable/disable/review 及证据；
   - 只写本地草稿，不改插件状态。
3. 明确说：“同意应用这些低风险项”。
4. 期望 `trim_apply_profile`：
   - 只应用 `risk: low` 的项；
   - 受保护项不出现；
   - 返回 rollbackToken；
   - 如遇失败，自动回滚本次已成功项。
5. 说：“回滚刚才的变更”。
6. 期望 `trim_rollback_profile` 恢复应用前状态；若用户手动改过，标 `externally-changed` 而不是覆盖。

### C. 兼容性驱动的建议

1. 在测试 profile 中制造一个可安全复现的冲突（例如启用两个声明同一 row id 的可选 bundle）。
2. 运行 `trim_analyze_compatibility`，期望出现 `PP_ROW_DUPLICATE` 或 `PP_RUNTIME_REGISTRATION_FAILED`。
3. 运行 `trim_suggest_profile`，期望冲突主体进入 `review` 或受保护的 disable 建议，而不是自动应用。
4. 若用户显式选择其中一项并确认，`trim_apply_profile` 可将其标为 `fixKind: conflict`。

### D. 周报蓝图

1. 安装 `dsh-plugin-recipe`。
2. 说：“我想每周自动整理项目周报，数据来自 Git log”。
3. 期望 `recipe_plan_workflow`：
   - 最多 4 组追问；
   - 默认值合理（当前工作区、每周一 09:00、Git log、Markdown、present）；
   - 最终蓝图含 s1 读取 Git → s2 模型汇总 → s3 写 Markdown → s4 交付（confirm）→ s5 schedule（confirm）。
4. 说：“校验这个蓝图”。
5. 期望 `recipe_validate_workflow` 无 error；若缺少发送工具，有 `uncertainties` 而不是编造步骤。
6. 说：“导出蓝图”。
7. 期望在 `<dshHome>/experience-optimizer/recipe/blueprints/` 生成 `.md` 与 `.json`。

## 成功标准

- 建议有证据、可解释、可回滚。
- 默认不改插件；应用只改低风险项；受保护项永不改。
- 兼容性报告能发现服务/row/MCP/运行时/ profile 漂移，并给出修复方向。
- 周报目标能在少量对话内产出可校验蓝图，缺失能力明确列出。
- 失败时能恢复，不静默覆盖用户手动改动。
- 不出现“为了优化而新增更多上下文/规则”的副作用。
