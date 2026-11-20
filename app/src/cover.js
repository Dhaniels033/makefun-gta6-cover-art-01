// Neon Coast Cover Studio — the cover engine.
// Draws a GTA-style multi-panel poster onto any canvas: panel layouts, a Vice City
// sunset / neon colour grade, bold Anton title lettering with a Pacifico neon
// subtitle, grain and vignette. Pure 2D canvas, no network, no library.

export const LAYOUTS = [
  { id: 'hero', name: 'Hero Grid', panels: 4 },
  { id: 'quad', name: 'Four Corners', panels: 4 },
  { id: 'tilted', name: 'Tilted Snaps', panels: 3 },
  { id: 'fullbleed', name: 'Full Bleed', panels: 1 },
  { id: 'nine', name: 'Nine Panel', panels: 8 },
  { id: 'strips', name: 'Film Strips', panels: 3 },
];

export const GRADES = [
  { id: 'sunset', name: 'Vice Sunset', swatch: 'linear-gradient(135deg,#ffd319,#ff2975)' },
  { id: 'neon', name: 'Neon Nights', swatch: 'linear-gradient(135deg,#ff2975,#2de2e6)' },
  { id: 'golden', name: 'Golden Hour', swatch: 'linear-gradient(135deg,#ffb347,#ff7a18)' },
  { id: 'miami', name: 'Miami Pink', swatch: 'linear-gradient(135deg,#ff5da2,#b537f2)' },
  { id: 'midnight', name: 'Midnight', swatch: 'linear-gradient(135deg,#2de2e6,#3b2d8f)' },
];

export const SIZES = [
  { id: 'square', name: 'Square · 1080 × 1080', w: 1080, h: 1080 },
  { id: 'portrait', name: 'Portrait · 1080 × 1350', w: 1080, h: 1350 },
  { id: 'wide', name: 'Wide · 1920 × 1080', w: 1920, h: 1080 },
];

export const DEFAULT_PANEL = { photo: -1, zoom: 1, ox: 0, oy: 0 };

/** A tiny deterministic PRNG so the grain is identical on every export. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Panel rectangles (unit space) and the title block for a layout id. */
export function layoutGeometry(id, W, H) {
  const g = 0.018; // white gutter, as a fraction of the short side
  const gap = Math.round(Math.min(W, H) * g);
  const pad = gap;
  const inner = { x: pad, y: pad, w: W - pad * 2, h: H - pad * 2 };
  const titleH = Math.round(H * 0.16);
  switch (id) {
    case 'hero': {
      const heroW = Math.round(inner.w * 0.62);
      const colX = inner.x + heroW + gap;
      const colW = inner.x + inner.w - colX;
      const rh = Math.round((inner.h - gap * 2) / 3);
      return {
        panels: [
          { x: inner.x, y: inner.y, w: heroW, h: inner.h },
          { x: colX, y: inner.y, w: colW, h: rh },
          { x: colX, y: inner.y + rh + gap, w: colW, h: rh },
          { x: colX, y: inner.y + (rh + gap) * 2, w: colW, h: rh },
        ],
        title: { x: inner.x, y: H - titleH - pad, w: inner.w, h: titleH, align: 'left', band: true },
        sun: false,
      };
    }
    case 'quad': {
      const cw = Math.round((inner.w - gap) / 2);
      const rh = Math.round((inner.h - titleH - gap * 2) / 2);
      return {
        panels: [
          { x: inner.x, y: inner.y, w: cw, h: rh },
          { x: inner.x + cw + gap, y: inner.y, w: cw, h: rh },
          { x: inner.x, y: inner.y + rh + gap, w: cw, h: rh },
          { x: inner.x + cw + gap, y: inner.y + rh + gap, w: cw, h: rh },
        ],
        title: { x: inner.x, y: H - titleH - pad, w: inner.w, h: titleH, align: 'center', band: true },
        sun: false,
      };
    }
    case 'tilted': {
      const pw = Math.round(inner.w * 0.34);
      const ph = Math.round(inner.h * 0.52);
      const y0 = Math.round(inner.y + inner.h * 0.08);
      return {
        panels: [
          { x: inner.x, y: y0, w: pw, h: ph, tilt: -0.06 },
          { x: inner.x + Math.round(inner.w * 0.33), y: y0 - Math.round(H * 0.02), w: pw, h: ph, tilt: 0.02 },
          { x: inner.x + Math.round(inner.w * 0.66), y: y0, w: pw, h: ph, tilt: 0.07 },
        ],
        title: { x: inner.x, y: H - titleH - pad, w: inner.w, h: titleH, align: 'center', band: false },
        sun: true,
      };
    }
    case 'fullbleed': {
      return {
        panels: [{ x: 0, y: 0, w: W, h: H }],
        title: { x: inner.x, y: H - titleH - pad, w: inner.w, h: titleH, align: 'left', band: true },
        sun: true,
      };
    }
    case 'nine': {
      const cw = Math.round((inner.w - gap * 2) / 3);
      const rh = Math.round((inner.h - gap * 2) / 3); // title lives in the centre cell
      const cells = [];
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          if (r === 1 && c === 1) continue; // centre cell is the title block
          cells.push({ x: inner.x + c * (cw + gap), y: inner.y + r * (rh + gap), w: cw, h: rh });
        }
      }
      return {
        panels: cells,
        title: {
          x: inner.x + cw + gap, y: inner.y + rh + gap, w: cw, h: rh,
          align: 'center', band: false, inGrid: true,
        },
        sun: false,
      };
    }
    case 'strips': {
      const bh = Math.round((inner.h - titleH - gap * 3) / 3);
      return {
        panels: [
          { x: inner.x, y: inner.y, w: inner.w, h: bh },
          { x: inner.x, y: inner.y + bh + gap, w: inner.w, h: bh },
          { x: inner.x, y: inner.y + (bh + gap) * 2, w: inner.w, h: bh },
        ],
        title: { x: inner.x, y: H - titleH - pad, w: inner.w, h: titleH, align: 'center', band: true },
        sun: false,
      };
    }
    default:
      return layoutGeometry('hero', W, H);
  }
}

