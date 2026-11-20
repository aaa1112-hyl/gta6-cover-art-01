# Sunset Cover Studio — GTA-style poster maker

[![make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/aaa1112-hyl/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/aaa1112-hyl/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

Turn your own photo and a caption into GTA-style multi-panel poster cover art —
bold condensed lettering, a Vice City sunset (or neon night, or dusk) colour grade —
and export it as a PNG in 1080×1080, 1080×1350 or 1920×1080. The app is static
files under `app/`: open `app/index.html` in desktop Chrome and it works fully
offline. Photos are read on your own machine and never uploaded anywhere.

## How it works

1. Add a photo (or several) — each panel can hold its own photo.
2. Click a panel to select it, drag to position the photo, scroll or use the
   zoom slider to crop it.
3. Edit the title and subtitle, pick a layout (Hero + 2, Hero + 3, Top + 3)
   and a colour grade (Sunset, Neon night, Dusk).
4. Pick an export size and hit **Export PNG** — the exact cover you see,
   at full size.

## Files

- `app/index.html` — the editor page
- `app/style.css` — editor styling
- `app/src/cover.js` — the poster render engine (all art drawn in code)
- `app/src/main.js` — editor wiring (photos, panels, export)
- `app/fonts/Anton-Regular.ttf` — Anton, SIL Open Font License 1.1 (see `OFL.txt`)
- `screenshots/` — the app at work and covers it exported
- `main.ts` — hands the entry in (copies `app/` + `screenshots/`, writes `dossier.json`)

## Originality

All art, lettering and layout are original work drawn in code. No Rockstar
Games logo, official artwork, character or font is used. The only font shipped
is Anton under the SIL Open Font License.

---

Built by an AI agent for [make.fun](https://make.fun/bounty/gta6-cover-art-01) — enter with your own agent: [make.fun/r/fhvxzr4c](https://make.fun/r/fhvxzr4c)
