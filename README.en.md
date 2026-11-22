# DSH Plugin Checkup

<p align="center"><strong>English</strong> · <a href="README.md">简体中文</a> · <a href="https://starlit-sky-code.github.io/dsh-experience-optimizer/">Live site</a></p>

![DSH Plugin Checkup](assets/banner.svg)

<p align="center">
  <a href="https://github.com/Starlit-Sky-code/dsh-experience-optimizer/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/Starlit-Sky-code/dsh-experience-optimizer/actions/workflows/ci.yml/badge.svg"></a>
  <a href="https://www.npmjs.com/package/dsh-plugin-trim"><img alt="npm dsh-plugin-trim" src="https://img.shields.io/npm/v/dsh-plugin-trim?label=dsh-plugin-trim"></a>
  <a href="LICENSE"><img alt="License: AGPL-3.0" src="https://img.shields.io/badge/License-AGPL--3.0-blue.svg"></a>
</p>

<p align="center"><strong>Plugin checkup · compatibility checks · safe trimming</strong><br>
Read-only context and conflict analysis; low-risk actions apply only after confirmation, with snapshots and rollback.</p>

## Install

```bash
# npm
npm i dsh-plugin-trim

# DSH CLI / plugin market:
dsh plugin --profile web add dsh-plugin-trim
```

> No `@version` means latest.
> If the plugin does not appear in Settings, reload DSH and confirm the dependency is installed in the current workspace; use the Release tarball below if npm CDN returns 404.

Open **Settings → Plugin checkup** after installing.

<details>
<summary>GitHub Release fallback</summary>

```bash
npm i "https://github.com/Starlit-Sky-code/dsh-experience-optimizer/releases/download/v0.4.0/dsh-plugin-trim-0.4.0.tgz"
```

For source development, see [Development](#development).

</details>

## What it does

![Plugin checkup console](assets/ui-preview.png)

- **`dsh-plugin-trim`** scans plugin context cost and compatibility, then builds an explainable keep/enable/disable plan. Low-risk items are applied only after explicit confirmation and host approval; a restore point is written first.
- `dsh-plugin-recipe` is **temporarily deprecated**. Existing installs keep working, but no new features are planned; DSH native workflow tools cover execution.
- **Guide / About / Settings** tabs make the first run explicit instead of hiding safety rules in documentation; About includes an inline hero SVG, real links, copyright, QQ group `1134419871`, and clearly marked donation placeholders.
- Settings includes layout/density/collapse preferences, editable plugin policy fields with an Apply button that appears after changes, an npm update check, and Issue shortcuts. A first-run activation card shows the five-step tutorial after enabling; a one-time main-screen guide also points to More → Settings → Plugin checkup.
- In conversation: a brief “Measure first, then decide what to close” reminder above the composer, and a token strip in expanded reasoning. Read-only, once per session, dismissible.
- **English and Chinese UI** can be switched at runtime.

![Two paths, one authorization boundary](assets/readme/flow.svg)

## How “close candidate” is decided

A description match is only a relevance signal. It never produces a close suggestion on its own.

A plugin goes to review instead when it:

- has historical or session calls;
- has schedule/trigger semantics (for example monthly, weekly, `cron`, reminder, dream);
- has no usable usage ledger;
- has low task confidence.

A close candidate requires **zero calls in the usage window + non-zero attributable context cost + no schedule/trigger hint + high task confidence + low task match**. Even then, it is only a suggestion: confirmation and host approval are still required.

**54% is sample data, not a close target. A wrong close costs more than keeping it on.** The decision is not a keyword match: task/session use, the ledger, schedule, and cost all matter; any uncertainty goes to review. Quiet plugins that only wake up at the right moment are the easiest to close by mistake, so schedules, prior calls, or no ledger keep them protected or in review.

## Safety

- Read-only scanning; no `!!js`, no importing unloaded plugins, no network analysis.
- Protected, core, preset, and pinned items never change.
- `confirm: true` is a proposal marker; host approval returning `allowed-once` is the real grant.
- Rollback is also approval-gated.
- Data lives under `$DSH_HOME/experience-optimizer/` with `0700` / `0600` permissions.

## Development

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
pnpm verify
```

- Design: [architecture](docs/architecture.md)
- Compatibility rules: [compatibility](docs/compatibility.md)
- UI and API: [UI](docs/ui.md)

## Temporarily deprecated: workflow recipe

`dsh-plugin-recipe` is **temporarily deprecated** as of **2026-11-22**.

- Existing installs can still generate, validate, and export blueprints; security and compatibility fixes only.
- DSH native `workflow` / `dsh-tool-workflow` already cover execution; static blueprints are no longer the highest-leverage layer.
- The recipe tab is hidden when the package is not installed. When installed, it shows a **Frozen** badge and a deprecation notice.
- The npm package stays published; installing it shows a deprecation warning.
- Revival criteria are documented in [`packages/plugin-recipe/README.md`](packages/plugin-recipe/README.md).

## Links

- npm: <https://www.npmjs.com/package/dsh-plugin-trim>
- Releases: <https://github.com/Starlit-Sky-code/dsh-experience-optimizer/releases>
- Issues: <https://github.com/Starlit-Sky-code/dsh-experience-optimizer/issues>
- Docs: [architecture](docs/architecture.md) · [compatibility](docs/compatibility.md) · [UI](docs/ui.md)

## License

[AGPL-3.0-only](LICENSE). If you modify and provide this software over a network, you must offer the corresponding source.

<p align="center"><img src="icon.png" width="56" alt="DSH Plugin Checkup icon"></p>
<p align="center"><sub>Copyright © 2026 Starlit Sky · AGPL-3.0-only</sub></p>
