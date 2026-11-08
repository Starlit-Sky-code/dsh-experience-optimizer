# Changelog

All notable changes to this repository are documented here. Versions follow
[Semantic Versioning](https://semver.org/).

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
