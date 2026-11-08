# dsh-plugin-recipe

把业务目标翻译成可校验、可导出的 DSH 工作流蓝图。

## 安装

从 GitHub Release 安装（当前推荐，无需 npm）：

```bash
dsh plugin --profile web add "https://github.com/Starlit-Sky-code/dsh-experience-optimizer/releases/download/v0.2.1/dsh-plugin-recipe-0.2.1.tgz"
```

发布到 npm 后：

```bash
dsh plugin --profile web add dsh-plugin-recipe
```

本地开发：

```bash
dsh plugin --profile web add /absolute/path/to/packages/plugin-recipe
```

## Web 控制台

`dsh-plugin-trim` 的 Web 控制台包含「工作流配方」页签；本插件提供其 Host API，
用于生成和导出蓝图。安装两个插件后即可在 **设置 → 插件 → 体验优化** 使用。

## 工具

| 工具 | 读写 | 说明 |
|---|---|---|
| `recipe_plan_workflow` | 只读 | 最多 4 组追问，输出蓝图/步骤/最小插件集/权限/失败策略/验收/回滚 |
| `recipe_validate_workflow` | 只读 | 校验依赖、工具、循环、schedule 服务、人工确认、兼容性 |
| `recipe_export_workflow` | 写数据目录 | 导出 Markdown + JSON 到 `$DSH_HOME/experience-optimizer/recipe/blueprints` |

## 使用流程

1. 用户说：“我想每周自动整理项目周报。”
2. 模型调用 `recipe_plan_workflow({ goal })`。
3. 工具返回一个关键问题（项目/频率、数据源、输出/交付、失败/验收）；模型把用户回答填入 `answers` 后再次调用。
4. 答案足够后返回蓝图；模型调用 `recipe_validate_workflow`。
5. 用户要求导出时调用 `recipe_export_workflow`。

## 自定义能力

在 `$DSH_HOME/experience-optimizer/capabilities.json` 写一个数组，或 `{ "capabilities": [...] }`：

```json
[
  {
    "id": "dingtalk-send",
    "name": "发送到钉钉",
    "purpose": "把周报推送到钉钉群",
    "tools": ["notify_ding"],
    "trigger": "manual",
    "permissions": ["external-send"],
    "needsConfirm": true,
    "keywords": ["钉钉", "发送", "通知"],
    "pluginIds": ["dsh-notify-ding"]
  }
]
```

同 id 会覆盖内置能力。没有对应工具的能力不会被用于生成步骤。

## 配置

| key | 默认 | 说明 |
|---|---|---|
| `maxSteps` | `12` | 超过给 warn |
| `allowExport` | `true` | 是否允许写蓝图文件 |
| `capabilitiesFile` | `''` | 自定义能力文件路径；空则用数据目录默认路径 |
| `defaultDelivery` | `present` | 未命名发送能力时的默认交付 |

## 限制

- 不自动创建 schedule、不发消息、不改插件。
- 没有发送工具时只报告 `uncertainties`，不编造步骤。
- 兼容性报告存在 error 的主体不会进入蓝图；validate 会给出 `COMPAT_CONFLICT`。
- agent preset 自带工具由 preset 提供，蓝图按“当前可用”生成，不承诺 trim 可开关。
