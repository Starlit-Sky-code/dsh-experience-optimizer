// score.mjs — dsh-plugin-trim · 34 s promo. Built from the same timeline as the picture.
// Sound direction: F Lydian pedal, half-time pulse, sub-led warmth, glass FM, sparse UI ticks.
// No four-on-the-floor, no Am–F–C–G, no impact+crash on every cut.
import { DUR, BPM, CUES, b } from './timeline.js';
export { DUR };

export default function score(S) {
  S.tempo(BPM);
  S.space({ room: 0.58, damp: 0.34, width: 0.9 });

  const drums = S.bus('drums', { gain: 0.58, duck: 0.7 });
  const sub = S.bus('sub', { gain: 0.74, duck: 0.5, highpass: 28 });
  const pad = S.bus('pad', { gain: 0.40, reverb: 0.34, duck: 0.55, highpass: 110 });
  const glass = S.bus('glass', { gain: 0.46, reverb: 0.40, duck: 0.7 });
  const sfx = S.bus('sfx', { gain: 0.78, reverb: 0.20, duck: 0.6 });

  const bar = n => n * S.bar(1);
  const beat = n => n * S.beat(1);

  // ── harmony: one Lydian pedal, colour only — the film's "wonder" ──────────
  const chords = {
    F: S.chord('F3', 'maj7#11'),
    G: S.chord('G3', 'add9'),
    A: S.chord('A3', 'm9'),
  };
  // 17 bars: 0-3 intro/hook · 4-7 panel · 8-9 compat · 10 claim · 11-13 after · 14-15 star · 16 end
  const order = ['F', 'F', 'F', 'G', 'F', 'G', 'A', 'A', 'G', 'F', 'F', 'A', 'G', 'F', 'F', 'F', 'F'];
  const energyByBar = [0.55, 0.6, 0.75, 0.85, 1.0, 1.0, 0.88, 0.82, 0.5, 0.95, 1.0, 1.0, 0.9, 0.85, 0.7, 0.6, 0.55];
  const breathBars = new Set([8, 11, 16]);

  for (let i = 0; i < 17; i++) {
    const ch = chords[order[i]];
    const t = bar(i);
    const breath = breathBars.has(i);
    const tailCut = breath ? 1.2 : 0.4;
    pad.add(S.pad(ch, breath ? S.bar(1) - tailCut : S.bar(1) * 1.03, {
      cutoff: i < 4 ? 900 : i < 8 ? 1300 : i < 14 ? 1700 : 2100,
      attack: i < 2 ? 1.2 : 0.5,
      release: breath ? 0.3 : 1.6,
      cents: 8,
    }), t, { gain: 0.55 * energyByBar[i] });
    sub.add(S.sub('F1', beat(breath ? 3.2 : 3.9), { harm: 0.12 }), t, { gain: 0.9 });
  }

  // ── drums: half-time, felt ───────────────────────────────────────────────
  const grooveBars = [2, 3, 4, 5, 9, 10, 11, 12];
  for (const i of grooveBars) {
    const t = bar(i);
    for (const k of [0, 2.5]) {
      drums.add(S.kick({ decay: 0.46, tone: 46, click: 0.25, drive: 0.2 }), t + beat(k), { gain: 0.85 });
      S.duck(t + beat(k), 0.45);
    }
    for (const k of [1, 3]) drums.add(S.rim({ decay: 0.05, tone: 0.35 }), t + beat(k), { gain: 0.30, pan: 0.25 });
    for (let e = 0; e < 8; e++) {
      if ((i + e) % 4 === 3) continue;
      drums.add(S.shaker({ decay: 0.03 }), t + beat(e * 0.5), { gain: 0.10 + (e % 2 === 0 ? 0.04 : 0), pan: -0.35 + e * 0.1 });
    }
  }
  // builds: bar 7 into the claim, bar 11 into the star (no kick, denser hats)
  for (const [bi, n, span] of [[7, 16, 2.0], [11, 16, 2.0]]) {
    for (let e = 0; e < n; e++) {
      const t = bar(bi) + (span / n) * e;
      drums.add(S.hat({ decay: 0.028, open: false }), t, { gain: 0.06 + (e / n) * 0.18, pan: Math.sin(e * 1.7) * 0.4 });
    }
  }

  // ── glass: sparse FM accents that follow the picture ─────────────────────
  const glassNotes = [
    [0.4, 'F5'], [2.0, 'C6'], [3.1, 'A5'],
    [5.0, 'G5'], [7.2, 'D6'], [9.0, 'B5'], [10.8, 'C6'],
    [12.6, 'E6'], [13.2, 'D6'], [16.2, 'F5'],
    [19.4, 'C6'], [21.2, 'A5'],
    [24.6, 'F6'], [27.0, 'C6'],
  ];
  for (const [t, n] of glassNotes) glass.add(S.mallet(n, 1.6, { material: 'vibes', bright: 0.55 }), t, { gain: 0.46 });

  // after: seven rising notes as the kept plugins light up
  const scale = S.scale('F4', 'lydian');
  for (let i = 0; i < 7; i++) {
    glass.add(S.mallet(S.midi(scale(i)), 1.8, { material: 'vibes', bright: 0.5 + i * 0.03 }), 18.6 + i * 0.28, { gain: 0.40, pan: -0.2 + i * 0.07 });
  }

  // ── SFX: every cue is a picture event ────────────────────────────────────
  for (const c of CUES) {
    switch (c.sfx) {
      case 'land': {
        const g = c.note === 'low' ? 0.9 : c.note === 'mid' ? 0.55 : 0.35;
        sfx.add(S.boom({ size: c.note === 'low' ? 1.1 : 0.7 }), c.t, { gain: g });
        break;
      }
      case 'cut':
        sfx.add(S.whoosh(0.5), c.t - 0.1, { gain: 0.65 });
        sfx.add(S.tick({ tone: 0.9 }), c.t, { gain: 0.5, pan: 0.2 });
        break;
      case 'suck':
        sfx.add(S.reverseCymbal(0.6), c.t - 0.35, { gain: 0.5 });
        break;
      case 'tick':
        sfx.add(S.tick({ tone: 0.55 }), c.t, { gain: 0.32, pan: Math.sin(c.t * 9) * 0.5 });
        break;
      case 'whoosh': {
        const short = c.note === 'collapse' || c.note === 'scan' || c.note === 'fold';
        sfx.add(S.whoosh(short ? 0.26 : 0.6), c.t - (short ? 0.18 : 0.42), { gain: short ? 0.34 : 0.52, pan: -0.1 });
        break;
      }
      case 'data':
        sfx.add(S.blip('C6'), c.t, { gain: 0.26, pan: 0.15 });
        break;
      case 'rise':
        sfx.add(S.riser(1.1), c.t - 1.1, { gain: 0.42 });
        break;
      case 'impact':
        sfx.add(S.impact(), c.t, { gain: 0.8 });
        S.duck(c.t, 0.7);
        break;
      case 'node':
        sfx.add(S.mallet('F6', 1.2, { material: 'glock', bright: 0.6 }), c.t, { gain: 0.18, pan: 0.3 });
        break;
      case 'spark':
        sfx.add(S.impact({ size: 1.2 }), c.t, { gain: 0.85 });
        sfx.add(S.shimmer(2.4, { root: 'F5' }), c.t, { gain: 0.5 });
        sfx.add(S.bell('F6', 2.0), c.t, { gain: 0.32 });
        S.duck(c.t, 0.8);
        break;
      case 'chord':
        sfx.add(S.bell('C6', 3.2), c.t, { gain: 0.22 });
        break;
    }
  }

  // ── end card: warm tail, not a doorbell ──────────────────────────────────
  glass.add(S.mallet('F4', 3.6, { material: 'vibes', bright: 0.4 }), 28.2, { gain: 0.5 });
  glass.add(S.mallet('B4', 3.4, { material: 'vibes', bright: 0.42 }), 28.5, { gain: 0.42 });
  glass.add(S.mallet('E5', 3.0, { material: 'vibes', bright: 0.45 }), 29.0, { gain: 0.32 });
  pad.add(S.pad(S.chord('F4', 'maj7#11'), 6.0, { cutoff: 2300, attack: 0.4, release: 4.2 }), 28.0, { gain: 0.62 });
  sub.add(S.sub('F1', 5.6), 28.0, { gain: 0.8 });

  // deliberate breaths before the two drops
  S.duck(15.72, 1);
  S.duck(23.45, 1);
  S.duck(23.9, 1);
  sfx.add(S.riser(0.8), 15.1, { gain: 0.32 });
  sfx.add(S.riser(0.42), 23.2, { gain: 0.28 });
}
