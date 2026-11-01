# Polycodex v10 — recon (M0.1)

Status: complete for every row of plan §11. Evidence is file + line at the time of
the v10 branch cut (seed commit `7480579`, Oct 28 2026). Where reality differs from
the plan, the safe default is applied and named here.

## Summary of corrections to the planning assumptions

| Claim | Reality |
|---|---|
| ~287 KB of lesson data | 290 KB across `js/data/sectors-part{1,2,3}.js` (117,632 + 83,091 + 89,712 bytes). |
| 42 lessons / 10 sectors | Confirmed by `scripts/content-inventory.js`: 42 lessons, 10 sectors, 21,421 words, 74 KaTeX spans, 6 code blocks. |
| Six stylesheets | Confirmed: `style.css`, `codex-plus.css`, `v6.css`, `v7.css`, `lounge-play.css`, `lounge-world.css` (195 KB raw). |
| ~1.15 MB local JS | Confirmed: 1,188,412 bytes across `js/**/*.js`. |
| 15 `backdrop-filter`, 24 `blur()`, 99 `box-shadow` | `backdrop-filter` 17 across the stack (15 in `style.css`); `blur()` 13 (all `style.css`); `box-shadow` 131 across the stack (99 in `style.css`). |
| rAF in 11 files, setInterval in 6 | 14 files contain at least one of the two (counts in R-FRAMES). |
| Top bar 13 controls | Confirmed: menu, brand, search, streak, energy, XP, 4 primary tools, badges, settings, account. |
| Sidebar 19 nav items | Confirmed: home + 10 sectors + 8 utility items (`engine.js:222-233`). |
| ~120 Playwright specs, Chromium only verified | Confirmed: 120 `test()` declarations; `docs/lounge-architecture.md:104` records Chromium 141 only. |
| SRS key `cx_v5_srs` | Confirmed, but only the Notebook flashcard path reads/writes it (`network.js:620, 1009-1014`). Engine flashcard mastery uses `S.known` instead. |
| No router | Confirmed: the only `location.hash` use is a `room=NNNN` deep-link (`network.js:1074`). No `hashchange` listener exists. |
| No theme toggle | Confirmed: no `data-theme`, no `prefers-color-scheme` rule; the only match is a comment in `lounge-world.css:2`. |
| Kitchen exists | Confirmed: registered side room `kitchen` (`lounge-world.js:13, 168`), reached from Café. |

## Row-by-row answers

### R-BOOT — script loading order
**Evidence:** `index.html:37-117`. Everything is eager and `defer`: three Google font families, the pixelart icon-font stylesheet, KaTeX CSS + JS + auto-render, Prism CSS + 8 scripts, marked, DOMPurify, MiniSearch, canvas-confetti, three Firebase compat SDKs, Supabase, then 25 local scripts. The first inline script (`index.html:4-26`) is a crash reporter.
**Decision:** separate entry `app.html` for v10. An inline redirect at the very top of `index.html` sends `?ui=10` or `localStorage.cx_ui === '10'` to `app.html` before any legacy script or stylesheet is parsed. `?ui=legacy` stays in `index.html`. This makes the Title budget measurable (zero third-party scripts) and needs no change to legacy load ordering.
**Deviation from the plan's wording:** the flag lives in `index.html` (the redirect) and `app.html` (the destination), not a dynamic legacy-script injection. Safe default applied.

### R-STATE — `save()` and `S`
**Evidence:** `engine.js:153-170`. `KEY = 'polymath_codex_v1'`; `S` is loaded once at module evaluation; `save()` writes the whole object after a 400 ms debounce and then calls `NetworkEngine.onStateSave()`. No unknown-field preservation is promised by any consumer.
**Decision:** Option B — a separate `cx_v10_progress` key. v10 never writes `polymath_codex_v1` or `cx_lounge_world_v1`.

### R-SYNC — network hook surface
**Evidence:** `network.js:537-542` (`onStateSave` pushes `AuthManager.snapshot()`); `network.js:466-480` (snapshot is a fixed object: name, avatar, xp, level, streak, known, badges, quizBest, companion, inventory, timestamps); `network.js:494-525` (hydrate merges only those fields). There is **no acknowledgement**; `pushProfile` fire-and-forgets through `guardedWrite`.
**Decision:** the transport is frozen (§14.4). v10 writes locally and calls the existing `NetworkEngine.onStateSave()` only to nudge the legacy profile push. v10 never renders "Synced" — there is no ack to observe. A future additive `v10` field needs an owner-approved change to `network.js`; it is not made in P0.
**Safe default applied:** "Saved on this device" is the strongest honest state.

