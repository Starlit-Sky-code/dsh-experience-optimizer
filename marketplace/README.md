# DSH 插件市场条目

本目录包含 `dsh-experience-optimizer` 的 DSH 格式 1 市场索引与社区市场提交文案。

## 1. 自定义 DSH 插件市场索引

`index.json` 是 [DSH Plugin Market](../../docs/compatibility.md) 可读取的格式 1 索引。
它把两个插件都列在同一个 `plugin-suite` 分类下，并使用当前 Git commit 作为 Git 安装源。

生成（必须在插件源码提交之后运行）：

```bash
pnpm market:index
```

生成后托管到 GitHub：

- `https://raw.githubusercontent.com/StarlitSky/dsh-experience-optimizer/main/marketplace/index.json`
- 或在 GitHub Pages 上提供同样的 JSON 文件。

在 DSH 的「设置 → 插件市场」中加入该索引 URL，用户即可搜索并安装
`dsh-plugin-trim` / `dsh-plugin-recipe`。

> 索引里的 `commit` 是生成时的 `HEAD`。发布新版本后重新运行 `pnpm market:index`，
> 提交并推送新的索引。

## 2. DSH Plugin Hub（dsh-plugin.org）

收录要求（摘自其提交页与教程）：

- 公开 GitHub 仓库；
- 仓库 Topics 包含 `dsh-plugin`；
- README 包含 `dsh plugin --profile web add <包名>` 形式的安装命令；
- 插件导出 `apply(ctx)`；
- 许可证清晰；
- 不在名称上冒充官方。

提交入口：<https://dsh-plugin.org/zh/submit>

提交文案见 [`dsh-plugin-org.md`](dsh-plugin-org.md)。

## 3. dsh.so

收录要求（摘自其提交页）：

- DSH 兼容信号：`dsh` 字段 / `cordis` 或 `agent.cordis` manifest / `dsh.plugin.*` / topic `dsh-plugin`；
- README 有安装说明；
- 开源许可证（SPDX 标识）；
- 合法插件 id（仓库名或 npm 包名 slug）；
- 可扫描源码；
- 安全扫描通过。

提交入口：<https://www.dsh.so/submit/>

提交文案见 [`dsh-so.md`](dsh-so.md)。

## 4. npm

两个插件包已配置 `publishConfig.access: public`，并通过 tag 触发的 Release 工作流发布。
首次发布需要：

1. 在 GitHub 仓库 Settings → Secrets 中配置 `NPM_TOKEN`；
2. 推送 `v0.1.0` tag；
3. 工作流运行 `pnpm verify` 后依次发布 `dsh-plugin-trim`、`dsh-plugin-recipe`。

发布后，dsh-plugin.org / dsh.so 可以直接用 npm 包名收录，用户也可以：

```bash
dsh plugin --profile web add dsh-plugin-trim
dsh plugin --profile web add dsh-plugin-recipe
```
