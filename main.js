// Neon Coast Cover Studio — wires the editor: photos, layout, grade, words, export.
// A `?shot=` query sets up a fixed scene for a screenshot instead (./shots.js).
import { LAYOUTS, GRADES, SIZES, DEFAULT_PANEL, drawCover, exportCover, layoutGeometry } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const caption = document.getElementById('caption');
const subtitle = document.getElementById('subtitle');
const badge = document.getElementById('badge');
const status = document.getElementById('status');
const thumbs = document.getElementById('thumbs');
const zoom = document.getElementById('zoom');
const zoomVal = document.getElementById('zoomVal');
const panelInfo = document.getElementById('panelInfo');

const state = {
  layout: 'hero',
  grade: 'sunset',
  title: caption.value,
  subtitle: subtitle.value,
  badge: badge.checked,
  size: SIZES[0],
  photos: [],
  panels: Array.from({ length: 8 }, () => ({ ...DEFAULT_PANEL })),
};
let selected = 0;
let activePhoto = 0;

export function currentState() { return state; }

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function panelCount() {
  return LAYOUTS.find((l) => l.id === state.layout).panels;
}

function redraw() {
  const preview = state.size.w >= state.size.h
    ? { w: 960, h: Math.round(960 * state.size.h / state.size.w) }
    : { w: Math.round(960 * state.size.w / state.size.h), h: 960 };
  if (canvas.width !== preview.w || canvas.height !== preview.h) {
    canvas.width = preview.w;
    canvas.height = preview.h;
  }
  drawCover(canvas, state, { selected });
  panelInfo.textContent = selected >= 0 ? `Panel ${selected + 1} of ${panelCount()}` : 'Cover preview';
  const selPanel = state.panels[selected] ?? DEFAULT_PANEL;
  zoom.value = String(selPanel.zoom);
  zoomVal.textContent = `${selPanel.zoom.toFixed(2)}×`;
}

/** Adds a loaded image to the photo tray and assigns it to empty panels. */
export function addPhoto(img) {
  const index = state.photos.length;
  state.photos.push(img);
  for (let i = 0; i < state.panels.length; i++) {
    if (state.panels[i].photo === -1) state.panels[i].photo = index;
  }
  activePhoto = index;
  renderThumbs();
  redraw();
}

function renderThumbs() {
  thumbs.replaceChildren();
  state.photos.forEach((img, i) => {
    const t = document.createElement('img');
    t.src = img.src;
    t.alt = `Photo ${i + 1}`;
    t.setAttribute('aria-pressed', String(i === activePhoto));
    t.addEventListener('click', () => {
      activePhoto = i;
      state.panels[selected].photo = i;
      renderThumbs();
      redraw();
    });
    thumbs.appendChild(t);
  });
}

function buildPicker(el, items, current, onPick, swatchKey) {
  el.replaceChildren();
  items.forEach((item) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-pressed', String(item.id === current));
    if (swatchKey) {
      const s = document.createElement('span');
      s.className = 'swatch';
      s.style.background = item[swatchKey];
      b.append(s, document.createTextNode(item.name));
    } else {
      b.textContent = item.name;
    }
    b.addEventListener('click', () => {
      onPick(item);
      buildPicker(el, items, item.id, onPick, swatchKey);
      redraw();
    });
    el.appendChild(b);
  });
}

function rebuildPickers() {
  buildPicker(document.getElementById('layouts'), LAYOUTS, state.layout, (item) => {
    state.layout = item.id;
    selected = 0;
  });
  buildPicker(document.getElementById('grades'), GRADES, state.grade, (item) => {
    state.grade = item.id;
  }, 'swatch');
  buildPicker(document.getElementById('sizes'), SIZES, state.size.id, (item) => {
    state.size = item;
  });
}

