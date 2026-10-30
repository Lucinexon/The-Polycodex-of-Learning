# Polycodex v10 — contracts (C1–C6)

Written before feature code, per plan §10. Deviations from the plan are explicit and
justified in `docs/v10/recon.md`.

## C1 — Unit schema

A unit is one ES-global script at `js/units/<reef>/<zone>/<unit>.js` that calls
`CodexUnits.register(unit)`. JSON-compatible data only: no DOM, no functions except
`verify` expressions and `accept` arrays, which are data.

```js
{
  id: "num-shallows-ratios", v: 1, rev: 1,
  reef: "number", reefTitle: "Number Reef", zone: "shallows", zoneTitle: "Shallows",
  title: "Ratios", est: 45,
  objectives: ["...", "..."],            // 2–4, sentence case, "You'll be able to…"
  prereqs: ["num-shallows-fractions"],   // soft
  standards: [{ fw: "CCSS", code: "6.RP.A.1" }],
  sources: ["OpenStax Prealgebra 2e, §5.1", "..."],
  flags: { math: true, code: false },
  status: "draft" | "reviewed" | "published",
  reviewedBy: "AI reviewer + owner", reviewedAt: "2026-10-28",
  dives: [{
    id: "d1", rev: 1, title: "The recipe problem", est: 6,
    hook: "…≤60 words…",
    cards: [{
      id: "c1", kind: "concept|worked|figure|formula|code|interactive|prompt",
      title: "…", body: "…markdown-lite…",
      visual: { alt: "…", caption: "…" } | null,
      mathDesc: "…required when flags.math and kind=formula…",
      concepts: ["num.ratio.equivalent"],
      prompt: { id: "p1", type: "choose|predict|fill",
                q: "…", opts: ["…"], a: 0 or "…", accept: ["3/4"],
                verify: "a * 4 == 3 * b", tol: 0.001,
                why: "…", why_wrong: { "0": "…" }, hints: ["…", "…"] } | null
    }],
    practice: { template: "tune", room: "kitchen", params: { … } },
    check: [{ id: "k1", q: "…", opts: ["…"], a: 1, why: "…",
              why_wrong: { "0": "…" }, concept: "num.ratio.equivalent",
              transfer: false, verify: null, variants: [] }],
    review: [{ id: "r1", front: "…", back: "…", concept: "…" }],
    collect: { id: "col-ratio-cup", name: "Measuring cup", art: "cup", fact: "…", source: "OpenStax …" },
    wreck: ["s2-4"]
  }],
  glossary: [{ term: "ratio", def: "…", concept: "num.ratio.equivalent" }]
}
```

Rules enforced by `scripts/lint-units.js`:

- required fields and types; unique card/prompt/check/review/collectible ids across the manifest
- no prerequisite cycles (`num-shallows-ratios` depends on fractions, which is not yet built; cycles still checked within published units)
- word limits warn only: card body > 200 words, hook > 60 words
- reading level warns only (Flesch–Kincaid, math/code skipped)
- banned-phrase list (plan §6.2)
- `visual.alt` required when `visual`; `mathDesc` required when `kind === "formula"` and `flags.math`
- every objective is covered by at least one check concept or by a `objective` tag on a review item
- numeric `verify` expressions are recomputed by a restricted arithmetic evaluator, never `eval`
- every referenced Wreck lesson id exists in the inventory
- gzipped unit file ≤ 30 KB
- `status === "published"` requires `reviewedBy` and `reviewedAt`

The manifest generator reads every unit through a Node `vm` sandbox and writes
`js/units/manifest.json` with ids, titles, objectives, estimates, statuses, concepts,
reef/zone, dive ids/titles, and search fields. **No card bodies.**

## C2 — Progress store v2 (`CodexProgress`)

### Storage decision

Option **B**: one key `cx_v10_progress`, one writer (`js/v10/progress.js`). Never
writes `polymath_codex_v1`, `cx_lounge_world_v1` or `cx_v5_srs` before cutover.
Rationale and evidence: `recon.md` R-STATE / R-SYNC.

### Schema

```js
{
  v: 2, deviceId: "…", updatedAt: "ISO",
  dives: { "<diveId>": { status: "in_progress|surfaced", cardId, rev,
            prompts: { "<promptId>": { ok, first, at } },
            checks:  { "<checkId>":  { ok, idk, at } },
            activity: { state, at } | null,
            startedAt, surfacedAt, updatedAt } },
  units: { "<unitId>": { testedOut, diveAnyway, at } },
  wrecks: { "<lessonId>": { status: "in_progress|read", anchor, para, updatedAt, readAt } },
  concepts: { "<conceptId>": { stage: 0..3, seenAt, practicedAt, recalledAt, appliedAt,
                                lastResult, lastExposureAt } },
  xp: { "<eventKey>": { amt, at } },
  goal: { daily: 1, days: { "YYYY-MM-DD": n } },
  collection: { "<itemId>": "ISO" },
  review: { "<itemId>": { due: <dayIndex>, box: 0..6, concept, source } },
  notes: { "<noteId>": { diveId, cardId, text, at } },
  prefs: { fx: "auto", text: 1, slate: "auto", sound: false, outline: true },
  legacy: { importedAt, sourceHashes: {}, imported: {} }
}
```

- XP total is always `sum(xp[*].amt)`. Never stored.
- `goal.days` keeps 60 entries; surfaced dives clear `activity.state`.
- Size target ≤ 100 KB at the end of Wave 2, asserted with a synthetic fixture.

