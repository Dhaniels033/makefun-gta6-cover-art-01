// Fixed scenes for screenshots: ?shot=editor shows the page with a sample photo
// loaded; ?shot=cover shows the cover alone, edge to edge. Query params pick the
// sample photo(s) (comma-separated), layout, grade, size, title and subtitle.
// window.__shotReady is set once the scene is painted.
import { loadImage } from './main.js';

export async function runShot(shot, query, state, api) {
  if (shot === 'cover') document.body.classList.add('shot-cover');
  await document.fonts.load('40px Anton');
  await document.fonts.load('40px Pacifico');
  await document.fonts.ready;

  const photos = (query.get('photo') ?? 'pier').split(',');
  for (const name of photos) api.addPhoto(await loadImage(`samples/${name}.jpg`));
  if (query.get('layout')) api.setLayout(query.get('layout'));
  if (query.get('grade')) api.setGrade(query.get('grade'));
  if (query.get('size')) api.setSize(query.get('size'));
  if (query.get('caption') != null) api.setTitle(query.get('caption'));
  if (query.get('subtitle') != null) api.setSubtitle(query.get('subtitle'));
  // A second photo in the hero panel's side column, when two photos were given.
  if (photos.length > 1 && state.panels[1]) state.panels[1].photo = 1;
  if (photos.length > 1 && state.panels[2]) state.panels[2].photo = 1;
  if (photos.length > 1 && state.panels[3]) state.panels[3].photo = 1;
  // The cover scene is the exported art: no editor selection highlight.
  if (shot === 'cover') api.setSelected(-1);
  api.redraw();
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