document.getElementById('photos').addEventListener('change', async (e) => {
  for (const file of e.target.files) {
    addPhoto(await loadImage(URL.createObjectURL(file)));
  }
  status.textContent = `${state.photos.length} photo${state.photos.length === 1 ? '' : 's'} loaded.`;
});
document.querySelectorAll('[data-sample]').forEach((btn) => {
  btn.addEventListener('click', async () => {
    addPhoto(await loadImage(`samples/${btn.dataset.sample}.jpg`));
    status.textContent = `Sample photo “${btn.dataset.sample}” loaded.`;
  });
});
document.getElementById('fillAll').addEventListener('click', () => {
  if (!state.photos.length) { status.textContent = 'Add a photo first.'; return; }
  state.panels.forEach((p) => { p.photo = 0; });
  activePhoto = 0;
  renderThumbs();
  redraw();
  status.textContent = 'Every panel now shows the first photo.';
});
caption.addEventListener('input', () => { state.title = caption.value; redraw(); });
subtitle.addEventListener('input', () => { state.subtitle = subtitle.value; redraw(); });
badge.addEventListener('change', () => { state.badge = badge.checked; redraw(); });
zoom.addEventListener('input', () => {
  state.panels[selected].zoom = Number(zoom.value);
  redraw();
});
document.getElementById('panelPrev').addEventListener('click', () => {
  selected = (selected - 1 + panelCount()) % panelCount();
  redraw();
});
document.getElementById('panelNext').addEventListener('click', () => {
  selected = (selected + 1) % panelCount();
  redraw();
});

// Drag on the preview to pan the selected panel's photo; click selects a panel.
let drag = null;
function panelAt(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const x = (clientX - rect.left) * (canvas.width / rect.width);
  const y = (clientY - rect.top) * (canvas.height / rect.height);
  const geo = layoutGeometry(state.layout, canvas.width, canvas.height);
  for (let i = geo.panels.length - 1; i >= 0; i--) {
    const p = geo.panels[i];
    if (x >= p.x && x <= p.x + p.w && y >= p.y && y <= p.y + p.h) return i;
  }
  return -1;
}
canvas.addEventListener('pointerdown', (e) => {
  const i = panelAt(e.clientX, e.clientY);
  if (i < 0) return;
  selected = i;
  drag = { x: e.clientX, y: e.clientY, moved: false };
  canvas.setPointerCapture(e.pointerId);
  redraw();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const rect = canvas.getBoundingClientRect();
  const p = state.panels[selected];
  p.ox += (e.clientX - drag.x) / rect.width * (canvas.width / canvas.height);
  p.oy += (e.clientY - drag.y) / rect.height;
  p.ox = Math.max(-0.5, Math.min(0.5, p.ox));
  p.oy = Math.max(-0.5, Math.min(0.5, p.oy));
  if (Math.abs(e.clientX - drag.x) + Math.abs(e.clientY - drag.y) > 3) drag.moved = true;
  drag.x = e.clientX;
  drag.y = e.clientY;
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });

document.getElementById('export').addEventListener('click', async () => {
  status.textContent = 'Rendering PNG…';
  const blob = await exportCover(state, state.size);
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `neon-coast-${state.size.w}x${state.size.h}.png`;
  a.click();
  status.textContent = `Saved neon-coast-${state.size.w}x${state.size.h}.png (${Math.round(blob.size / 1024)} KiB).`;
  setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
});

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), state, {
    addPhoto, redraw, setLayout: (id) => { state.layout = id; selected = 0; rebuildPickers(); },
    setGrade: (id) => { state.grade = id; rebuildPickers(); },
    setSize: (id) => { state.size = SIZES.find((s) => s.id === id) ?? state.size; rebuildPickers(); },
    setTitle: (t) => { state.title = t; caption.value = t; },
    setSubtitle: (t) => { state.subtitle = t; subtitle.value = t; },
    setSelected: (i) => { selected = i; },
  });
} else {
  rebuildPickers();
  redraw();
}