### R-SRS — `cx_v5_srs` format
**Evidence:** `network.js:620`, `network.js:1009-1014`. Shape: `{ "<question-key>": { b: 0..6, d: <day index> } }`, where the key is the first 80 chars of the normalized question and `d = floor(Date.now()/864e5) + SRS_IV[b]`. It is written only by the Notebook flashcard deck. Engine flashcards track mastery in `S.known` and never touch this key.
**Decision:** v10 keeps its own review schedule in `cx_v10_progress.review` and mirrors due-card ids into `cx_v5_srs` additively with keys `v10:<diveId>:<itemId>` (not question text). If the legacy reader later rejects unknown keys it simply ignores them. Side map `v10SrsMeta` is not needed because the v10 store owns the concept metadata.
**Deviation:** the plan suggested `v10:` ids in `cx_v5_srs`; implemented as above, plus the v10 store is authoritative.

### R-RENDER — markdown and typeset
**Evidence:** `engine.js:241-293`. `mdBlock` lifts `$…$`/`$$…$$`, runs `marked.parse`, re-injects escaped TeX; `mdSafe` strips scripts/handlers; `typeset` runs KaTeX auto-render, Prism and sprite painting.
**Decision:** the Wreck reader uses `mdSafe` + `typeset` from the legacy page via a small adapter loaded in `wreck.html`, so output is faithful by construction. v10 dive cards use a deliberately small, safe renderer (`js/v10/render.js`) that supports inline emphasis, glossary links, paragraphs and KaTeX through the same KaTeX build, loaded only for `flags.math` units.

### R-DATA — lesson registration
**Evidence:** each data file assigns `window.SECTORS_PARTn`; lessons are markdown strings with inline HTML; all three files load eagerly (inventory: 42 lessons).
**Decision:** `scripts/content-inventory.js` is the only reader of bodies outside the Wreck reader. `docs/v10/content-inventory.json` is committed. `js/v10/wrecks.js` carries metadata only (id, title, sector, headings digest, bridge concepts).

### R-QUIZ — sector quiz data
**Evidence:** `engine.js:178-183`. `SECTORS[n].quiz` becomes `QUIZZES[sectorId]`; `S.completed[sectorId]` is written by the legacy quiz. The quiz shape is inline in each sector object (`q`, `o`, `a`, `w`).
**Decision:** legacy sector completion is imported as `legacy_charted` and shown as "Charted (legacy)". The quiz itself stays in the legacy renderer; P0 links to it as a Wreck challenge rather than reimplementing it.

### R-SEARCH — MiniSearch
**Evidence:** `engine.js:571-586`. The legacy index covers `title` and `text` of lessons/screens; it loads MiniSearch from CDN eagerly.
**Decision:** v10 builds its own index from `js/units/manifest.json` (dive titles, concepts, glossary, objectives, Wreck titles/headings) with plain string scoring — no MiniSearch dependency. Legacy body search remains on the legacy screen until cutover.

### R-NOTE — Notebook
**Evidence:** `network.js:604-720`. Local vaults live in `cx_v5_idx` + `cx_v5_v_<id>`; preferences in `cx_v5_pref`; shared rooms in `group_notes/{code}`. Public API: `init`, `onScreen`, `identityChanged`, `saveScratch`, `room`, `setSync`, `flushRoom`.
**Decision:** card notes (P1) are stored in `cx_v10_progress.notes` with a `{diveId, cardId, text, at}` record and a link back to the card. No P0 dependency on Notebook.

### R-ROUTE — legacy routing
**Evidence:** `network.js:1074` parses `room=(\d{4,6})` from the hash; there is no `hashchange` listener and no router. Screens are switched by `data-go` handlers.
**Decision:** v10 uses real hash routes in `app.html` (`#/`, `#/map`, ...) exactly as plan §4. Unknown hashes fall back to `#/`. Since v10 is a separate document, there is no namespacing collision; the plan's safe default (`#/v10/`) is unnecessary and would break the specified URLs. Documented deviation.

