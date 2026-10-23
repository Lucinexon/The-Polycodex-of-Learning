# Observation Lounge — architecture and extension guide

This document describes how the lounge ("world") layer is put together after the overhaul, how to extend it, and where the seams for a future app-wide **v10** redesign are. Everything here is vanilla JS/CSS with no build step; modules are plain scripts that attach one `window.Codex*` global each.

## 1. Module map

Load order in `index.html` matters only where noted. Every module after `lounge2.js` is an **optional extension**: the original test fixtures load `lounge2.js` alone and still get the four original rooms.

| Module | Global | Owns |
|---|---|---|
| `js/core/network.js` | `NetworkEngine` | Presence, Firestore/Supabase transport, base `LoungeEngine` (canvas, loop, avatars), `ChatEngine`. **Unchanged contracts**; only presence parsing gained an optional `sr` field. |
| `js/features/lounge2.js` | `CodexLounge` | World core: room/hotspot **registry**, walking, doors and spawns, locks, keyboard play, event bus, FX layer, scenery/overlay/handler seams, pause API. |
| `js/features/lounge-games.js` | `CodexLoungeGames` | Game registry (`register`, `meta`, `observe`, `report`), **hosts** (`host.stage`, `host.consoleTab`), and Order Up (classic + tiers). |
| `js/features/lounge-play.js` | `CodexLoungePlay` | NPC schedules/dialogue, `launch()` (one current game), shared daily XP cap (`awardXP`). Original behaviour preserved. |
| `js/features/lounge-progress.js` | `CodexLoungeProgress` | Versioned, validated progress ledger (see §3). |
| `js/features/lounge-art.js` | `CodexLoungeArt` | Procedural scenery: deck rebuild, side rooms, door sprites, depth passes. Shared geometry (`GEO`, `PROPS`). |
| `js/features/lounge-world.js` | `CodexLoungeWorld` | Content tables (sky, discoveries, quests), side-room definitions, **interaction registry**, info card, quests, rewards (`settle`), NPC lines, state-reflecting scenery. |
| `js/features/lounge-games-{sky,keeper,cipher}.js` | via `register()` | Celestial Survey, Ecosystem Keeper, Archive Cipher. |
| `js/features/lounge-console.js` | `CodexLoungeConsole` | Activity Console (tab registry), world focus, Escape policy, layout fitting. |
| `css/lounge-world.css` | — | Layout, console, focus, mobile sheet, game surfaces, **design tokens**, microinteractions. |
| `js/features/avatar*.js` | `CodexAvatar` | Avatar catalog/rig/animation (append-only; see §7). |
| `js/features/social.js` | `CodexChat` | The chat dock (now also Study rooms and Catch-up). |

### Chat
The lounge no longer renders a chat panel. Messaging is the **dock** (`social.js`). `ChatEngine`'s DOM (`#chatLog`, `#chatInput`, …) is kept in a hidden mount (`#chatEngineMount`) because `ChatEngine` still feeds the speech-bubble layer (`ChatEngine.lastDocs`) and its `render()` contract is covered by `tests/chat-avatar.spec.js`. Features that previously existed only in that panel moved: **Study rooms** and **Catch up** → dock; **admin broadcast bar** → console footer (same element ids).

## 2. Rooms, doors and interactions

### Registry (`lounge2.js`)
```js
CodexLounge.registerRoom({ id, n, i, k, d, parent?, spawn?:{x,y,from:{<roomId>:{x,y}}}, lock?:()=>null|'reason', hot:[hotspot…] })
CodexLounge.addHotspot(roomId, hotspot)           // e.g. the door into a side room, placed in the parent
CodexLounge.setSpawn(roomId, fromRoomId, {x,y})   // where you appear when arriving from another room
```
* Room ids match `/^[a-z]{2,12}$/`. A room with `parent` is a **side room**: reached only through `door` hotspots, never shown in the ring tabs. Main rooms keep `prev/next` (the two edge doors) and their original hotspot geometry.
* Hotspot: `{id,t,x,y,w,h,sx,sy,l, …}`; `(sx,sy)` is the stand point (must be walkable: x 16–464, y 205–282). Seat ids match `/^[a-z0-9]{1,8}$/` because they travel in presence. `registerRoom` **rejects** (and logs) malformed definitions; it never half-registers.
* Types: `door` (`to`), `seat`, `npc`, `ix` (registered interaction), plus the original `obj` types.
* Seams: `CodexLounge.handlers[type]` (arrival handler), `addOverlay(fn)` (after characters), `decorate(room, fn)` (scenery layer, behind characters), `registerArt(room,{stat,dyn,draw,light})`, `on/off/emit` (events: `room`, `active`, `arrive`, `locked`, `discover`, `win`, `pause`).
* Input: click/tap, **keyboard** (focus the canvas; arrows/WASD move, `E`/Enter/Space uses the highlighted object), and the console's *Things to do* list (every interaction is reachable without pointing at the canvas). `pause(token)/resume(token)` gate world input while a game owns it.

