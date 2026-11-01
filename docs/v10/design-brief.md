# Polycodex v10 — design brief (G1a)

Direction: **The Expedition Kit** (plan §3). Status: built against the plan's defaults;
the owner can still change any token without touching a screen, because every value is
in `css/v10/tokens.css`.

## Rationale

Polycodex already owns an ocean, pixel sprites and a Lounge with NPCs. The redesign
turns the decoration into navigation: water is where you are, paper is what you keep.
Depth is progress. The dive slate, logbook, lantern and sonar are objects a learner can
name, not dashboard widgets. The style is cheap to render (solid panels, hard shadows,
static illustration) so the visual direction and the performance budget pull together.

## Token sheet

| Role | Value | Notes |
|---|---|---|
| water-0…3 | `#1b5e73`, `#0f3a52`, `#0a2238`, `#060e1a` | zone gradient; `data-zone` remaps chrome |
| mist / foam | `#c9d7e0` / `#f2f6f8` | secondary / primary text on water |
| paper / paper-2 | `#f4ecd8` / `#e7dbbf` | slate and logbook |
| ink / ink-2 | `#1a1d22` / `#4a4f57` | text on paper |
| slate-night | `#17212c` | Night slate |
| lantern | `#ffb547` | the only amber fill; one per screen |
| lantern-ink | `#1f1405` | text on amber |
| coral / coral-ink | `#ff7a6b` / `#a8281c` | errors |
| kelp / kelp-ink | `#7fd18b` / `#2c6a37` | correct / mastered |
| biolum | `#9be7d8` | illustration only |
| shadow | `#02060c` water · `#1a1d22` paper | hard offset only |

Spacing 4/8/12/16/24/32/48/64. Radii 0/4/8/pill. Borders 2 px. Elevation 2 px and 4 px
hard offsets, never blur. Durations 120/180/280/600 ms. Easing `.2,.8,.2,1` and
`steps(4)`. Z layers 0/10/20/30/40/50.

Contrast: `scripts/check-contrast.js` writes `docs/v10/contrast.md`. The table covers
every pair actually used by the shell. Any failure is fixed by moving the token value
(never by leaving unreadable text).

## Type specimen

- **Display:** Pixelify Sans (SIL OFL 1.1, latin subset, self-hosted, 12 KB). Used only
  for the logo, screen titles, reef names, depth readout and stamps, at ≥20 px and at
  integer multiples of its design grid.
- **Reading / UI:** Atkinson Hyperlegible (SIL OFL 1.1, latin subset, self-hosted,
  17 KB per weight). 18 px phone / 19 px desktop, line-height 1.55, max 66ch.
- **Code:** `ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`.
- **Numbers:** `font-variant-numeric: tabular-nums`.
- Scale tokens `--fs-1…6`, `--fs-d1…d3`; text setting 100/115/130%.

Licence texts: `assets/fonts/OFL.txt` and `assets/fonts/README.md`.

## Icon list

16 px grid, 2 px strokes, square caps, inline SVG sprite in `js/v10/icons.js`:
compass, map, book, search, lantern, sound, settings, account, back, next, close, check,
cross, lock, depth, card, wave, reef, wreck, spark, cup, note, clock, offline, cloud,
device, plus, arrow-up. Navigation glyphs always have a visible text label; icon-only
buttons have `aria-label`.

## Motion table

| Moment | High/Med | Low/Off + reduced |
|---|---|---|
| Deeper screen | rise 8 px + darken, 280 ms | 120 ms crossfade / instant |
| Back up | reverse, 280 ms | same |
| Card advance | slide 24 px + fade, 180 ms | instant, focus to heading |
| Correct | kelp stamp, 4 steps, 150 ms | static |
| Wrong | coral underline + explanation expand, 180 ms | instant |
| Surfaced | depth ticks, stamp lands | final values |
| Collectible | paper flip ≤1.2 s, skippable | face-up |
| Sonar focus | one ring, 400 ms | none |
| Save status | “Saved” fades after 1.5 s | same, no fade |

No animation delays input. Every tap during a transition completes it. No loop runs
outside an active interaction on low/off.

## Copy samples

- Title: “Continue · Number Reef · Ratios · Dive 3 · Card 4 of 7”
- Empty Logbook: “Your first dive will chart this page.”
- Save failure: “Couldn't save. Your progress is still here in this tab. Try again.”
- Offline: “You're offline. Cached dives still work.”
- Locked-by-recommendation: “This builds on Fractions. Dive anyway?”
- Surface low score: “Surfaced. Two ideas to revisit.”

Plain verbs, second person, sentence case. No faux-terminal uppercase.

## Mocks

`docs/v10/mock/` contains six static screens at 360×640 and 1280×720 plus a states
sheet. They load the real `css/v10/tokens.css`; screenshots are captured by
`scripts/render-mocks.js` into `docs/v10/mock/shots/`. Mocks are a design contract, not
progress toward G1.

## Disposition

The plan's defaults are accepted: US standards, grades 6–12 + first-year college,
Number/Life/Matter & Motion in Wave 1, soft prerequisites on, Option B storage,
local-only analytics. `@axe-core/playwright` was not added; the a11y suite uses
scripted role/name/focus/contrast checks (plan §16 allows this).
