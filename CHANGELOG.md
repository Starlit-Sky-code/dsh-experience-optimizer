# Changelog

All notable changes to this repository are documented here. Versions follow
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed

- Settings is now an editable draft instead of a read-only card with a Refresh
  button. The Apply button appears only after a change; applying writes through
  the DSH loader, reloads the plugin, and never skips approval/protection rules.
- Added a first-run tutorial card on `plugins.bundle.activation`, shown after the
  bundle is enabled. It lists the five checkup steps and links to the bundle
  details. The shell guide and onboarding keys moved to v2 so existing installs
  see the new walkthrough once.
- The update check now explains an old install that lacks `/update` instead of
  surfacing a raw `unknown endpoint` error.
- User-facing naming now uses **插件体检 / Plugin checkup** instead of
  “插件减负 / Experience Optimizer” in the tab, hero, settings labels, guides,
  and package descriptions. The package and repository names are unchanged.
- Added a brief conversation **checkup reminder** above the composer:
  “Measure first, then decide what to close.” It is read-only, appears once per
  session, auto-hides, and can be dismissed. No stats or settings UI are shown.
- Added a compact **checkup strip inside the expanded thought line**, showing
  only the current resident token count.
- Added micro-interactions across the panel: animated tab changes, collapsible
  card height/opacity transitions, button press feedback, modal entrance, and
  reduced-motion fallbacks.
- Promo page now leads with **插件体检 / Plugin checkup**, states that 54% is a
  sample reduction and not a close target, and answers the “keyword match vs
  task usage” question directly. Quiet plugins with schedules, prior calls, or
  no ledger are described as protected or sent to review.
- Replaced the stale UI preview with a render of the new checkup panel.
- Public install surfaces now use `npm i <package>` everywhere: root READMEs,
  package READMEs, the Settings “copy install command” action, marketplace copy,
  and the promo page. The optional recipe is `npm i dsh-plugin-recipe`.
- The promo page is live at
  <https://starlit-sky-code.github.io/dsh-experience-optimizer/> and deploys from
  the `promo-site` branch.
- Promo typography and motion refined: a deliberate four-line hero, fluid display
  scale, balanced section headings, a live ticker, pointer spotlight, instrument
  tilt, scroll progress, staggered reveals, and a blinking terminal cursor.
  Metadata sizes were raised from the previous 8–10px floor.
- Promo page now opens with a 12s, five-scene observatory sequence: the existing
  boot radar, resident-cost bars, evidence gates, workflow recipe, and a ready
  lockup. It is skippable at any time; reduced-motion and `?intro=off` skip it.
- Scroll guidance is now explicit: a centered mouse-track cue on desktop and a
  fixed bottom pill on tablet/mobile that hides after scrolling.

### Fixed

- The first-run guide now points at the bottom-left **更多** entry, matching the
  actual navigation path.

## [0.3.7] - 2026-11-21

### Changed

- The previous “two cards side by side” layout was removed. **Two-column now applies
  inside cards**: inventory becomes a two-column card grid, draft rows, findings, and
  context owners use two columns; below 820px everything returns to one column.
- Layout, density, and collapse controls moved from the main-page toolbar to
  **Settings → 界面偏好**, reducing main-page clutter.
- The tutorial page now uses a numbered visual timeline instead of a plain list.

### Added

- A one-time **main-screen guide** in `shell.overlay`: an arrow/panel explains
  `更多 → 设置 → 体验优化` and can expand the five-step tutorial.
- Settings now has **检查更新** backed by an authenticated npm-registry check
  (`GET /api/dsh-experience-optimizer/update`), plus **新建 Issue** and
  **问题列表** shortcuts.
- About now includes an inline hero SVG and QQ group `1134419871`.

## [0.3.6] - 2026-11-21

### Added

- All content-heavy cards are now collapsible: slim plan, inventory, compatibility,
  context, apply result, and dedupe. The context card starts collapsed.
- A view bar adds **standard / two-column** layout, **comfortable / compact** density,
  and **collapse all / expand all**; preferences persist per browser.
- About now includes an inline **hero SVG**, real project links, and QQ group
  `1134419871`; donation methods remain explicitly marked as to-be-added.

### Changed

- Two-column mode pairs compatibility and context on wider screens and falls back to
  one column below 820px; secondary inventory columns still collapse on narrow screens.

## [0.3.5] - 2026-11-21

### Added

- First-run **3-step onboarding** modal with progress dots, skip/start actions, and a
  “replay guide” entry in About.
- **About** tab with real project links, license/version, community and donation
  placeholders, copyright, and privacy boundaries.
- **English UI** (`中文 / EN` switch, persisted per browser) and a full
  `README.en.md`.
- Inline SVG icons, context/plugin/compatibility progress bars, inventory context
  share bars, and a severity distribution bar.
- `NOTICE` with copyright information.

### Changed

- `guardStatus` user label changed from the literal “守卫” to **兼容状态**; other
  high-friction terms were simplified (还原点, 恢复, 安全确认, 当前配置).
- Primary install commands now omit the version (`dsh plugin add dsh-plugin-trim`)
  and the README shows `npm i` as the official shorthand for latest.
- README uses the supplied `assets/banner.svg`; the icon is now a separate
  near-bottom block, followed by an independent copyright line.
- Tabs are now 插件减负 / 工作流配方 / 教程 / 关于 / 设置; the slim plan is shown
  before the inventory, and secondary table columns collapse on narrow screens.

## [0.3.4] - 2026-11-21

### Fixed

- Registry hotfix: `dsh-plugin-recipe-0.3.3.tgz` was persistently served as
  `404` by the npm CDN while its metadata was live. 0.3.4 republishes the same
  tutorial/settings/localization release under fresh tarball paths.
- No runtime changes. This is a release-infrastructure exception to the
  three-large-changes cadence, documented here.

## [0.3.3] - 2026-11-21

### Added

- New **教程** tab: 5-minute walkthrough, task quick-starts, and FAQ about safe
  disable suggestions.
- New **设置** tab: read-only effective approval/suggestion policy, protect/pinned
  lists, data directory, and a copyable `dsh-plugin-trim` patch snippet. The new
  authenticated `GET /api/dsh-experience-optimizer/config` endpoint backs it.
- `AGENTS.md` and `CONTRIBUTING.md` now record the release cadence: publish one
  patch version after three user-visible large changes, not for every small edit.

### Changed

- Chinese-first README/UI pass: tabs, metrics, inventory headers/statuses, risk
  labels, draft badges, recipe summary, hero, and flow diagram now use Chinese
  labels while retaining code identifiers and technical terms.
- README adds the tutorial/settings entries and a localized UI screenshot.

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