### Adding a room
1. Draw it: `CodexLoungeArt` painter `{stat(ctx), dyn(L,ctx,t), light}` registered with `registerArt`. 480×300 logical canvas; floor starts at y=185.
2. Register it in `lounge-world.js → registerWorld()` (with an `out` door and `spawn`), add the entrance door to the parent with `door(...)` + `setSpawn(...)`.
3. Put door rectangles in `CodexLoungeArt.GEO` so the sprite and hitbox cannot drift (tests assert this).

### Adding an interaction (`lounge-world.js`)
```js
defIx({ id, room, hot:{x,y,w,h,sx,sy}, l:'Label', verb:'Do the thing', icon:'🔎',
        requires?: () => null | 'reason',          // locked/gated → shown to the player, never silent
        run(api) { api.info({title,pages:[…],onView}); api.discover('id'); … } })
```
All interactions share one arrival handler, one feedback surface (the in-stage **info card**, `Esc`-closable, keyboard-navigable) and one persistence path (the ledger). Give it an entry in `FRESH` if it should show a "something new here" marker.

## 3. Progress ledger (`cx_lounge_world_v1`)
```
{ v:1, rooms:{id:{n,t}}, found:{id:ts}, items:{id:n}, quests:{id:{s,p,t}}, games:{id:{best,plays,wins,last,tier}}, log:[{t,k,id,x}], stats:{…} }
```
* Everything read from storage is re-validated by `clean()`; keys are `[A-Za-z][A-Za-z0-9_]{0,23}`, numbers clamped, text stripped of `<>`/control chars, log capped at 40.
* **Corrupt JSON** → copy kept in `…_bak`, fresh ledger. **Newer schema** (`v` > 1) → treated as read-only; nothing is overwritten (a site rollback cannot destroy progress). To migrate, bump `VER` and add a step in `load()` before `clean()`.
* Legacy `cx_lounge_v1` (NPC visits, AI cache, `best`, XP cap) is untouched; only `best.*` is **read** once to seed `games.*.best`. `cx_lounge_ui_v1` holds console open/closed + last tab.
* `games[id].tier` is *the* progress number per game: shifts won (Order Up), charts cleared (survey), tanks stabilised (keeper), cases solved (cipher).

## 4. Minigames
Contract: `register(id, { start(opts) → ctl, meta })`; `ctl = { quit(why), destroy(), dead, el? }`. `opts.onEnd(result)` fires **once per run** (result `{won,score,rounds,mistakes,quit,…}`), `opts.onClose(ctl)` exactly once on destroy; games call `CodexLoungeGames.report(id,result)` first so observers (ledger, rewards) see it. `destroy()` must be idempotent. `CodexLoungePlay.launch` keeps **one** current game and destroys it on room change/deactivation.

