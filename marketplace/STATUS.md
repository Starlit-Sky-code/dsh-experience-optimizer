# 发布状态

更新时间：2026-11-08

## GitHub

- 仓库：<https://github.com/Starlit-Sky-code/dsh-experience-optimizer>
- 默认分支：`main`
- Topics：`dsh-plugin`、`deepseek-harness`、`dsh-plugin-suite`、`plugin-compatibility`、`workflow`
- Release：<https://github.com/Starlit-Sky-code/dsh-experience-optimizer/releases/tag/v0.2.0>
- Release assets：
  - `dsh-plugin-trim-0.2.0.tgz`
  - `dsh-plugin-recipe-0.2.0.tgz`
- CI：`.github/workflows/ci.yml`
- Release 工作流：`.github/workflows/release.yml`（没有 `NPM_TOKEN` 时跳过 npm 发布，仅创建 GitHub release；自动上传 release tarball）
- 安装验证：在临时 headless profile 中执行 `dsh plugin add <release tarball>` 与 `dsh plugin add <pinned git spec>` 均成功，`--dump-config` 出现 `dsh-plugin-trim` row

## 自定义 DSH 插件市场索引

```text
https://raw.githubusercontent.com/Starlit-Sky-code/dsh-experience-optimizer/main/marketplace/index.json
```

索引为 format 1，包含两个插件，Git 源固定到提交
`143297e7fe7dd5038b0304bc23d667c017d287b3`。生成与校验：

```bash
pnpm market:index
pnpm market:check
```

## DSH Plugin Hub（dsh-plugin.org）

- 提交 issue：<https://github.com/dshplugin/dsh-plugin-hub/issues/677>
- 仓库已具备公开仓库、`dsh-plugin` topic、README 安装命令、`apply(ctx)`、MIT 许可证。
- 当前没有 npm 包，因此只能作为 GitHub/Git 源索引；应用内一键安装需要后续 npm 发布。

## dsh.so

- 提交页：<https://www.dsh.so/submit/>
- 仓库满足其公开条件：DSH 字段、README 安装说明、SPDX 许可证、可扫描源码。
- dsh.so 的提交需要浏览器表单与安全扫描结果，尚未自动提交。
- 提交文案：[`dsh-so.md`](dsh-so.md)

## npm

- 未发布（用户选择暂缓）。
- 发布前需要在 GitHub 仓库配置 `NPM_TOKEN` secret，然后推送 `v0.1.0` tag 或手动执行：
  ```bash
  pnpm --filter dsh-plugin-trim publish --access public --no-git-checks
  pnpm --filter dsh-plugin-recipe publish --access public --no-git-checks
  ```

## Web 控制台

- 设置 → 插件 → 体验优化。
- 预览：[`assets/ui-preview.png`](../assets/ui-preview.png)
- 文档：[`docs/ui.md`](../docs/ui.md)

## 宣传

- 主标语：**少一点插件负担，多一点兼容确定性。**
- 宣传图：[`assets/promo.png`](../assets/promo.png)
- README 横幅：[`assets/banner.png`](../assets/banner.png)
- 文案与市场描述：[`docs/marketing.md`](../docs/marketing.md)
