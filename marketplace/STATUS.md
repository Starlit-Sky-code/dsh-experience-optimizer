# 发布状态

更新时间：2026-11-22

## GitHub

- 仓库：<https://github.com/Starlit-Sky-code/dsh-experience-optimizer>
- 默认分支：`main`
- Topics：`dsh-plugin`、`deepseek-harness`、`dsh-plugin-suite`、`plugin-compatibility`
- Release：<https://github.com/Starlit-Sky-code/dsh-experience-optimizer/releases/tag/v0.4.0>
- Release assets：
  - `dsh-plugin-trim-0.4.0.tgz`
  - `dsh-plugin-recipe-0.3.11.tgz`（冻结线，仅废弃说明）
- CI：`.github/workflows/ci.yml`
- Release 工作流：`.github/workflows/release.yml`（已配置 `NPM_TOKEN`；tag 自动 npm 发布并上传 release tarball）
- 安装验证：`dsh plugin add dsh-plugin-trim@0.4.0` 成功；recipe 已冻结，不再作为默认安装项

## 自定义 DSH 插件市场索引

```text
https://raw.githubusercontent.com/Starlit-Sky-code/dsh-experience-optimizer/main/marketplace/index.json
```

索引为 format 1，只包含活跃的 `dsh-plugin-trim`；recipe 已从索引移除。生成与校验：

```bash
pnpm market:index
pnpm market:check
```

## DSH Plugin Hub（dsh-plugin.org）

- 提交 issue：<https://github.com/dshplugin/dsh-plugin-hub/issues/677>（已关闭，等待定时扫描）
- npm 已发布 0.4.0；DSH Plugin Hub 收录仍以 dsh-plugin.org 的扫描结果为准。
- 已在 issue 评论中补充 npm 包链接与安装命令。

## dsh.so

- 已自动收录为 **ecosystem-plugin**：<https://www.dsh.so/artifact/dsh-experience-optimizer/>
- 安全：`LowRisk`；等级：`L5 · Ecosystem plugin`
- **不是可安装插件**：根包没有 `dsh.bundle`，页面给出的 `github:...#v0.2.2` 安装命令不会挂载插件。
- 后续：发布 npm 后让 dsh.so 索引两个子包，或增加根级 meta-bundle。
- 提交文案：[`dsh-so.md`](dsh-so.md)

## 其他市场

- 完整审计：[`DISTRIBUTION.md`](DISTRIBUTION.md)
- **dshopen.org：已上线**
  - <https://dshopen.org/zh/plugins/dsh-plugin-trim/>
  - recipe 页面保留但不再推广（已冻结）
- **dshbase.com：页面已上线，安装命令待修**
  - <https://dshbase.com/plugins/dsh-plugin-trim/>
  - recipe 页面保留但不再推广（已冻结）
- **awesome-dsh-plugin：已合并** [PR #15271](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/15271)；后续版本更新待提交

## npm

- **活跃线**：`dsh-plugin-trim@0.4.0` — <https://www.npmjs.com/package/dsh-plugin-trim>
- **冻结线**：`dsh-plugin-recipe@0.3.11` — <https://www.npmjs.com/package/dsh-plugin-recipe>
- 安装：`npm i dsh-plugin-trim`（新用户不再安装 recipe）
- recipe 已在 registry 标记 deprecated；现有安装继续可用，仅接收安全/兼容修复。
- `latest` 应指向 `0.4.0`；发布后以 `npm view` 为准。
- GitHub Release 工作流已配置 `NPM_TOKEN` secret；后续 tag 会自动 npm 发布。

## Web 控制台

- 设置 → 插件 → 插件体检。
- 预览：[`assets/ui-preview.png`](../assets/ui-preview.png)
- 文档：[`docs/ui.md`](../docs/ui.md)

## 宣传

- 主标语：**少一点插件负担，多一点兼容确定性。**
- 宣传图：[`assets/promo.png`](../assets/promo.png)
- README 横幅：[`assets/banner.png`](../assets/banner.png)
- 文案与市场描述：[`docs/marketing.md`](../docs/marketing.md)
