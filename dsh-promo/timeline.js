// timeline.js — single source of truth for picture and sound.
// 120 BPM · 17 bars · 34.0 s. Every cut, hit and UI event lives here.
// The film is for dsh-plugin-trim only: 插件减负 → 兼容性体检 → 可回滚.

export const BPM = 120;
export const BEAT = 60 / BPM; // 0.5 s
export const BAR = BEAT * 4; // 2.0 s
export const b = n => n * BEAT;
export const DUR = 34;

/** Start a transition early enough that the new picture first shows on the hit. */
export const revealOn = (hit, dur, reveal = 0) => hit - reveal * dur;

// Act boundaries, all on bar lines.
export const SHOTS = [
  { id: 'hook', t0: 0.0, t1: 4.0, label: '12 个插件 · 线网 · 光束' },
  { id: 'panel', t0: 4.0, t1: 12.0, label: '技能中枢：体检 → 建议 → 应用 → 回滚' },
  { id: 'compat', t0: 12.0, t1: 16.0, label: '兼容性体检 1E · 2W' },
  { id: 'claim', t0: 16.0, t1: 18.0, label: '少一点插件负担，多一点兼容确定性' },
  { id: 'after', t0: 18.0, t1: 24.0, label: '留下的 7 个 → 星座' },
  { id: 'spark', t0: 24.0, t1: 28.0, label: '把杂乱，剪成星光' },
  { id: 'end', t0: 28.0, t1: 34.0, label: '落版 dsh-plugin-trim' },
];

// Picture events that need a sound.
export const CUES = [
  // hook
  { t: 0.04, sfx: 'land', note: 'low' },
  { t: 0.14, sfx: 'land', note: 'mid' },
  { t: 0.24, sfx: 'land', note: 'high' },
  { t: 2.0, sfx: 'cut' },
  { t: 2.6, sfx: 'whoosh', note: 'slice-out' },
  { t: 3.1, sfx: 'rise', note: 'into-panel' },
  // panel opens
  { t: 4.0, sfx: 'impact', note: 'cut' },
  ...Array.from({ length: 12 }, (_, i) => ({ t: 4.12 + i * 0.045, sfx: 'tick', note: 'card' })),
  { t: 5.0, sfx: 'data', note: 'header' },
  { t: 5.6, sfx: 'tick', note: 'total' },
  // scan
  { t: 6.18, sfx: 'tick', note: 'click' },
  { t: 6.3, sfx: 'whoosh', note: 'scan' },
  { t: 7.2, sfx: 'data', note: 'suggest' },
  ...[0, 1, 2, 3, 4].map(i => ({ t: 7.26 + i * 0.09, sfx: 'data', note: 'tag' })),
  // apply
  { t: 8.7, sfx: 'tick', note: 'click' },
  { t: 8.78, sfx: 'whoosh', note: 'collapse' },
  { t: 9.62, sfx: 'data', note: 'reflow' },
  { t: 10.2, sfx: 'tick', note: 'counter' },
  { t: 10.82, sfx: 'data', note: 'toast' },
  // compat
  { t: 12.0, sfx: 'impact', note: 'cut' },
  { t: 12.16, sfx: 'whoosh', note: 'sheet' },
  ...[12.56, 12.88, 13.2].map(t => ({ t, sfx: 'data', note: 'conflict' })),
  { t: 13.66, sfx: 'tick', note: 'summary' },
  { t: 15.3, sfx: 'whoosh', note: 'fold' },
  // claim
  { t: 16.0, sfx: 'rise', note: 'claim' },
  // after
  { t: 18.0, sfx: 'impact', note: 'cut' },
  ...[18.55, 18.83, 19.11, 19.39, 19.67, 19.95, 20.23].map(t => ({ t, sfx: 'node', note: 'star' })),
  { t: 22.9, sfx: 'whoosh', note: 'collapse' },
  // star
  { t: 24.0, sfx: 'spark' },
  { t: 26.9, sfx: 'whoosh', note: 'land' },
  // end
  { t: 28.1, sfx: 'chord' },
];

// Deliberate holds (the end card must be readable) and the two big drops.
export const HOLDS = [[28.4, DUR]];
export const DROPS = [24.0];