/** Draws one photo cover-fit inside a rect, with zoom and pan offsets. */
export function drawPhotoIn(ctx, img, rect, zoom, ox, oy) {
  const scale = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight) * zoom;
  const pw = img.naturalWidth * scale;
  const ph = img.naturalHeight * scale;
  const cx = rect.x + rect.w / 2 + ox * rect.w;
  const cy = rect.y + rect.h / 2 + oy * rect.h;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.drawImage(img, cx - pw / 2, cy - ph / 2, pw, ph);
  ctx.restore();
}

/** A retro slatted sun, drawn on its own layer so the slats cut through. */
export function drawRetroSun(ctx, cx, cy, r) {
  const off = document.createElement('canvas');
  off.width = off.height = Math.ceil(r * 2 + 4);
  const o = off.getContext('2d');
  const grad = o.createLinearGradient(0, 0, 0, off.height);
  grad.addColorStop(0, '#ffd319');
  grad.addColorStop(0.55, '#ff7a18');
  grad.addColorStop(1, '#ff2975');
  o.fillStyle = grad;
  o.beginPath();
  o.arc(off.width / 2, off.height / 2, r, 0, Math.PI * 2);
  o.fill();
  o.globalCompositeOperation = 'destination-out';
  let y = off.height * 0.55;
  let th = 2;
  while (y < off.height) {
    o.fillRect(0, y, off.width, th);
    y += th + Math.max(6, r * 0.09);
    th += 2;
  }
  ctx.drawImage(off, cx - off.width / 2, cy - off.height / 2);
}

/** A palm silhouette: curved trunk, six drooping fronds. */
export function drawPalm(ctx, x, y, s, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(2, s * 0.06);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + s * 0.12, y - s * 0.55, x + s * 0.28, y - s * 0.95);
  ctx.stroke();
  const topX = x + s * 0.28;
  const topY = y - s * 0.95;
  for (let i = 0; i < 6; i++) {
    const a = (-0.15 - i * 0.28) * Math.PI;
    const len = s * (0.42 - Math.abs(i - 2.5) * 0.03);
    const ex = topX + Math.cos(a) * len;
    const ey = topY + Math.sin(a) * len * 0.55 + s * 0.1;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(topX + Math.cos(a) * len * 0.6, topY - s * 0.12, ex, ey);
    ctx.stroke();
  }
  ctx.restore();
}