### Save rules

Write synchronously to `localStorage` behind a 250 ms coalescing debounce on: card
rendered (once per card entry), prompt answered, check answered, activity completed,
surfaced, Wreck finished, settings changed. Wreck scroll uses a 1 s debounce. Flush on
`visibilitychange` (hidden) and `pagehide`. Every `setItem` is wrapped; failures keep
state in memory, surface "Couldn't save", retry on the next change, and never show
"Saved". Cloud sync is attempted only after a successful local write and never gates it.

### Event keys (idempotent)

`dive:<id>:surface`, `check:<id>:first-ok`, `prompt:<id>:first-ok`,
`act:<diveId>:<template>:first`, `unit:<id>:testout`,
`legacy:<source>:<recordId>`. Writing an existing key is a no-op. Buttons disable
until the transition commits.

### Merge (`merge(a, b)`)

- statuses: furthest along (`surfaced > in_progress > not_started`; `read > in_progress`)
- position: latest `updatedAt`
- concept stage: max; each timestamp max
- `xp`, `collection`, `legacy.imported`, `prompts`, `checks`, `notes`, `review`: union by key; duplicate keys keep the earliest `at`
- `prefs`: latest `updatedAt`
- absence never deletes
- `v > 2`: read-only, banner, no writes

### Migration

Read-only sources: `polymath_codex_v1`, `cx_lounge_world_v1`, `cx_v5_srs`.
Before the first import, write `cx_v10_progress_bak` (current v10 store) and
`cx_legacy_snapshot_<YYYY-MM-DD>` (verbatim copies of the three raw strings). If either
backup throws, abort the import and show a banner. Import XP, `S.completed` (as
`legacy_charted`), `S.seen` (as read Wrecks), `S.known` and SRS references, each with a
`legacy:*` event key. Re-import compares `sourceHashes`; unchanged sources are skipped.
Corrupt legacy JSON: skip, keep the raw string, banner, continue with a fresh v10 store.

## C3 — Tokens

`css/v10/tokens.css` is the single source. Values are plan §3.4; every text/background
pair is checked by `scripts/check-contrast.js`, which writes `docs/v10/contrast.md`.
Radii, spacing, borders, shadows and durations exist only as tokens. `--lg-*` aliases
map the Lounge to the same roles without a Lounge rewrite.

## C4 — CodexFX and CodexLoop

- `CodexFX.tier` ∈ `high|med|low|off`, exposed as `<html data-fx>`.
- Detection: `prefers-reduced-motion` → `off`; `saveData`/`effectiveType` 2g/slow-2g → `low`;
  `deviceMemory ≤ 2` or `hardwareConcurrency ≤ 2` → `low`; otherwise idle 30-frame probe:
  median > 20 ms → `low`, > 14 ms → `med`, else `high`.
- Downgrade ratchet: 2 s over 24 ms average drops one tier, shows a toast, never upgrades.
- Manual override persists in progress prefs.
- `CodexLoop.add(fn, {when})` returns a handle with `stop()`. Pauses on
  `document.hidden`; only `high` runs painter loops. `CodexLoop.activeCount()` is the
  number of running loops (tests require 0 on dive screens).
- No loop is registered outside an active interactive on low/off; no `backdrop-filter`
  anywhere in v10 CSS (grep test).

## C5 — Practice link and activity templates

Template interface: `mount(el, params, ctx)`, `serialize()`, `restore(state)`,
`onComplete(result)`, `unmount()`. Full keyboard operation, reduced-motion handling,
text alternative for canvas, no continuous animation on low.

`CodexPractice.open(templateId, params, ctx)` mounts inline (default). If a Lounge room
is linked and `window.CodexLounge` exists, `CodexLounge.setRoom(room, {from})` is called
first; the wrapper stores `{activity, params, returnTo}` in `sessionStorage.cx_v10_practice`,
then the Kitchen interaction reads it and mounts the same template over the world. A
persistent "Back to dive" control returns to the stored route. If the Lounge has not
become ready within 8 s, or errors, the inline mount proceeds.

`onComplete` reports once per attempt; `CodexProgress.completeActivity(diveId, template,
result)` writes `act:<diveId>:<template>:first` and awards XP only on first clear.

## C6 — Routes and UI states

| Route | Screen |
|---|---|
| `#/` | Title |
| `#/map` | Reef Map |
| `#/reef/<reef>/<zone>` | Descent |
| `#/unit/<unitId>` | Unit sheet (sheet over Descent) |
| `#/dive/<diveId>/<cardId>` | Dive player |
| `#/surface/<diveId>` | Surface |
| `#/wreck/<lessonId>/<anchor>` | Wreck reader (`wreck.html`) |
| `#/logbook/<tab>` | Logbook |
| `#/search?q=` | Sonar search |
| `#/review` | Review / Daily Dive |

Screen changes `pushState` (hash assignment); card changes `replaceState`. Unknown
routes fall back to `#/`. Every screen implements these states, with copy in
`js/v10/copy.js` and screenshot snapshots in `tests/v10-snapshots.spec.js`:
first visit, loading, empty, populated, in progress, completed, error, offline,
save failed, disabled (with stated reason).

Accessibility: one `<h1>` per screen, focus moves to it on navigation, `aria-live`
announces card changes, all targets ≥44 px, focus ring never removed, reduced motion
collapses durations, text-size setting scales tokens and reflows.
