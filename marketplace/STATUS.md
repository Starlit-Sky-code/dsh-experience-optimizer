# 发布状态

更新时间：2026-11-08

## GitHub

- 仓库：<https://github.com/Starlit-Sky-code/dsh-experience-optimizer>
- 默认分支：`main`
- Topics：`dsh-plugin`、`deepseek-harness`、`dsh-plugin-suite`、`plugin-compatibility`、`workflow`
- Release：<https://github.com/Starlit-Sky-code/dsh-experience-optimizer/releases/tag/v0.2.4>
- Release assets：
  - `dsh-plugin-trim-0.2.4.tgz`
  - `dsh-plugin-recipe-0.2.4.tgz`
- CI：`.github/workflows/ci.yml`
- Release 工作流：`.github/workflows/release.yml`（没有 `NPM_TOKEN` 时跳过 npm 发布，仅创建 GitHub release；自动上传 release tarball）
- 安装验证：在临时 headless profile 中执行 `dsh plugin add <release tarball>` 与 `dsh plugin add <pinned git spec>` 均成功，`--dump-config` 出现 `dsh-plugin-trim` row

## 自定义 DSH 插件市场索引

```text
https://raw.githubusercontent.com/Starlit-Sky-code/dsh-experience-optimizer/main/marketplace/index.json
```

索引为 format 1，包含两个插件，Git 源固定到提交
`ec49e78675e59e9886090472c213ad0086051e97`。生成与校验：

```bash
pnpm market:index
pnpm market:check
```

## DSH Plugin Hub（dsh-plugin.org）

- 提交 issue：<https://github.com/dshplugin/dsh-plugin-hub/issues/677>（已关闭，等待定时扫描）
- npm 已发布 0.2.4，内置 Plugin Hub 的条件已满足；站点页面仍为 404，等待扫描。
- 已在 issue 评论中补充 npm 包链接与安装命令。

## dsh.so

- 已自动收录为 **ecosystem-plugin**：<https://www.dsh.so/artifact/dsh-experience-optimizer/>
- 安全：`LowRisk`；等级：`L5 · Ecosystem plugin`
- **不是可安装插件**：根包没有 `dsh.bundle`，页面给出的 `github:...#v0.2.2` 安装命令不会挂载插件。
- 后续：发布 npm 后让 dsh.so 索引两个子包，或增加根级 meta-bundle。
- 提交文案：[`dsh-so.md`](dsh-so.md)

## 其他市场

- 完整审计：[`DISTRIBUTION.md`](DISTRIBUTION.md)
- dshopen.org：已提交 [#495](https://github.com/polang233/dsh-plugin-index/issues/495)（trim）与 [#496](https://github.com/polang233/dsh-plugin-index/issues/496)（recipe），待审核。
- dshbase.com：已提交 [#332](https://github.com/ylwl1997/dshbase/issues/332)，待审核。
- awesome-dsh-plugin：已开 [PR #15271](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/15271)，CI 进行中。

## npm

- **已发布 0.2.4**：
  - <https://www.npmjs.com/package/dsh-plugin-trim>
  - <https://www.npmjs.com/package/dsh-plugin-recipe>
- 安装：`dsh plugin --profile web add dsh-plugin-trim@0.2.4` / `dsh-plugin-recipe@0.2.4`
- 注册表已验证：`npm view` 返回 0.2.4；临时 profile 安装成功。
- 首发触发了 npm 的 staged-publishing 占位版本 `0.0.0-stage`；`latest` 已指向 `0.2.4`，不影响安装。
- GitHub Release 工作流仍没有 `NPM_TOKEN` secret；后续 tag 自动发布前需要配置新的 token。

## Web 控制台

- 设置 → 插件 → 体验优化。
- 预览：[`assets/ui-preview.png`](../assets/ui-preview.png)
- 文档：[`docs/ui.md`](../docs/ui.md)

## 宣传

- 主标语：**少一点插件负担，多一点兼容确定性。**
- 宣传图：[`assets/promo.png`](../assets/promo.png)
- README 横幅：[`assets/banner.png`](../assets/banner.png)
- 文案与市场描述：[`docs/marketing.md`](../docs/marketing.md)