/** The colour grade: warm / neon overlays, then grain and vignette. */
export function applyGrade(ctx, W, H, gradeId) {
  const warm = ctx.createLinearGradient(0, 0, 0, H);
  const cool = ctx.createLinearGradient(0, 0, W, H);
  switch (gradeId) {
    case 'neon':
      warm.addColorStop(0, 'rgba(255,41,117,0.20)');
      warm.addColorStop(1, 'rgba(45,226,230,0.22)');
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = warm;
      ctx.fillRect(0, 0, W, H);
      break;
    case 'golden':
      warm.addColorStop(0, 'rgba(255,179,71,0.10)');
      warm.addColorStop(1, 'rgba(255,122,24,0.30)');
      ctx.globalCompositeOperation = 'soft-light';
      ctx.fillStyle = warm;
      ctx.fillRect(0, 0, W, H);
      break;
    case 'miami':
      warm.addColorStop(0, 'rgba(255,93,162,0.26)');
      warm.addColorStop(1, 'rgba(181,55,242,0.24)');
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = warm;
      ctx.fillRect(0, 0, W, H);
      break;
    case 'midnight':
      cool.addColorStop(0, 'rgba(45,226,230,0.14)');
      cool.addColorStop(1, 'rgba(59,45,143,0.30)');
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = cool;
      ctx.fillRect(0, 0, W, H);
      break;
    case 'sunset':
    default:
      warm.addColorStop(0, 'rgba(255,211,25,0.12)');
      warm.addColorStop(0.6, 'rgba(255,122,24,0.16)');
      warm.addColorStop(1, 'rgba(255,41,117,0.28)');
      ctx.globalCompositeOperation = 'soft-light';
      ctx.fillStyle = warm;
      ctx.fillRect(0, 0, W, H);
      break;
  }
  ctx.globalCompositeOperation = 'source-over';
  // Deterministic grain.
  const rand = mulberry32(20261119);
  const grain = document.createElement('canvas');
  grain.width = grain.height = 140;
  const g = grain.getContext('2d');
  const data = g.createImageData(140, 140);
  for (let i = 0; i < data.data.length; i += 4) {
    const v = Math.floor(rand() * 255);
    data.data[i] = v; data.data[i + 1] = v; data.data[i + 2] = v;
    data.data[i + 3] = 14;
  }
  g.putImageData(data, 0, 0);
  const pattern = ctx.createPattern(grain, 'repeat');
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, W, H);
  // Vignette.
  const vig = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
  vig.addColorStop(0, 'rgba(20,5,30,0)');
  vig.addColorStop(1, 'rgba(20,5,30,0.42)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
}

/** Fits the title text to a width, then draws it with a sunset gradient fill. */
export function drawTitleBlock(ctx, state, geo, W, H) {
  const t = geo.title;
  const title = (state.title || '').trim().toUpperCase();
  const subtitle = (state.subtitle || '').trim();
  if (t.band || t.inGrid) {
    ctx.fillStyle = 'rgba(18,8,28,0.82)';
    ctx.fillRect(t.x - 1, t.y, t.w + 2, t.h);
  }
  if (t.band) {
    ctx.fillStyle = '#ffd319';
    ctx.fillRect(t.x - 1, t.y, 6, t.h);
  }
  const cx = t.align === 'left' ? t.x + (t.band ? 26 : 8) : t.x + t.w / 2;
  const maxW = t.w - (t.band ? 40 : 16);
  if (title) {
    let size = t.inGrid ? Math.min(t.h * 0.42, 200) : Math.min(t.h * 0.52, 220);
    ctx.font = `${size}px Anton, sans-serif`;
    while (ctx.measureText(title).width > maxW && size > 14) {
      size -= 2;
      ctx.font = `${size}px Anton, sans-serif`;
    }
    const grad = ctx.createLinearGradient(0, t.y, 0, t.y + t.h);
    grad.addColorStop(0, '#fff7d6');
    grad.addColorStop(0.45, '#ffd319');
    grad.addColorStop(1, '#ff2975');
    ctx.textAlign = t.align;
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(20,5,30,0.9)';
    ctx.lineWidth = Math.max(2, size * 0.09);
    ctx.shadowColor = 'rgba(255,41,117,0.55)';
    ctx.shadowBlur = size * 0.18;
    const ty = t.y + (subtitle && !t.inGrid ? t.h * 0.36 : t.h * 0.5);
    ctx.strokeText(title, cx, ty);
    ctx.fillStyle = grad;
    ctx.fillText(title, cx, ty);
    ctx.shadowBlur = 0;
  }
  if (subtitle && !t.inGrid) {
    const ssize = Math.min(t.h * 0.24, 64);
    ctx.font = `${ssize}px Pacifico, cursive`;
    ctx.textAlign = t.align;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#2de2e6';
    ctx.shadowColor = '#ff2975';
    ctx.shadowBlur = ssize * 0.5;
    // Keep the script clear of the badge ribbon when it is shown.
    ctx.fillText(subtitle, cx, t.y + t.h * (state.badge ? 0.64 : 0.78));
    ctx.shadowBlur = 0;
  }
  if (state.badge && !t.inGrid) {
    const label = '★ EST. 2026 · SUNSET COAST ★';
    const bsize = Math.max(13, Math.min(W, H) * 0.016);
    ctx.font = `bold ${bsize}px system-ui, sans-serif`;
    const bw = ctx.measureText(label).width + bsize * 2.4;
    const bh = bsize * 2.1;
    const bx = t.align === 'left' ? t.x + t.w - bw : t.x + (t.w - bw) / 2;
    const by = t.y + t.h - bh - 4;
    ctx.fillStyle = 'rgba(255,41,117,0.92)';
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, bh / 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, bx + bw / 2, by + bh / 2 + 1);
  }
}

