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
Four-check plugin diagnostics for DSH: load, compatibility, context cost, and compaction-stack conflicts — with measured results and reversible applies.
```

**长描述**

`dsh-experience-optimizer` is the checkup layer for DSH users who have accumulated many
plugins and now face resting context cost and plugin conflicts. The active package is
`dsh-plugin-trim`. It is not a replacement for `dsh-context` or `dsh-plugin-health`; it
answers three narrower questions: which plugin is expensive at rest, is the compaction
stack coherent, and what did an apply actually save?

- Four-check verdict: load / compatibility / context / compaction stack. Each check has
  a status, a count, and drill-down evidence. There is deliberately no 0–100 health score.
- Read-only compaction audit: identifies compaction backends, tool-result pruners, image
  offload, `/compact`, and threshold owners. Duplicate backends, a missing backend, and
  conflicting or out-of-range thresholds are flagged. Active backends are protected from
  disable suggestions.
- Static capability surface: shell, file-write, network, MCP, and `!!js` dynamic config,
  inferred from tool names, MCP rows, and patch sentinels. It is a factual inventory, not
  a security audit, and changes nothing.
- Measured result after apply: trim records the attributable-token and enabled-entry
  baseline before an apply. After a restart, the next checkup settles the measured delta.
  If unrelated plugins changed in the same window, the delta is marked indicative rather
  than claimed as savings.
- Checkup history: one snapshot per checkup, throttled to 10 minutes and capped at 60
  records. Only plugin names, enabled bundle names, token counts, and small counters are
  stored — no prompts, section text, or tool arguments.
- One-click Markdown report: verdict, context, compaction stack, capability surface,
  compatibility findings, history, and measured result in one copyable report.
- Suggestions stay advisory: low-risk items apply only after explicit confirmation; the web
  apply button is a user action, while the agent tool path also asks the host by default
  (`confirm` is a proposal marker, `allowed-once` is the real grant). A snapshot is written
  first; agent-path rollback also requires host approval. Core, preset, and user-pinned
  items never change.
- Read-only analysis: no network requests, no `!!js` execution, no third-party source
  edits; version exemptions and plugin upgrades are reported, never applied automatically.

Token costs are character-based estimates, not billing amounts. 54% is sample data, not a
close target.

`dsh-plugin-recipe` (workflow recipe) is temporarily deprecated as of 2026-11-22:
existing installs keep working, but no new features are planned; DSH native `workflow` /
`dsh-tool-workflow` covers execution.

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
plugin-management
context
compaction
```

**安全说明**

- Read-only compatibility and compaction analysis; no network access and no `!!js` execution.
- Local data under `$DSH_HOME/experience-optimizer/` with `0700` dirs and `0600` files.
- Audit/usage records contain tool names, package names, counts, and summaries only.
- `trim_apply_profile` requires explicit `confirm: true`; host approval (`allowed-once`) is the real grant, and protected items are never changed.
- The capability surface is a static inventory, not a security audit or a security score.
