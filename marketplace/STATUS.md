# 发布状态

更新时间：2026-11-08

## GitHub

- 仓库：<https://github.com/Starlit-Sky-code/dsh-experience-optimizer>
- 默认分支：`main`
- Topics：`dsh-plugin`、`deepseek-harness`、`dsh-plugin-suite`、`plugin-compatibility`、`workflow`
- Release：<https://github.com/Starlit-Sky-code/dsh-experience-optimizer/releases/tag/v0.2.3>
- Release assets：
  - `dsh-plugin-trim-0.2.3.tgz`
  - `dsh-plugin-recipe-0.2.3.tgz`
- CI：`.github/workflows/ci.yml`
- Release 工作流：`.github/workflows/release.yml`（没有 `NPM_TOKEN` 时跳过 npm 发布，仅创建 GitHub release；自动上传 release tarball）
- 安装验证：在临时 headless profile 中执行 `dsh plugin add <release tarball>` 与 `dsh plugin add <pinned git spec>` 均成功，`--dump-config` 出现 `dsh-plugin-trim` row

## 自定义 DSH 插件市场索引

```text
https://raw.githubusercontent.com/Starlit-Sky-code/dsh-experience-optimizer/main/marketplace/index.json
```

索引为 format 1，包含两个插件，Git 源固定到提交
`64ee5acfced68f611483fec8fc8944cbb53a2a22`。生成与校验：

```bash
pnpm market:index
pnpm market:check
```

## DSH Plugin Hub（dsh-plugin.org）

- 提交 issue：<https://github.com/dshplugin/dsh-plugin-hub/issues/677>（已关闭，等待定时扫描）
- 维护者回复：仓库会被自动索引；没有 npm 的仓库只出现在网站，不进入 DSH 内置 Plugin Hub。
- 当前站点页面仍为 404；npm 是应用内一键安装的门槛。

## dsh.so

- 已自动收录为 **ecosystem-plugin**：<https://www.dsh.so/artifact/dsh-experience-optimizer/>
- 安全：`LowRisk`；等级：`L5 · Ecosystem plugin`
- **不是可安装插件**：根包没有 `dsh.bundle`，页面给出的 `github:...#v0.2.2` 安装命令不会挂载插件。
- 后续：发布 npm 后让 dsh.so 索引两个子包，或增加根级 meta-bundle。
- 提交文案：[`dsh-so.md`](dsh-so.md)

## 其他市场

- 完整审计：[`DISTRIBUTION.md`](DISTRIBUTION.md)
- dshopen.org：未收录；需要 npm 或固定 Git 提交。
- dshbase.com：未发现；需要 npm 或人工提交。

## npm

- 未发布（用户选择暂缓）；`npm view dsh-plugin-trim` 返回 404。
- 发布前需要在 GitHub 仓库配置 `NPM_TOKEN` secret，然后推送 `v0.2.3` tag 或手动执行：
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
