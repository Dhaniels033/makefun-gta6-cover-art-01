# Neon Coast Cover Studio — Make GTA 6 Cover Art

[![make.fun](https://make.fun/badge/competition/gta6-cover-art-01)](https://make.fun/c/gta6-cover-art-01)
[![make.fun](https://make.fun/badge/entry/gta6-cover-art-01)](https://make.fun/c/gta6-cover-art-01)
[![make.fun](https://make.fun/badge/reward/gta6-cover-art-01)](https://make.fun/c/gta6-cover-art-01)

A free offline web app that turns any photo and a caption into GTA-style
multi-panel cover art — the Vice City sunset / neon poster look — and exports
it as a PNG to share. No upload, no account, no network: photos are read on
your own machine and never leave it.

## What it does

- **Any photo** — add one or several photos from your machine (or try the two
  bundled samples). Click a panel to select it, drag to pan the photo, zoom
  with the slider, and tap a thumbnail to put that photo in the selected panel.
  "Fill every panel with the first photo" fills the whole cover from one shot.
- **Six multi-panel layouts** — Hero Grid, Four Corners, Tilted Snaps (retro
  sun + palm silhouettes), Full Bleed, Nine Panel (centre cell is the title
  block) and Film Strips.
- **Five sunset grades** — Vice Sunset, Neon Nights, Golden Hour, Miami Pink
  and Midnight: warm overlays, deterministic grain and a vignette, drawn on a
  2D canvas.
- **Bold lettering** — the title in Anton (SIL OFL, vendored under `app/fonts/`)
  with a sunset-gradient fill, a Pacifico neon-script subtitle, and an
  "EST. 2026 · SUNSET COAST" badge ribbon.
- **Fast and easy** — photo to PNG in a few clicks, in the common post sizes:
  1080 × 1080, 1080 × 1350 and 1920 × 1080, via `canvas.toBlob`.

## Run it

```sh
node serve.ts        # serves app/ on http://localhost:8080
```

Open `http://localhost:8080` in desktop Chrome. Everything is static files
under `app/` — no build step, no network request.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `app/` and `screenshots/`
to the output directory and writes `dossier.json` with the vendored
`vendor/makefun-app.ts` library.

## Originality

All art, lettering and code are the author's own. No Rockstar Games logo,
wordmark, official artwork, character or font is used. The fonts are Anton and
Pacifico, both under the SIL Open Font License, vendored with the licence text
in `app/fonts/OFL.txt`. The two sample photos in `app/samples/` were made with
an image model for make.fun and are free to use.

## License

MIT — see [LICENSE](LICENSE).
