# Gitee 镜像

Gitee Pages 已于 2024 年停止服务，2025–2026 年仍未恢复，因此本项目**不把 Gitee Pages 作为主站或 CI 部署目标**。主站继续使用 GitHub Pages：

<https://starlit-sky-code.github.io/dsh-experience-optimizer/>

如果只是希望国内也能访问仓库内容，可以启用可选的 Gitee 镜像工作流 `.github/workflows/gitee-mirror.yml`。

## 配置

在 GitHub 仓库的 **Settings → Secrets and variables → Actions** 中添加：

- Secret `GITEE_OWNER`：Gitee 用户名或组织名
- Secret `GITEE_TOKEN`：Gitee 私人令牌（需要仓库写权限）
- Variable `GITEE_REPO`：Gitee 仓库名，例如 `dsh-experience-optimizer`
- Variable `GITEE_BRANCH`：可选，默认 `master`

在 Gitee 先创建空仓库；工作流会在每次 `promo-site` 推送时强制同步 `promo-site` 到该分支。

没有配置这些变量时，工作流只输出一条 notice 并成功跳过，不会产生失败通知。

## 限制

- 镜像的是 **站点分支**，不是 GitHub Pages 的部署产物；Gitee Pages 不可用时不能直接作为网页访问。
- 需要公网可访问的静态站点时，优先考虑 **Cloudflare Pages**、**Netlify** 或自己的服务器；把 `site/` 目录作为静态根目录即可。
