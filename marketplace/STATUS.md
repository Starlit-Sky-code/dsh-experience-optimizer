# 发布状态

更新时间：2026-11-22（版本 0.5.9；复核市场收录与视觉素材）

## 市场快照（2026-11-22 13:30）

| 渠道 | 状态 | 版本 / 证据 | 待处理 |
|---|---|---|---|
| npm | ✅ 可安装 | `dsh-plugin-trim@0.5.9`；近 7 天下载 996 | 无 |
| GitHub Release | ✅ 可下载 | `v0.5.9`；正文 ≤10 行 | 无 |
| 自定义市场索引 | ✅ 有效 | `marketplace/index.json` → 0.5.9 | 无 |
| dsh-plugin.org | ❌ 404 | issue #880 OPEN，6 条评论，无 maintainer 回复 | 确认 monorepo 扫描；必要时独立根包仓库 |
| dshopen.org | ⚠️ 版本滞后 | 页面仍 0.3.9 | 等索引刷新或 issue #495 跟进 |
| dshbase.com | ⚠️ 版本与命令错误 | `softwareVersion: 0.2.4`；安装仍指向 github 根仓库 | issue #332 已关闭但未修；需重新反馈 |
| dsh.so | ⚠️ 仅 ecosystem | 根仓库 artifact 200；不是可安装插件 | 等 npm 子包被索引或提交 meta-bundle |
| awesome-dsh-plugin | ⚠️ PR 待合并 | PR #17688 OPEN，目标 0.5.9；当前数据仍 0.3.1 | 等维护者合并 |

## GitHub

- 仓库：<https://github.com/Starlit-Sky-code/dsh-experience-optimizer>
- 默认分支：`main`
- Topics：`dsh-plugin`、`deepseek-harness`、`dsh-plugin-suite`、`plugin-compatibility`
- Release：<https://github.com/Starlit-Sky-code/dsh-experience-optimizer/releases/tag/v0.5.9>
- Release assets：
  - `dsh-plugin-trim-0.5.9.tgz`
  - `dsh-plugin-recipe-0.3.11.tgz`（冻结线，仅废弃说明）
- CI：`.github/workflows/ci.yml`
- Release 工作流：`.github/workflows/release.yml`（已配置 `NPM_TOKEN`；tag 自动 npm 发布并上传 release tarball）
- Release body 由 `scripts/release-notes.mjs` 从 CHANGELOG 生成，≤10 行，带安装命令；不再只显示 `Full Changelog` 链接
- 安装验证：`npm i dsh-plugin-trim`（0.5.9）成功；recipe 已冻结，不再作为默认安装项

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

- 提交 issue：<https://github.com/dshplugin/dsh-plugin-hub/issues/880>（**OPEN**，2026-11-22 10:17 创建，等待扫描/收录）
- 当前 release：`dsh-plugin-trim@0.5.9`（npm latest 与 GitHub Release 一致）
- 站点 listing 仍 **404**：<https://dsh-plugin.org/plugins/dsh-plugin-trim>（扫描/收录未完成，与 npm 发布状态无关）
- issue 评论时间线（5 条，均为我方补版本信息，maintainer 尚未回复）：
  - 0.5.0 · 10:23 · 首次发布验证 + 安装命令 + 四维体检说明
  - 0.5.1 · 10:33 · 应用后实测收益、静态能力面；声明取代 0.5.0
  - 0.5.2 · 10:44 · 体检历史趋势、自上次体检差值、回滚收据
  - 0.5.3 · 10:53 · 类别构成、宿主基线、复制体检报告、apply 收据容错
  - 0.5.4 · 11:13 · optional peer 不再误报、可选平台包降为 warning、能力面不再列核心 `!!js`、结论文案两行网格；README/宣传站换成真实控制台截图；已附 npm/Release 链接与安装命令
