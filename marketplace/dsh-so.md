# dsh.so 提交文案

**提交对象**

仓库：`https://github.com/Starlit-Sky-code/dsh-experience-optimizer`

发布 npm 后提交：

- `dsh-plugin-trim`

`dsh-plugin-recipe` 已暂时废弃，不再作为新条目推广；现有安装继续可用。

**Entry type**

`dsh plugin (installable via npm i)`

**标题**

```text
DSH Plugin Checkup
```

**短描述**

```text
Read-only plugin context cost and compatibility diagnostics for DeepSeek Harness.
```

**长描述**

`dsh-experience-optimizer` is the checkup layer for DSH users who have accumulated many
plugins and now face context cost and plugin conflicts. The active package is
`dsh-plugin-trim`:

- scans installed bundles and the live prompt context, builds a compatibility matrix
  across plugin↔plugin, plugin↔DSH runtime, and profile/workspace boundaries, and drafts
  an explainable keep/enable/disable plan.
- Nothing changes until the user explicitly confirms; every apply is snapshot-backed and
  reversible. Core, preset, and user-pinned items are protected.
- The analysis is local and read-only: no network requests, no `!!js` execution, no
  third-party source edits, and no automatic version exemptions or upgrades.

`dsh-plugin-recipe` (workflow recipe) is temporarily deprecated as of 2026-11-22:
existing installs keep working, but no new features are planned; DSH native
`workflow` / `dsh-tool-workflow` covers execution.

License: AGPL-3.0. DSH: `>=0.2.2-rc.1 <0.3.0`; Node: `>=20`.

**安装命令**

```bash
npm i dsh-plugin-trim
```

**Topics**

```text
dsh-plugin
deepseek-harness
dsh-plugin-suite
plugin-compatibility
context
```

**安全说明**

- Read-only compatibility analysis; no network access.
- Local data under `$DSH_HOME/experience-optimizer/` with `0700` dirs and `0600` files.
- Audit/usage records contain tool names, package names, counts, and summaries only.
- `trim_apply_profile` requires explicit `confirm: true`; protected items are never changed.
