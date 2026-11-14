# DSH 插件市场分布审计

更新时间：2026-11-14

## 结论

当前真正**可安装**的公开渠道只有两个：

1. GitHub Release tarball / 固定 Git 源；
2. 本仓库的 DSH format-1 自定义索引。

`dsh.so` 已自动收录仓库，但它是 **ecosystem-plugin**（根目录没有 `dsh.bundle`），
安装命令不会挂载任何插件；`dsh-plugin.org` 已接受提交、等待定时扫描；
`dshopen.org`、`dshbase.com` 尚未收录；npm 仍未发布，这是进入各市场
「一键安装」和 DSH 内置 Plugin Hub 的主要门槛。

## 矩阵

| 渠道 | 类型 | 当前状态 | 证据 | 安装路径 | 缺口 / 动作 |
|---|---|---|---|---|---|
| GitHub 仓库 + `dsh-plugin` topic | 源码 / 发现 | **已上线** | <https://github.com/Starlit-Sky-code/dsh-experience-optimizer> | Release tarball 或 `git+...#commit&path:/packages/...` | 无 |
| 本仓库自定义 DSH 索引 | format-1 索引 | **已上线** | <https://raw.githubusercontent.com/Starlit-Sky-code/dsh-experience-optimizer/main/marketplace/index.json> | 在 DSH Discover 添加上面的索引地址；源固定到 Git commit | 无；需 npm 才能进入内置 Plugin Hub |
| dsh.so | 社区市场 | **已收录，但为 ecosystem 条目** | <https://www.dsh.so/artifact/dsh-experience-optimizer/> | 页面命令：`dsh plugin --profile web add github:Starlit-Sky-code/dsh-experience-optimizer#v0.2.2` | 根目录没有 `dsh.bundle`，页面明确提示“installing it adds no plugin functionality”；不是可用的插件条目 |
| dsh-plugin.org | 社区市场 | **提交已关闭 / 等待扫描** | [issue #677](https://github.com/dshplugin/dsh-plugin-hub/issues/677)（CLOSED；维护者回复会自动扫描） | 站点会展示源码安装命令；DSH 内置 Plugin Hub 需要 npm | 站点页面暂为 404；内置 Hub 需要 npm 包 |
| dshopen.org（开放插件市场） | 社区市场 + 索引 | **未收录** | 在 <https://dshopen.org/index.json>（约 1.9 MB）中未找到本仓库 | 可提交仓库子目录 / 固定 Git 提交 | 提交模板要求 npm 版本或经确认的固定 Git；当前没有 npm |
| dshbase.com | 社区目录 | **未发现** | `/plugins/dsh-experience-optimizer/` 重定向到目录页并显示 “No plugins” | 以 npm 为主 | 未收录；需要 npm 或人工提交 |
| npm | 包注册表 | **未发布** | `npm view dsh-plugin-trim` → 404 | `dsh plugin add dsh-plugin-trim` | 需要 npm 登录并发布两个包 |
| DSH 官方 Discover / 内置 Plugin Hub | 官方入口 | **未收录** | 内置 Hub 只展示 npm 可安装包 | 自定义索引可替代 | npm 是硬门槛 |

## 关键证据

### dsh.so

索引记录：

```json
{
  "id": "dsh-experience-optimizer",
  "kind": "ecosystem-plugin",
  "install": "dsh plugin --profile web add github:Starlit-Sky-code/dsh-experience-optimizer#v0.2.2",
  "verification": { "level": 5, "label": "L5 · Ecosystem plugin" },
  "security": { "status": "audited", "riskLevel": "low" }
}
```

页面明确说明：根包声明没有 `dsh.bundle`、不挂载插件能力，安装它不会增加插件功能。
它被当作“生态仓库”而不是插件。**不要把这个命令当作套件安装命令使用**；
请用 Release tarball 或自定义索引。

### dsh-plugin.org

提交 issue 已由维护者关闭，回复说明：

- 收录是全自动的，由定时仓库扫描完成；
- 下一轮扫描会出现在网站上；
- DSH 内置 Plugin Hub 只列 npm 一键安装包；
- 没有 npm 的仓库仍会出现在网站，用户可从 README 复制源码安装命令。

### npm

```text
npm view dsh-plugin-trim → 404
npm view dsh-plugin-recipe → 404
```

## 建议优先级

1. **发布 npm 包**：`dsh-plugin-trim@0.2.3`、`dsh-plugin-recipe@0.2.3`。
   这是 dsh-plugin.org 内置 Hub、dsh.so 插件级条目、dshopen.org 收录的共同前提。
2. **修正 dsh.so 的套件条目**：发布 npm 后让 dsh.so 分别索引两个包；或增加一个
   根级 meta-bundle，让 `github:...#tag` 真正挂载两个插件。
3. **dsh-plugin.org**：等待扫描；无需重复提交。
4. **dshopen.org**：npm 发布后用仓库子目录路径提交两个包；若暂不发 npm，
   只能走固定 Git 提交，需维护者确认。
5. **dshbase.com / awesome 列表**：非核心渠道，npm 发布后再补。

## 相关文档

- [发布状态](STATUS.md)
- [市场提交文案](README.md)
- [dsh-plugin.org 文案](dsh-plugin-org.md)
- [dsh.so 文案](dsh-so.md)