/** Draws the whole cover. opts: { selected } highlights a panel (preview only). */
export function drawCover(canvas, state, opts = {}) {
  const W = canvas.width;
  const H = canvas.height;
  const ctx = canvas.getContext('2d');
  const geo = layoutGeometry(state.layout, W, H);

  // Backdrop: deep violet sky with a sunset band.
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#2b1055');
  sky.addColorStop(0.5, '#7b2ff7');
  sky.addColorStop(0.78, '#ff2975');
  sky.addColorStop(1, '#ff7a18');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  if (geo.sun) drawRetroSun(ctx, W * 0.5, H * 0.32, Math.min(W, H) * 0.22);

  // Photos, one panel at a time.
  ctx.filter = 'saturate(1.28) contrast(1.08) brightness(1.02)';
  geo.panels.forEach((rect, i) => {
    const panel = state.panels[i] ?? DEFAULT_PANEL;
    const img = panel.photo >= 0 ? state.photos[panel.photo] : null;
    ctx.save();
    if (rect.tilt) {
      ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
      ctx.rotate(rect.tilt);
      ctx.translate(-(rect.x + rect.w / 2), -(rect.y + rect.h / 2));
    }
    // White snapshot frame.
    ctx.fillStyle = '#fdf7f0';
    ctx.shadowColor = 'rgba(10,2,20,0.5)';
    ctx.shadowBlur = Math.min(W, H) * 0.02;
    ctx.shadowOffsetY = Math.min(W, H) * 0.008;
    const frame = Math.round(Math.min(W, H) * 0.012);
    ctx.fillRect(rect.x - frame, rect.y - frame, rect.w + frame * 2, rect.h + frame * 2);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    if (img) {
      drawPhotoIn(ctx, img, rect, panel.zoom, panel.ox, panel.oy);
    } else {
      const ph = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
      ph.addColorStop(0, '#3d2450');
      ph.addColorStop(1, '#241433');
      ctx.fillStyle = ph;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.fillStyle = 'rgba(245,238,247,0.75)';
      ctx.font = `bold ${Math.max(14, Math.min(W, H) * 0.022)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('ADD A PHOTO', rect.x + rect.w / 2, rect.y + rect.h / 2);
    }
    // Thin keyline around each panel.
    ctx.strokeStyle = 'rgba(20,5,30,0.55)';
    ctx.lineWidth = Math.max(1, Math.min(W, H) * 0.002);
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    ctx.restore();
  });
  ctx.filter = 'none';

  // Palm silhouettes on the open-sky layouts.
  if (geo.sun) {
    drawPalm(ctx, W * 0.02, H * 0.98, Math.min(W, H) * 0.34, 'rgba(18,8,28,0.9)');
    drawPalm(ctx, W * 0.97, H * 0.99, Math.min(W, H) * 0.26, 'rgba(18,8,28,0.9)');
  }

  applyGrade(ctx, W, H, state.grade);
  drawTitleBlock(ctx, state, geo, W, H);

  // Selected-panel highlight, preview only — never in an export.
  if (opts.selected != null && geo.panels[opts.selected]) {
    const r = geo.panels[opts.selected];
    ctx.save();
    ctx.strokeStyle = '#ffd319';
    ctx.lineWidth = Math.max(3, Math.min(W, H) * 0.006);
    ctx.setLineDash([14, 8]);
    ctx.strokeRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
    ctx.restore();
  }
  return geo;
}

/** Renders the cover at export size and returns a PNG blob. */
export function exportCover(state, size) {
  const canvas = document.createElement('canvas');
  canvas.width = size.w;
  canvas.height = size.h;
  drawCover(canvas, state);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}
