# Promo site — Context Observatory

Static, dependency-free promotional page for DSH Experience Optimizer.

## Live

<https://starlit-sky-code.github.io/dsh-experience-optimizer/>

Deployed by `.github/workflows/pages.yml` on every push to `promo-site` that
changes `site/**`. GitHub Pages uses the GitHub Actions source; no `gh-pages`
branch is needed.

## Preview

```bash
python3 -m http.server 4173 -d site
# open http://127.0.0.1:4173/
```

Motion-off / reduced-motion test:

```text
http://127.0.0.1:4173/?motion=off
http://127.0.0.1:4173/?intro=off
```

## Structure

- `index.html` — opening sequence, hero instrument, ticker, poster, evidence gates, product, safety, install, FAQ, about
- `styles.css` — dark observatory + paper editorial sections, fluid type scale, responsive layout
- `main.js` — intro timeline, canvas constellation, scan, counters, spotlight, tilt, scroll progress, terminal typing, copy
- `i18n.js` — Chinese/English copy, four-line hero
- `MOTION_SPEC.md` — concept, beats, tokens, fallback, acceptance
- `assets/` — cover, mobile cover, UI screenshot, banner, icon, flow

## Assets

- Cover: `assets/cover.jpg` from `dsh-promo/publish/cover.jpg` (updated, no stale version number)
- Mobile cover: `assets/cover-3x4.jpg`
- No autoplay video or audio.
- QQ group: **1134419871**; donation method is intentionally marked to-be-added.
- AGPL-3.0-only · Copyright © 2026 Starlit Sky.

This directory lives on the `promo-site` branch and is not merged to `main`.
The published page is the `site/` artifact; the branch itself is the source.
