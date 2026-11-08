# Changelog

All notable changes to this repository are documented here. Versions follow
[Semantic Versioning](https://semver.org/).

## [0.2.1] - 2026-11-08

### Fixed

- The Web console's slim-suggestion list now hides protected `keep` rows, so a
  profile with many protected plugins shows only actionable suggestions; an empty
  state explains when nothing can be trimmed.
- Metric cards use `auto-fit` columns so four cards do not get cramped inside the
  Settings modal.

## [0.2.0] - 2026-11-08

### Added

- Web console for `dsh-plugin-trim`, registered as the **Settings → Plugins → 体验优化**
  tab:
  - context and compatibility overview;
  - explainable slim suggestions with low-risk selection and a confirmation modal;
  - apply result, rollback token, and one-click rollback;
  - workflow recipe form, blueprint preview, validation issues, and Markdown/JSON export.
- Same-origin host APIs:
  - `/api/dsh-experience-optimizer/overview|suggest|apply|rollback`;
  - `/api/dsh-experience-optimizer/recipe/plan|export`.
- `dsh-shared-meta/http.ts` for origin checks, bounded JSON bodies, and JSON responses.
- `dsh.client` / `exports["./client"]` packaging for the browser half; packaging
  verification now checks the client bundle.

### Security

- UI APIs validate the DSH browser session through Connection `requestRejection()`
  and reject cross-site requests; unauthenticated calls return 401.
- Apply still requires `confirm: true`, low-risk items only, snapshots, and automatic
  rollback on failure.

### Changed

- Release workflow now builds and uploads both release tarballs automatically.
- Install docs and market copy use the 0.2.0 release assets.

### Tests

- 65 tests, including HTTP helper coverage and client packaging checks.

## [0.1.0] - 2026-11-08

### Added

- `dsh-plugin-trim` host bundle:
  - read-only plugin/context scan with real prompt section/tool token estimates;
  - compatibility matrix for plugin↔plugin, plugin↔DSH/Node/platform, and
    profile/workspace drift;
  - explainable slim-profile drafts with protected core/preset/user-pinned items;
  - explicit `confirm: true` apply with crash-safe snapshots, automatic rollback,
    and profile-scoped rollback tokens;
  - local usage ledger and audit log, both metadata-only.
- `dsh-plugin-recipe` host bundle:
  - four-question wizard that translates a business goal into a workflow blueprint;
  - weekly-report and generic templates;
  - validation for dependencies, tools, schedule service, human confirmation,
    rollback, acceptance criteria, and compatibility findings;
  - Markdown/JSON runbook export into the DSH data directory.
- `dsh-shared-meta` private workspace package, inlined into both plugin bundles.
- Format-1 DSH plugin market index generator and submission packet.
- Promotional banner/social image and localized marketing copy.
- GitHub Actions CI and tag-based npm release workflow.
- Icon for both plugins and the repository.
