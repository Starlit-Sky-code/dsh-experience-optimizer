# Changelog

All notable changes to this repository are documented here. Versions follow
[Semantic Versioning](https://semver.org/).

## [0.3.2] - 2026-11-21

### Changed

- Disable suggestions are now **evidence-first by default** (`suggestionPolicy: conservative`):
  - a description/keyword match alone never produces a disable suggestion;
  - plugins with historical or session calls, periodic/trigger semantics, no usage ledger,
    or low task confidence are routed to manual review;
  - a disable candidate requires a real ledger with zero calls to that plugin, non-zero
    attributable context cost, no periodic hint, high task confidence, and low task match.
- `suggestionPolicy: balanced` preserves the older scoring for explicit opt-in, while
  periodic and already-used plugins still cannot become automatic suggestions.
- Draft rows now expose `periodic`, `usageState`, and `evidenceLevel`; the UI explains the
  evidence and shows each plugin's share of attributable context.

### Added

- Plugin inventory **context share** column; stronger cadence/usage guardrails and tests
  (73 total).
- README section answering how “建议关闭” is decided, plus an icon credit footer.

## [0.3.1] - 2026-11-20

### Fixed

- Republished 0.3.0 as 0.3.1 because the npm registry served a persistent
  `404` for the `dsh-plugin-trim-0.3.0.tgz` tarball while metadata and `latest`
  were already visible. 0.3.1 uses a fresh tarball path.
- No runtime code changes.

## [0.3.0] - 2026-11-20

### Changed

- License changed from MIT to **AGPL-3.0-only** across the repository, both packages,
  npm metadata, market copy, and promo assets.
- Web console substantial UI update:
  - compatibility findings now have full-text search and severity filtering;
  - new read-only plugin inventory with name/description search, enabled/disabled
    and protected filters, and token/usage/name sorting;
  - inventory expands from 12 to 200 rows on demand.
- README redesigned around a project-native SVG hero and a two-path authorization
  flow diagram.

## [0.2.7] - 2026-11-20

### Fixed

- Republished 0.2.6 as 0.2.7 because the npm registry served a persistent
  `404` for the `dsh-plugin-trim-0.2.6.tgz` tarball while its metadata and
  `latest` tag were already visible. 0.2.7 uses a fresh tarball path.
- No runtime code changes.

## [0.2.6] - 2026-11-20

### Added

- Host approval gate for model-facing writes:
  - `trim_apply_profile` requests `ctx.approval.request()` by default and only writes on
    `allowed-once`; `confirm: true` is now a proposal marker, not authorization.
  - `trim_rollback_profile` always requires host approval.
  - Fail closed when the approval service is missing/throwing or the outcome is
    `rejected` / `cancelled` / `unavailable`; the draft is kept.
  - The approval reason includes the profile, draft id, snapshot id, and exact items;
    the pre-generated snapshot token is the one actually written.
  - `approvalMode: always | risk-based` and `approvalThreshold` config (default
    `always`, 5) allow explicit low-risk automation only when opted in.
- Recipe blueprints now carry a per-step `approvalLevel` (`none` / `suggested` /
  `required`), rendered in Markdown/JSON and the Web console.

### Changed

- Default behavior: model tool applies now require host approval even for one
  low-risk item. The Web console remains user-click-driven and does not double-prompt.
- 68 tests (approval fail-closed coverage and approval-level assertions).

## [0.2.5] - 2026-11-20

### Changed

- npm is now the primary install source everywhere: README, package READMEs,
  market copy, and the format-1 DSH market index.
- The market index now uses `source.type: "npm"` for both plugins; install targets
  are `dsh-plugin-trim@0.2.5` and `dsh-plugin-recipe@0.2.5`.
- No runtime code changes.

## [0.2.4] - 2026-11-14

### Security

- Web console APIs now **fail closed**: if the DSH Connection service is missing,
  lacks `requestRejection`, or throws, the request is rejected with 401. They no
  longer fall back to Origin/Host/loopback checks alone. This matches the
  dshopen.org security review rules for `webServer` routes.

## [0.2.3] - 2026-11-14

### Added

- A top-level **体验优化** settings section directly below **Agent presets**, with a
  clear sliders icon. Users can open the console without going through
  Built-in plugins → tabs.
- The existing Built-in plugins tab remains available.

## [0.2.2] - 2026-11-08

### Changed

- Redesigned the Web console to follow the native DSH settings language:
  - removed the orange hero/orb, gradient cards, and colored metric bars;
  - native typography, `.5px` borders, card tokens, and primary-button tokens;
  - action-first information architecture: suggestions before compatibility and context;
  - compact metrics strip, collapsible context details, and top-5 findings by default;
  - lighter, quieter badges and row separators;
  - native light preview in the README.

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
