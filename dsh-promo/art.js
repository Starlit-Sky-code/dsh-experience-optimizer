// art.js — shared drawing vocabulary for the promo. Deterministic: every function is pure relative to its args.
export const SANS = '"Noto Sans SC", sans-serif';
export const MONO = '"JetBrains Mono", monospace';

export function font(size, weight = 400, family = SANS) {
  return `${weight} ${size}px ${family}`;
}

export function txt(ctx, s, x, y, o = {}) {
  const { size = 24, weight = 400, family = SANS, color = '#F2F5FA', align = 'left', track = 0, alpha = 1, baseline = 'alphabetic' } = o;
  ctx.save();
  ctx.font = font(size, weight, family);
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.letterSpacing = `${track}px`;
  ctx.globalAlpha *= alpha;
  ctx.fillText(s, x, y);
  ctx.restore();
  return measure(ctx, s, { size, weight, family, track });
}

export function measure(ctx, s, o = {}) {
  const { size = 24, weight = 400, family = SANS, track = 0 } = o;
  ctx.save();
  ctx.font = font(size, weight, family);
  ctx.letterSpacing = `${track}px`;
  const w = ctx.measureText(s).width;
  ctx.restore();
  return w;
}

/** Paragraph with tracked lines; returns total height. */
export function lines(ctx, arr, x, y, o = {}) {
  const { size = 24, weight = 400, family = SANS, color = '#F2F5FA', lh = 1.35, track = 0, alpha = 1, align = 'left' } = o;
  arr.forEach((s, i) => txt(ctx, s, x, y + i * size * lh, { size, weight, family, color, track, alpha, align }));
  return arr.length * size * lh;
}

export function rr(ctx, x, y, w, h, r = 0) {
  const rad = Math.max(0, Math.min(r, h / 2, w / 2));
  ctx.beginPath();
  ctx.roundRect(x, y, Math.max(0.01, w), Math.max(0.01, h), rad);
}

export function panel(ctx, x, y, w, h, o = {}) {
  const { r = 18, fill = 'rgba(255,255,255,0.045)', stroke = 'rgba(255,255,255,0.10)', lw = 1, alpha = 1, shadow = null } = o;
  ctx.save(); ctx.globalAlpha *= alpha;
  rr(ctx, x, y, w, h, r);
  if (shadow) { ctx.shadowColor = shadow; ctx.shadowBlur = 48; ctx.shadowOffsetY = 20; }
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  ctx.shadowColor = 'transparent';
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
  ctx.restore();
}

/** Four-point brand sparkle: four cusps joined by concave sides. */
export function sparkPath(ctx, cx, cy, r, inner = 0.1, rot = 0) {
  const k = r * inner;
  const pt = (a) => [cx + Math.cos(rot + a) * r, cy + Math.sin(rot + a) * r];
  const ctl = (a) => [cx + Math.cos(rot + a) * k, cy + Math.sin(rot + a) * k];
  const [tx, ty] = pt(-Math.PI / 2);
  const [rx, ry] = pt(0);
  const [bx, by] = pt(Math.PI / 2);
  const [lx, ly] = pt(Math.PI);
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.quadraticCurveTo(cx + k, cy - k, rx, ry);
  ctx.quadraticCurveTo(cx + k, cy + k, bx, by);
  ctx.quadraticCurveTo(cx - k, cy + k, lx, ly);
  ctx.quadraticCurveTo(cx - k, cy - k, tx, ty);
  ctx.closePath();
}

export function spark(ctx, cx, cy, r, color, rot = 0) {
  ctx.save();
  sparkPath(ctx, cx, cy, r, 0.16, rot);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

/** Round avatar / image frame, clipped. */
export function imageFrame(ctx, img, x, y, w, h, r, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  rr(ctx, x, y, w, h, r);
  ctx.clip();
  ctx.drawImage(img, x, y, w, h);
  ctx.restore();
}

/** Text rising out of its own baseline mask: k = 0 (hidden) → 1 (settled). */
export function riseText(ctx, s, x, y, k, o = {}) {
  const { size = 120, weight = 900, color = '#F2F5FA', family = SANS, track = 0, alpha = 1 } = o;
  if (k <= 0.001) return;
  const h = size * 1.18;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x - size, y - h, (measure(ctx, s, { size, weight, family, track }) || size) + size * 2, h + size * 0.12);
  ctx.clip();
  ctx.globalAlpha *= alpha;
  txt(ctx, s, x, y + (1 - k) * h, { size, weight, family, color, track });
  ctx.restore();
}

/** Wipe-on mask (left → right) for lines and small labels. */
export function wipeText(ctx, s, x, y, k, o = {}) {
  const { size = 20, weight = 500, color = '#F2F5FA', family = MONO, track = 0, alpha = 1, align = 'left' } = o;
  if (k <= 0.001) return;
  const w = measure(ctx, s, { size, weight, family, track });
  const x0 = align === 'right' ? x - w : x;
  ctx.save();
  ctx.beginPath(); ctx.rect(x0 - 2, y - size * 1.3, (w + 4) * k, size * 1.8); ctx.clip();
  txt(ctx, s, x, y, { size, weight, family, color, track, alpha, align });
  ctx.restore();
}

export function dot(ctx, x, y, r, color, alpha = 1) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y, Math.max(0.1, r), 0, Math.PI * 2); ctx.fill(); ctx.restore();
}

export function hairline(ctx, x1, y1, x2, y2, color = 'rgba(255,255,255,0.12)', w = 1, alpha = 1) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.strokeStyle = color; ctx.lineWidth = w;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore();
}

export function chip(ctx, x, y, label, o = {}) {
  const { h = 34, pad = 14, size = 14, weight = 600, family = MONO, color = '#F2A33A', fill = 'rgba(242,163,58,0.10)', border = 'rgba(242,163,58,0.42)', textColor = '#F7DFB8', track = 0.6, r = 17, alpha = 1, dotColor = null } = o;
  const w = measure(ctx, label, { size, weight, family, track }) + pad * 2 + (dotColor ? 12 : 0);
  ctx.save(); ctx.globalAlpha *= alpha;
  rr(ctx, x, y, w, h, r);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (border) { ctx.strokeStyle = border; ctx.lineWidth = 1; ctx.stroke(); }
  if (dotColor) dot(ctx, x + pad + 4, y + h / 2, 3.2, dotColor);
  txt(ctx, label, x + pad + (dotColor ? 12 : 0), y + h / 2 + size * 0.35, { size, weight, family, color: textColor, track });
  ctx.restore();
  return w;
}

/** Monospace counter style value, e.g. 2,417. */
export const fmt = n => Math.round(n).toLocaleString('en-US');
