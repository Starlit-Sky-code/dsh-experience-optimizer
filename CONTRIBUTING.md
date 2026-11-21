# Contributing

## Development

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
pnpm verify
```

- `pnpm verify` builds all three packages, checks the plugin manifests/bundle patches/icons,
  and runs the full vitest suite.
- `pnpm smoke:profile` installs both local bundles into a temporary DSH profile and asserts
  that `dsh --dump-config` contains their rows. It requires a runnable `dsh` and `pnpm`;
  set `DSH_BIN` when `dsh` is not on `PATH`.

## Layout

```text
packages/shared-meta/   private types, storage, audit, text helpers (bundled)
packages/plugin-trim/   diet + compatibility host plugin
packages/plugin-recipe/ workflow blueprint host plugin
scripts/                packaging, profile smoke, market index, promo assets
marketplace/            DSH format-1 index and submission packet
assets/                 promotional images
```

## Rules

- Do not modify third-party plugin sources. Compatibility and dedupe are advisory only.
- Keep compatibility analysis read-only. It must not execute `!!js`, import unloaded
  plugins, grant version exemptions, or edit profile patches.
- `trim_apply_profile` must require explicit `confirm: true` and never touch protected
  core/preset/user-pinned items.
- Do not add a runtime dependency on `dsh-shared-meta`; it is inlined at build time.
- Add tests for every new compatibility code or scoring rule.

## 版本节奏

- **每累计 3 个用户可见的大更改，才发布一次补丁版本（小版本）。**
- 大更改包括：用户可见的行为/算法/API/UI、许可证、安装或兼容性变化。
- 纯文档、测试、注释、依赖补丁和内部重构不单独计数，也不为单个小改动 bump 版本。
- 同一批 3 个大更改共用一个版本号；紧急安全修复可以例外，但要在 CHANGELOG 说明。
- 未凑满 3 个大更改时，改动进入 `CHANGELOG.md` 的 `Unreleased`，不发布 npm/Release。

## Release

1. Update `CHANGELOG.md` and all package versions.
2. `pnpm verify`.
3. Commit and tag `vX.Y.Z`.
4. Push the commit and tag. The release workflow publishes both plugin packages from
   the tag and creates a GitHub release.

`NPM_TOKEN` must be configured as a repository secret for the release workflow.
