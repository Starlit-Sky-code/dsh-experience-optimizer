# AGENTS.md

本仓库的长期协作约定。

## 语言

- README、UI、错误信息以中文为主；保留代码标识符、命令、API 名称和必要技术术语。
- 不在 README/UI 中混用大段英文；新增用户可见文案时优先中文。

## 版本节奏

- **默认只升 patch（第三位，如 0.5.1）。**
- **minor / major 必须同时满足：用户明确同意 + 本次代码净增 ≥1000 行（或存在破坏性 API）。**
  不得因为“功能听起来大”升 minor；0.5.0 是一次例外，之后不再重复。
- **每累计 3 个用户可见的大更改，才发布一次补丁版本。**
- 大更改：用户可见的行为/算法/API/UI、许可证、安装或兼容性变化。
- 文档、测试、注释、依赖补丁、内部重构不单独计数；不为单个小改动 bump。
- 未凑满 3 个大更改时，写入 `CHANGELOG.md` 的 `Unreleased`，不发布 npm/Release。
- 紧急安全修复可例外，但必须在 CHANGELOG 标注原因。

## 不可破坏的边界

- `trim_apply_profile` 必须保留 `confirm: true` + 宿主审批 `allowed-once`；`confirm` 不是授权。
- `trim_rollback_profile` 始终需要宿主审批。
- 周期/触发器、已有调用记录、无使用账本、低置信度不得成为自动“建议关闭”。
- 默认 `suggestionPolicy: conservative`；`balanced` 是显式 opt-in。
- 兼容性分析保持只读：不执行 `!!js`、不 import 未加载插件、不联网、不改 patch。
- 不修改第三方插件源码。

## 验证

```bash
pnpm verify
```

新增兼容性代码、评分规则、API 路由或 UI 页面时，必须补测试并更新 README/CHANGELOG。