### R-LOUNGE — setRoom, registry, Kitchen, ledger, XP cap
**Evidence:** `lounge2.js:55` `registerRoom`, `:74` `addHotspot`, `:80` `setSpawn`, `:174` `setRoom(id, opts)`, exported at `:430`. Kitchen: `lounge-world.js:13` (`SIDE` includes `kitchen`), `:168` (registration), `:173` (spawn), `:175` (door). Ledger: `lounge-progress.js` (`cx_lounge_world_v1`, `v:1`, `clean()`, read-only newer versions). XP cap: `lounge-play.js:22` `xpPerDayCap: 30`, `:213` `awardXP`.
**Decision:** v10 calls `CodexLounge.setRoom('kitchen', {from})` through `js/v10/practice.js` and then `CodexLounge.setSpawn` if needed. No core edits. `setRoom` currently accepts only `opts.from`; the wrapper stores `{activity, params, returnTo}` in sessionStorage and reads it on `CodexLounge` activation. Fallback is inline.
**Ledger version:** 1; same backup/read-only policy already implemented in `lounge-progress.js` (corrupt → `_bak`, newer → read-only).

### R-SPRITE — inline sprite coverage
**Evidence:** `icons.js:97-107` builds one SVG symbol sheet and exposes `CodexIcons.has/paint/names`. 174 `data-sprite` usages in JS; 26 remaining `pixelart-icons-font` references (mostly generated `mi` spans and legacy markup).
**Decision:** v10 uses its own 16 px inline SVG sprite (`js/v10/icons.js`, subset of the existing glyphs plus expedition glyphs) and never loads the icon-font CDN. Missing glyphs are added to the v10 sprite; legacy is untouched.

### R-TEST — test commands, fixtures, browsers
**Evidence:** `playwright.config.js:37-51` defines chromium/firefox/webkit; `package.json` has no scripts; tests are 120 declarations in 10 files under `tests/`; `docs/lounge-architecture.md:104` records only Chromium verified. There are no fixture save files.
**Decision:** add `npm test` scripts (`test`, `test:v10`, `lint:units`, `inventory`, `manifest`). New v10 specs run first in Chromium; full legacy suite is run and recorded. Pre-existing failures are recorded, not fixed.
**Environment note:** this workspace has Chromium installed through Playwright; Firefox/WebKit binaries may be absent. Any unavailable browser is recorded as unverified, never as green.

### R-THEME — theme toggle
**Evidence:** no `data-theme`, no `prefers-color-scheme`, no theme control. The only match is the v10 planning comment at `lounge-world.css:2`.
**Decision:** v10 slate Day/Night follows `prefers-color-scheme`, overridable in Logbook → Settings. Chrome colour is depth-driven, not a light theme.

### R-FRAMES — rAF / interval sites
**Evidence (file: matches):** `network.js:8`, `systems.js:5`, `lounge-console.js:4`, `codex-plus.js:3`, `ocean.js:2`, `avatar.js:2`, `guide.js:2`, `social.js:2`, `v6.js:2`, `account.js:1`, `lounge-games-sky.js:1`, `lounge-world.js:1`, `v5-extras.js:1`, `archive/guide-legacy.js:1`.
**Decision:** v10 registers every loop with `CodexLoop`. Legacy paths are untouched. `CodexLoop.activeCount()` is exposed for tests; the dive screen registers zero loops.

## Consequences for the build

1. `app.html` is the v10 entry; `index.html` gains only a 6-line redirect at the top.
2. Storage is Option B (`cx_v10_progress`); no legacy key writes before cutover.
3. Cloud sync is local-first, and "Synced" is not renderable. The honest status vocabulary is Saved / Saving… / Saved on this device / Couldn't save.
4. Wreck fidelity uses the legacy renderer in `wreck.html` rather than a reimplementation in `app.html`.
5. No new runtime dependencies. Fonts are self-hosted (two families, latin subsets) and the icon-font CDN is not used on v10 screens.
6. Six stylesheets are not touched; v10 has one tokenised stack under `css/v10/`.

## Environment

- Node 22.x, Playwright 1.64.1, Windows 10/11.
- Specs run against `file://` for the legacy pages; v10 functional specs use `file://` too (the router and loader are file-safe). Performance and service-worker runs use `scripts/serve.js` over HTTP.
- Firefox/WebKit availability is checked at the gate and recorded, not assumed.
