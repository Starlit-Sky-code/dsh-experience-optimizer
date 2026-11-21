# DSH 插件市场分布审计

更新时间：2026-11-20（npm 发布后复核）

## 结论

npm 已发布 `0.3.2`，并经注册表和临时 DSH profile 双重验证：

- `dsh-plugin-trim@0.3.7`
- `dsh-plugin-recipe@0.3.7`

现在可安装渠道有四个：npm、GitHub Release tarball、固定 Git 源、本仓库自定义索引。
`dshopen.org` 已上线两个插件页；`dshbase.com` 也已出现两个页面，但安装命令仍错误地
指向仓库根目录；`awesome-dsh-plugin` 已合并两个条目；`dsh.so` 仍只有 ecosystem 条目；
`dsh-plugin.org` 仍在等待扫描。

## 矩阵

| 渠道 | 状态 | 证据 | 安装路径 | 缺口 / 动作 |
|---|---|---|---|---|
| npm | **已上线** | <https://www.npmjs.com/package/dsh-plugin-trim> · <https://www.npmjs.com/package/dsh-plugin-recipe> | `dsh plugin --profile web add dsh-plugin-trim@0.3.7`（recipe 同理） | 首发产生 `0.0.0-stage` 占位版本；`latest` 已指向 `0.3.2`，不影响安装 |
| GitHub 仓库 + `dsh-plugin` topic | **已上线** | <https://github.com/Starlit-Sky-code/dsh-experience-optimizer> | Release tarball / 固定 Git 源 | 无 |
| 本仓库自定义 DSH 索引 | **已上线** | <https://raw.githubusercontent.com/Starlit-Sky-code/dsh-experience-optimizer/main/marketplace/index.json> | 在 DSH Discover 添加索引地址 | 可改用 npm 源 |
| dshbase.com | **页面已上线，安装命令待修** | <https://dshbase.com/plugins/dsh-plugin-trim/> · <https://dshbase.com/plugins/dsh-plugin-recipe/> | 页面仍显示 `github:Starlit-Sky-code/dsh-experience-optimizer` | 根包无 `dsh.bundle`，已提交修正评论 [#332](https://github.com/ylwl1997/dshbase/issues/332)；应改为 npm 包名或子目录 |
| dsh.so | **ecosystem 条目已上线；插件级待索引** | <https://www.dsh.so/artifact/dsh-experience-optimizer/> | 页面命令指向根仓库，不挂载插件 | 等 dsh.so 抓取 npm 包；npm 包详情页当前仍 404 |
| dsh-plugin.org | **已接受，等待扫描** | [issue #677](https://github.com/dshplugin/dsh-plugin-hub/issues/677)（CLOSED） | 站点会展示 npm / 源码安装 | 站点页面仍 404；已评论 npm 已发布 |
| dshopen.org | **已上线** | <https://dshopen.org/zh/plugins/dsh-plugin-trim/> · <https://dshopen.org/zh/plugins/dsh-plugin-recipe/>；[#495](https://github.com/polang233/dsh-plugin-index/issues/495) / [#496](https://github.com/polang233/dsh-plugin-index/issues/496) 已关闭并收录 | `dsh plugin --profile web add dsh-plugin-trim@0.3.7` | 页面当前显示 0.2.4，等待更新到 npm 0.3.2；维护者建议后续为写操作接入可信宿主审批 |
| awesome-dsh-plugin | **已合并，0.3.2 更新待合并** | [PR #15271](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/15271) MERGED；[PR #17071](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pull/17071) 更新 tarball 到 0.3.2 | 列表/商店读取 `data/plugins`；条目含 tarball 与 icon | 等待 #17071 合并；README 生成器尚未显示两条 |
| DSH 官方 Discover / 内置 Plugin Hub | **npm 条件已满足；待市场扫描** | npm 包已公开 | `dsh plugin add dsh-plugin-trim@0.3.7` | dsh-plugin.org 扫描后进入 Hub |

## 验证证据

```text
npm view dsh-plugin-trim@0.3.7  → 0.3.2
npm view dsh-plugin-recipe@0.3.7 → 0.3.2

临时 DSH headless profile：
+ dsh-plugin-trim 0.3.2
+ dsh-plugin-recipe 0.3.2
--dump-config 出现两个 bundle row
```

npm CLI 发布输出：

```text
+ dsh-plugin-trim@0.3.7
+ dsh-plugin-recipe@0.3.7
```

首发时 npm 创建了 `0.0.0-stage` 占位版本并短暂显示“processing”；几分钟后 `0.3.2`
成为 `latest`。这属于 npm staged-publishing 的首发包处理，不是失败。

## 待处理

1. **dshbase 页面安装命令**：等待维护者修正为 npm 包名或 `packages/...` 子目录。
2. **dsh.so 插件级索引**：等待下一轮 npm/GitHub 扫描；当前只有 ecosystem 条目。
3. **dsh-plugin.org 扫描**：等待定时任务；页面仍 404。
4. **awesome README 生成**：数据文件已合并，README 生成器尚未显示；等待站点重建。
5. **dshopen 后续建议**：为 `trim_apply_profile` / `trim_rollback_profile` 接入可信宿主审批。
6. **自动发布**：`NPM_TOKEN` 已配置为 GitHub Actions secret；后续 tag 会自动发布 npm。
   token 已在对话中出现过，建议在合适时机轮换成新 token 并更新 secret。

## 相关文档

- [发布状态](STATUS.md)
- [市场提交文案](README.md)
- [dsh-plugin.org 文案](dsh-plugin-org.md)
- [dsh.so 文案](dsh-so.md)
