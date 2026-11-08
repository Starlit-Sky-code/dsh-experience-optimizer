# dsh.so 提交文案

**提交对象**

仓库：`https://github.com/Starlit-Sky-code/dsh-experience-optimizer`

发布 npm 后也可以分别提交：

- `dsh-plugin-trim`
- `dsh-plugin-recipe`

**Entry type**

`dsh plugin (installable via dsh plugin add)`

**标题**

```text
DSH Experience Optimizer
```

**短描述**

```text
Plugin diet, compatibility diagnostics, and workflow blueprints for DeepSeek Harness.
```

**长描述**

`dsh-experience-optimizer` is a two-plugin suite for DSH users who have accumulated many
plugins and now face context cost, plugin conflicts, and workflow setup friction.

- `dsh-plugin-trim` scans installed bundles and the live prompt context, builds a
  compatibility matrix across plugin↔plugin, plugin↔DSH runtime, and profile/workspace
  boundaries, and drafts an explainable keep/enable/disable plan. Nothing changes until
  the user explicitly confirms; every apply is snapshot-backed and reversible. Core,
  preset, and user-pinned items are protected.
- `dsh-plugin-recipe` turns a business goal into a validated workflow blueprint with
  steps, capability seams, minimum plugin set, permissions, failure policy, acceptance
  checklist, and rollback. Validation covers missing tools, cycles, schedule service,
  human confirmation, rollback, and compatibility findings.

The analysis is local and read-only: no network requests, no `!!js` execution, no
third-party source edits, and no automatic version exemptions or upgrades. License: MIT.
DSH: `>=0.2.2-rc.1 <0.3.0`; Node: `>=20`.

**安装命令**

```bash
dsh plugin --profile web add "https://github.com/Starlit-Sky-code/dsh-experience-optimizer/releases/download/v0.1.0/dsh-plugin-trim-0.1.0.tgz"
dsh plugin --profile web add "https://github.com/Starlit-Sky-code/dsh-experience-optimizer/releases/download/v0.1.0/dsh-plugin-recipe-0.1.0.tgz"
```

**Topics**

```text
dsh-plugin
deepseek-harness
dsh-plugin-suite
plugin-compatibility
workflow
```

**安全说明**

- Read-only compatibility analysis; no network access.
- Local data under `$DSH_HOME/experience-optimizer/` with `0700` dirs and `0600` files.
- Audit/usage records contain tool names, package names, counts, and summaries only.
- `trim_apply_profile` requires explicit `confirm: true`; protected items are never changed.