- 0.5.4 评论于 11:27 追加视觉材料（**编辑原评论，未新增第六条**）：走查 GIF + `ui-preview` / `ui-compaction` 两张真实截图链接。
- 0.5.8 发布后在该评论末尾追加一行“0.5.8 已发布（上下文预算、吸附应用条）”，仍保持 5 条评论。
- **下一步**：等待 dsh-plugin.org 定时扫描或人工确认。已有 0.5.0–0.5.4 五条评论，不再重复刷 issue；只有维护者回复或扫描失败时才补充一次。

## dsh.so

- 已自动收录为 **ecosystem-plugin**：<https://www.dsh.so/artifact/dsh-experience-optimizer/>
- 安全：`LowRisk`；等级：`L5 · Ecosystem plugin`
- **不是可安装插件**：根包没有 `dsh.bundle`，页面给出的 `github:...#v0.2.2` 安装命令不会挂载插件。
- 后续：发布 npm 后让 dsh.so 索引两个子包，或增加根级 meta-bundle。
- 提交文案：[`dsh-so.md`](dsh-so.md)

## 其他市场

- 完整审计：[`DISTRIBUTION.md`](DISTRIBUTION.md)
- **dshopen.org：已上线，但版本滞后（2026-11-22 复核）**
  - <https://dshopen.org/zh/plugins/dsh-plugin-trim/>
  - 页面仍写“最新版本 0.3.9”，未跟随 npm 0.5.9；等待索引刷新，不另行提交。
  - recipe 页面保留但不再推广（已冻结）
- **dshbase.com：页面已上线，版本与安装命令均滞后（2026-11-22 复核）**
  - <https://dshbase.com/plugins/dsh-plugin-trim/>
  - 页面仍显示 0.2.4，安装命令仍指向 `github:Starlit-Sky-code/dsh-experience-optimizer`（根包无 `dsh.bundle`，不会挂载插件）
  - recipe 页面保留但不再推广（已冻结）
- **awesome-dsh-plugin：已提交版本更新 PR [#17688](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/17688)（v0.3.1 → v0.5.9，等待合并）**
- 原条目仍在，数据滞后（2026-11-22 复核）
  - README 已列出 `#plugin-trim`；`data/plugins/Starlit-Sky-code__dsh-experience-optimizer--packages-plugin-trim.yml` 的 tarball 仍指 **0.3.1**，未跟到 0.5.9
  - 已合并 [PR #15271](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/15271)；后续版本更新待提交

## npm

- **活跃线**：`dsh-plugin-trim@0.5.9` — <https://www.npmjs.com/package/dsh-plugin-trim>
- **冻结线**：`dsh-plugin-recipe@0.3.11` — <https://www.npmjs.com/package/dsh-plugin-recipe>
- 安装：`npm i dsh-plugin-trim`（新用户不再安装 recipe）
- recipe 已在 registry 标记 deprecated；现有安装继续可用，仅接收安全/兼容修复。
- `latest` 应指向 `0.5.9`；发布后以 `npm view` 为准。
- GitHub Release 工作流已配置 `NPM_TOKEN` secret；后续 tag 会自动 npm 发布。

## Web 控制台

- 设置 → 插件 → 插件体检。
- 预览：[`assets/ui-preview.png`](../assets/ui-preview.png)
- 压缩链路：[`assets/ui-compaction.png`](../assets/ui-compaction.png)
- 走查 GIF：[`assets/walkthrough.gif`](../assets/walkthrough.gif)（2 帧 · 800px · 2 秒/帧 · 循环 · 约 80KB；真实截图合成，仅加字幕条）
- 文档：[`docs/ui.md`](../docs/ui.md)

## 宣传

- 主标语：**少一点插件负担，多一点兼容确定性。**
- 宣传图：[`assets/promo.png`](../assets/promo.png)
- README 横幅：[`assets/banner.png`](../assets/banner.png)
- 宣传站：<https://starlit-sky-code.github.io/dsh-experience-optimizer/>（`promo-site` 分支；新增走查 GIF 区块）
- 走查 GIF（线上）：<https://starlit-sky-code.github.io/dsh-experience-optimizer/assets/walkthrough.gif>
- 文案与市场描述：[`docs/marketing.md`](../docs/marketing.md)
