# MOTION_SPEC.md

## 1. Goal

- **Page type**: developer-tool promotional landing page
- **Audience**: DSH users, plugin authors, developers paying for resident context
- **Primary action**: install `dsh-plugin-trim` / open the npm package
- **Motion concept**: **Context Observatory** — a live plugin constellation is scanned; a full-screen dual-lens chapter separates cost from evidence; approval and recovery close the loop.
- **Baseline UI role**: the white/paper sections carry the argument; the dark instrument is the proof.

## 2. Choreography

- **Opening beat**: a 12s five-scene sequence — boot radar → resident cost → evidence gates → workflow recipe → ready lockup — then wipes upward. It is skippable at any point.
- **Hero beat**: four-line mask-in with a drawn amber underline, constellation nodes appear, scan beam passes once, HUD counts 2,417 → 1,105.
- **Scroll rhythm**: ticker strip → poster interlude → paper problem statement → dark evidence gates → full-screen dual-lens interlude → paper product → dark safety → paper install/FAQ → dark about.
- **Interaction rhythm**: intro skip, language toggle, copy command, node tooltips, pointer spotlight, instrument tilt, bidirectional hero depth, dual-lens counter-scroll, back-to-top, FAQ details, terminal typing.
- **Transition rhythm**: reveal only at section entry; no scroll-jacking.
- **Closing beat**: quiet safety seal and install terminal; page ends on project links, QQ, copyright.

## 3. Motion Tokens

- Fast interaction: 160ms
- Standard transition: 280ms
- Slow reveal: 600–900ms
- Intro: 12s five-scene sequence; exit wipe: 600ms
- Hero line stagger: 80ms
- Hero scan: 1700ms
- Cost count-up: 1500ms
- Ticker loop: 34s
- Ambient aurora: 19s / 24s; hero orbit: 37s; dual orbit: 52s
- Dual-lens sheen: 8s; meter breathe: 4.8s
- Back-to-top reveal: 320ms; progress ring follows page scroll
- Primary easing: `cubic-bezier(.16,1,.3,1)` / soft `cubic-bezier(.22,.61,.36,1)`
- No spring library; CSS transitions + rAF.

## 4. Interaction Map

- **Hover/focus**: buttons lift 1px, border turns teal; node tooltip on canvas.
- **Click/tap**: intro skip; copy command; language toggle; FAQ opens natively.
- **Keyboard**: intro skip is tabbable and Escape exits the intro; skip link, visible focus ring, native details/links.
- **Scroll cue**: desktop has a centered mouse-track cue in the hero footer; mobile has a fixed bottom pill that hides after 60px.
- **Pointer**: canvas parallax capped at 16px / 12px; poster parallax capped at ±22px; hero spotlight follows the cursor; instrument tilts at most 2.4°.
- **Scroll**: top progress hairline, ticker marquee, staggered card/gate entry, counter-scrolling dual lenses, back-to-top after 50% of the page.
- **Touch**: pointer parallax, spotlight, and tilt disabled; content and terminal remain.
- **Mobile**: no hover dependency; canvas static-ish, fewer moving parts.

## 5. Scroll Timeline

| Section | Trigger | Animation | Failure mode |
|---|---|---|---|
| Intro | load | five scenes: radar, cost bars, evidence gates, recipe graph, ready lockup; upward wipe | skipped immediately |
| Hero | intro exit + canvas visible | four-line masks, underline draw, scan, HUD count | static final if reduced motion |
| Ticker | load | 34s marquee; pause on hover | static strip |
| Poster | scroll | image parallax ±22px | no transform if reduced/mobile |
| Problem | 35% visible | 54% count-up, 46% bar | final values immediately |
| Evidence | gate 20% visible | gate opacity/translate, sticky text | all gates visible |
| Dual lens | sticky scroll progress | cost card down / evidence card up, slow orbit, sheen | static two-column stack |
| Product | section entry | card/console reveal | visible |
| Safety | section entry | seal stamp once, quiet | static |
| Install | terminal 35% visible | `npm i` commands typed once, blinking cursor | full command immediately |
| FAQ/About | entry | subtle reveal | visible |
| Back to top | page progress ≥ 50% | fade + rise, conic progress ring | hidden; no scroll hijack |

## 6. Canvas / Media

- Canvas: 14 nodes, links, scan beam, tooltip; DPR capped at 2.
- Pointer parallax only on fine pointers; RAF pauses offscreen and when hidden.
- Cover image is a still, not autoplay video; 16:9 desktop, 3:4 mobile.
- Asset budget: cover 139KB, mobile cover 69KB, UI screenshot 301KB, icon 113KB.
- No external fonts, CDN, or network animation dependency.

## 7. Baseline UI

- Display: system Noto Sans SC / Source Han Sans SC, 700 weight, 52–104px, four deliberate lines, `-0.04em` tracking, amber underline on the last line.
- Section display: 650 weight, 34–68px, `-0.035em`, balanced wrapping.
- Body: 16px, 1.75 line-height, 34em measure.
- Metadata: 10.5–12px (raised from the previous 8–10px floor); no user-facing prose below 12px except instrument labels.
- Code/data: JetBrains Maple Mono fallback; tabular numbers for scores.
- Palette: ink #07101d, teal #5eead4, amber #fbbf24, paper #f2f4f7.
- 8px spacing rhythm, 18px cards, 14px primary CTAs, 8px utility buttons, max width 1280.

## 8. Accessibility / Performance

- `prefers-reduced-motion`: no intro, static constellation, final numbers, no typing/parallax/seal.
- `?motion=off` mirrors the same fallback; `?intro=off` skips only the opening sequence.
- Focus-visible rings; skip link; alt text; native details; back-to-top is a real button with `aria-label`, hidden from tab order until it appears.
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

- [x] A five-scene, skippable opening sequence establishes the observatory metaphor and shows cost, evidence, recipe, and approval.
- [x] Hero has a distinct mechanic, not a stock hero.
- [x] Five-scene intro plus seven hero/section motion beats.
- [x] Ticker, scroll progress, spotlight, instrument tilt, ambient aurora, and slow orbit add a second motion layer.
- [x] A full-screen dual-lens chapter counter-scrolls; the animation reverses when scrolling up.
- [x] A back-to-top ring appears after 50% and returns to the top without scroll hijacking.
- [x] Desktop and mobile both have a visible scroll cue.
- [x] One quiet section: safety.
- [x] Reduced-motion fallback covers all content.
- [x] 1440 / 768 / 390 no horizontal overflow.
- [x] Chinese/English switch works.
- [x] Real cover, UI screenshot, icon; QQ `1134419871`.
