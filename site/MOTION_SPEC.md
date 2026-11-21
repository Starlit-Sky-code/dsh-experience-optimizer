# MOTION_SPEC.md

## 1. Goal

- **Page type**: developer-tool promotional landing page
- **Audience**: DSH users, plugin authors, developers paying for resident context
- **Primary action**: install `dsh-plugin-trim` / open the npm package
- **Motion concept**: **Context Observatory** — a live plugin constellation is scanned; evidence gates filter weak signals; approval and recovery close the loop.
- **Baseline UI role**: the white/paper sections carry the argument; the dark instrument is the proof.

## 2. Choreography

- **Opening beat**: hero title mask-in, constellation nodes appear, scan beam passes once, HUD counts 2,417 → 1,105.
- **Scroll rhythm**: poster interlude → paper problem statement → dark evidence gates → paper product → dark safety → paper install/FAQ → dark about.
- **Interaction rhythm**: language toggle, copy command, node tooltips, FAQ details, terminal typing.
- **Transition rhythm**: reveal only at section entry; no scroll-jacking.
- **Closing beat**: quiet safety seal and install terminal; page ends on project links, QQ, copyright.

## 3. Motion Tokens

- Fast interaction: 160ms
- Standard transition: 280ms
- Slow reveal: 550–700ms
- Hero scan: 1700ms
- Cost count-up: 1500ms
- Primary easing: `cubic-bezier(.2,.7,.2,1)`
- Stagger: 60ms
- No spring library; CSS transitions + rAF.

## 4. Interaction Map

- **Hover/focus**: buttons lift 1px, border turns teal; node tooltip on canvas.
- **Click/tap**: copy command; language toggle; FAQ opens natively.
- **Keyboard**: skip link, visible focus ring, native details/links.
- **Pointer**: canvas parallax capped at 16px / 12px; poster parallax capped at ±22px.
- **Touch**: pointer parallax disabled; content and terminal remain.
- **Mobile**: no hover dependency; canvas static-ish, fewer moving parts.

## 5. Scroll Timeline

| Section | Trigger | Animation | Failure mode |
|---|---|---|---|
| Hero | load + canvas visible | line masks, scan, HUD count | static final if reduced motion |
| Poster | scroll | image parallax ±22px | no transform if reduced/mobile |
| Problem | 35% visible | 54% count-up, 46% bar | final values immediately |
| Evidence | gate 20% visible | gate opacity/translate, sticky text | all gates visible |
| Product | section entry | card/console reveal | visible |
| Safety | section entry | seal stamp once, quiet | static |
| Install | terminal 35% visible | command typed once | full command immediately |
| FAQ/About | entry | subtle reveal | visible |

## 6. Canvas / Media

- Canvas: 14 nodes, links, scan beam, tooltip; DPR capped at 2.
- Pointer parallax only on fine pointers; RAF pauses offscreen and when hidden.
- Cover image is a still, not autoplay video; 16:9 desktop, 3:4 mobile.
- Asset budget: cover 139KB, mobile cover 69KB, UI screenshot 301KB, icon 113KB.
- No external fonts, CDN, or network animation dependency.

## 7. Baseline UI

- Display: system Noto Sans SC / Source Han Sans SC, 800 weight, large CJK display.
- Body: 15–16px, 1.7 line-height.
- Code/data: JetBrains Maple Mono fallback.
- Palette: ink #07101d, teal #5eead4, amber #fbbf24, paper #f2f4f7.
- 8px spacing rhythm, 18px cards, max width 1280.

## 8. Accessibility / Performance

- `prefers-reduced-motion`: static constellation, final numbers, no typing/parallax/seal.
- `?motion=off` mirrors the same fallback for testing.
- Focus-visible rings; skip link; alt text; native details.
- LCP: preload cover; no font network.
- Canvas ≤ 14 nodes; pause when offscreen/hidden.
- Do not ship if horizontal overflow at 390/768/1440 or console errors.

## 9. Stack

- Static HTML + CSS + vanilla JS; no build.
- Canvas for constellation.
- IntersectionObserver for reveal/counters/terminal.
- CSS sticky for evidence section.
- SVG/CSS for icons and seal.

## 10. Acceptance

- [x] Hero has a distinct mechanic, not a stock hero.
- [x] Five motion beats: scan, count-up, gates, seal, terminal.
- [x] One quiet section: safety.
- [x] Reduced-motion fallback covers all content.
- [x] 1440 / 768 / 390 no horizontal overflow.
- [x] Chinese/English switch works.
- [x] Real cover, UI screenshot, icon; QQ `1134419871`.