| Game | Where | Mechanic | Presentation |
|---|---|---|---|
| Order Up (+ Lunch Rush, Chef's Table) | Café / Kitchen | memory & sequencing | modal popup (original) |
| Celestial Survey | Dome telescope | spatial pattern memory | `host.stage` — takes over the viewport |
| Ecosystem Keeper | Conservatory terrarium | systems balance (pure model, 2 actions/cycle) | `host.consoleTab` — world stays live |
| Archive Cipher | Archive cipher desk | deduction / decoding (4 real ciphers) | `host.stage` — decoder bench |

**Rewards** are one path (`settle` in `lounge-world.js`, via `observe`): tier rises only on first clear; first-clear XP goes through `CodexLoungePlay.awardXP` (shared daily cap of 30); replays pay nothing; quest XP is paid once because the ledger is marked done *before* the reward. **Classic Order Up is frozen**: tiers are opt-in (`opts.tier`), tier-1 consumes the RNG and returns the result shape exactly as before.

## 5. Console, focus, layout
* Console tabs: `CodexLoungeConsole.registerTab({id,label,order,badge?,render(panel,api)})`, `unregisterTab(id)`. Panels are persistent; use `api.setHTML` (diffed, keeps keyboard focus by `data-fk`). `host.consoleTab` uses the same registry for activities.
* **World focus** (`#lobby.is-world-focus`) is separate from the app-wide reading mode `body.focusmode`. The overlay sits at `z-index:70`, **below** the chat dock (78) and game overlay (84).
* **Escape policy** (capture phase): another layer open (game, dialogue, info card, dock, any `[role=dialog]`/`.modal`) or typing → not ours; else a phone sheet closes first, then world focus ends. The console panel itself is never closed by Escape on desktop. Games/cards handle Esc themselves and stop propagation.
* Phones (≤900px): console is an opaque bottom sheet above the bottom nav; room/emote strips scroll sideways; controls ≥44px.

## 6. Motion, sound and cost
* Design tokens live at the top of `css/lounge-world.css` (`--lg-dur-*`, `--lg-ease`, `--lg-focus`, `--lg-surface`, radii, accent colours). They are the only place durations live, and `prefers-reduced-motion` collapses them in one rule. JS effects check `L.REDUCED` (static forms: rings instead of expanding rings, no dust, no rotation tween).
* Cosmetic effects (`CodexLounge.fx`: sparkle/dust/ping/deny/confetti) are **local only**: they never touch presence (a test asserts zero presence calls), the list is capped (28), and it is cleared when the lounge deactivates. The console's 4 s refresh runs only while the lounge is showing **and** the document is visible; the world loop already stops on deactivation.
* Sound reuses the engine's `sfx()` (honours the existing mute); no new audio assets.

## 7. Multiplayer and avatar compatibility
* Presence stays compact: `r` is always a **main** room id (older clients show you there), optional `sr` names a side room. Receivers validate `sr` against *their own* registry (`roomOf`): remote data can name a room, never define one. No game state is broadcast.
* Avatar codes are dotted base-36 fields validated by `[0-9a-z.]{3,80}`. Catalogs are **append-only** (never reorder). `forName()` is frozen to the original hat count (`LEGACY_HATS = 18`) so name-derived looks (chat fallbacks, guests, NPCs) cannot change when catalogs grow; `tests/avatar-compat.spec.js` pins 40 golden codes captured from the original `main`.
* **Arms** are two-bone IK limbs (`drawArm` in `avatar-rig.js`). The rest hand target is now *inward and short of full reach* (`SKEL[].hand`), so relaxed arms hang with a soft elbow and the hands sit at the hips. The legacy outward rest (`hand0`) is blended back in as a pose offset grows (`kb`, 0 below 2.5 px → 1 above 5.5 px), so gesture-sized poses (wave, sip, heart, dance) keep exactly the targets they were authored against, and there are no pops between frames. Walk, cheer and spark clips were retuned; `tests/avatar-studio.spec.js` measures silhouettes and fails on the original rig.
* **Avatar studio** (`avatar.js edit()`): categories wrap instead of clipping and form a keyboard tablist; the option grid uses a roving tabindex with arrow/Home/End navigation; focus and grid scroll survive re-renders; entries added after the original release (`LEGACY` in `avatar.js`) carry a "new" dot and "(new)" in their accessible label.
* New silhouettes (hair 24–29, hats 18–21, extras 16–19, outfits 18–23, shoes 7–9, legs 6–7, eyes 13–15, brows 6–7, mouths 11–13) are verified mechanically to differ from every other option in their field.

## 8. v10 groundwork (what exists, what does not)
**Exists:** (a) every lounge surface reads `--lg-*` tokens, so a v10 theme can restyle by overriding them at `:root`/`[data-theme]`; (b) presentation is behind replaceable seams — `CodexLoungeConsole` (tab registry), `CodexLoungeGames.host` (`stage`/`consoleTab`), the info card (`api.info`), `registerArt`/`decorate` — so a v10 shell can supply its own implementations without touching world logic; (c) content (rooms, quests, discoveries, games) is data + registries, not DOM; (d) the ledger is versioned for migrations.
**Does not exist (deliberately):** the v10 visual redesign itself, an app-wide design-system package, or cross-app navigation changes.

## 9. Tests
`npm test` runs Playwright against `index.html` (file://) and fixtures. New specs: `lounge-console`, `lounge-world`, `lounge-games2`, `lounge-polish`, `avatar-compat`. Notes: tests that sample the canvas wait for `CodexLounge.fading()` (the room fade is frame-based); state-dependent scenery is asserted by rendering decorators at a fixed time (`CodexLounge.paintDecor`), not by counting live pixels, because ambient animation changes pixel counts frame to frame.

## 10. Known limitations
* The canvas backing store is still 480×300 and CSS-scaled with `image-rendering: pixelated`; on-canvas text is soft at large focus sizes. A 2× backing store would fix it but touches every painter.
* No cooperative multiplayer activity was added.
* `chat-pin.spec.js › pin shows a compact bar…` (a ±2 px dock-width assertion) failed deterministically on the untouched `main` and in most runs during this work, then passed in the final runs, with no change to dock layout code. Treat it as environment-sensitive; it was not weakened.
* Verified on Chromium 141 only. Firefox and WebKit builds were not available in the verification sandbox, so cross-browser behaviour is untested.
