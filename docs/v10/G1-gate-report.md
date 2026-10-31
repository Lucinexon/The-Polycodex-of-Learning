# Polycodex v10 — G1 gate report

- Branch: `v10`
- Baseline: `main` at `7480579`
- Date: 2026-10-31
- Status: **G1 NOT PASSED — vertical slice is built and test-green on the v10 path, but the gate has open items.**

This report records what is actually working, what is not, and the evidence for each claim. It does not treat mocks, screenshots or planned work as completed functionality.

## 1. What the G1 slice contains

| Deliverable | Status | Evidence |
|---|---|---|
| M1.1 CodexProgress store, save rules, event keys, merge, migration, failure handling | **Done** | `js/v10/progress.js`; 11 progress/storage unit tests; 5 migration Playwright tests |
| M1.2 CodexUnits loader + Ratios unit (5 dives) through the content pipeline | **Content reviewed, not published** | `js/units/number/shallows/ratios.js`; `js/units/number/shallows/ratios.review.md`; lint green; human sign-off pending |
| M1.3 v10 shell: router, tokens, CodexFX, CodexLoop, dive computer with save status | **Done** | `app.html`, `js/v10/router.js`, `css/v10/tokens.css`, `js/v10/fx.js`, HUD/save chip |
| M1.4 Dive player and Surface, including states | **Done** | `js/v10/app.js` renderDive/renderSurface; app + responsive specs |
| M1.5 Descent and unit sheet (Number Reef, Shallows) | **Done** | `renderDescent`, `renderMap`; app spec |
| M1.6 Title, Continue, onboarding, legacy migration notice | **Done** | Title/onboarding/migration notice; app + migration specs |
| M1.7 Reef Map with one live reef, planned reefs, 42 Wrecks | **Done** | `renderMap`; `wreck.html`; 3 wreck specs covering all 42 lessons |
| M1.8 Tune template, Recipe Scaler inline and in Kitchen, Lounge fallback | **Done** | Tune template and inline practice; Kitchen two-way return loop with exactly-once result recording and blocked-Lounge fallback, covered by `tests/v10/lounge-loop.spec.js` (3 tests) |
| M1.9 Lazy loading on the v10 path | **Done for shell modules** | `search.js`, `activities.js`, `practice.js` load on demand via `ensureSearch`/`ensureActivities`/`ensurePractice`; Title loads zero third-party scripts |

The 14 mock screenshots in `docs/v10/mock/` are G1a design artifacts, not G1 functionality.

## 2. Gate criteria

| G1 criterion | Result | Evidence / caveat |
|---|---|---|
| Owner playtests on a real phone | **Not done** | No real-device playtest notes are recorded. This cannot be claimed from desktop Chromium. |
| Budgets pass on the throttled profile | **FAIL — 6/9** | Latest median-of-3 run: Title LCP 2604 ms (budget 2500), cached dive 566 ms (budget 300), uncached dive 3759 ms (budget 1500). The other six checks pass. See §4. |
| All tests green, new and existing ~120 specs | **New green; legacy 120/126 on Chromium, with pre-existing and load-sensitive failures** | v10: 22/22. Units: 16/16. Legacy Chromium: 120/126. One deterministic failure (`tests/lounge-play.spec.js:24`, `seat mismatch orrin a2`) reproduces on `main` at `7480579`; five others are load-sensitive, and a serial rerun passed four of them. The remaining marker-pixel test is an animation-phase flake that passes in a standalone probe on both `main` and `v10`. See §5. |
| Migration fixtures pass | **Pass** | 5/5 migration specs: backup, display, idempotence, source keys untouched, corrupt/read-only/failure handling |
| A11y checks for the slice pass | **Automated pass; manual screen-reader pass not recorded** | Contrast 66/66; responsive/a11y specs 5/5; keyboard path covered by app spec. A manual screen-reader run is still an open human check. |
| Ratios unit through the pipeline to `published` | **Not published** | Status is `reviewed`; review file present; human sign-off pending. The plan requires sign-off before `published`. |
| AC-LG1 Kitchen loop both ways | **Pass** | `tests/v10/lounge-loop.spec.js`: dive → Kitchen → same card; Tune result recorded once (re-completion adds no XP event); inline practice completes when `lounge2.js` is blocked. |

## 3. Content integrity

- Phase 1 content is exactly **Number Reef · Shallows · Ratios**, 5 dives, 4 cards per dive, 15 Surface checks, 8 glossary entries, 5 collectibles, 5 practice templates.
- `js/units/number/shallows/ratios.review.md` records the fresh-context review: arithmetic, cross-products, unit conversions, distractors and objective coverage were checked; no factual or arithmetic error was found.
- The unit remains `status: 'reviewed'`, not `published`. The app does not present it as human-approved.
- All 42 legacy lessons remain available as Wrecks with full content fidelity:
  - heading parity,
  - ≥99.5% token overlap,
  - no raw Markdown/TeX,
  - no overflow,
  - scrolling never marks a Wreck read; only explicit **Finish** does.
- Legacy data is never deleted or overwritten: `P.importLegacy()` backs up the source verbatim, imports counts, and a second import is a zero-event no-op.

## 4. Performance evidence

Harness: `scripts/perf-budget.js`, Chromium, Slow 4G (1.6 Mbps down, 150 ms RTT), 4× CPU. Gate scenarios run three times in a fresh browser each; the table reports the median run per metric. Every run is stored in `docs/v10/perf.json`.

| Check | Measured | Budget | Result |
|---|---:|---:|---|
| Title JS (gzip) | 50 KB | 150 KB | PASS |
| Title CSS (gzip) | 12 KB | 25 KB | PASS |
| Title third-party scripts | 0 | 0 | PASS |
| Title LCP | 2604 ms | 2500 ms | **FAIL** |
| Title event latency (INP proxy) | 128 ms | 200 ms | PASS |
| Dive first card cached | 566 ms | 300 ms | **FAIL** |
| Dive first card uncached | 3759 ms | 1500 ms | **FAIL** |
| Ratios unit (gzip) | 9.5 KB | 30 KB | PASS |
| backdrop-filter in v10 CSS | 0 | 0 | PASS |

Important context, stated honestly:

- The measurement machine was heavily loaded by the user's own browser and editor (load ~43–63%; no leftover Playwright browsers). Results varied 2–10× between runs.
- On a quieter machine, a fresh-browser probe measured the cached Descent→card path at **112–145 ms** (median ~136 ms), which is inside the 300 ms budget.
- The uncached best observed was **~1844 ms**, still above 1500 ms. The remaining cost is the boot resource wave plus the first paint of the dive screen, not the unit download (the unit preload completes around the same time as `app.js`).
- The Title LCP failure in the latest run is consistent with machine load; the same route measured 1252 ms earlier. It is still recorded as a failure because that is what the gate run measured.
- No metric was weakened or renamed to make a failure pass. The switch from navigation DCL to real `#dive-title` paint was a correctness fix, not a relaxation: it measures the card the learner actually sees.

## 5. Test evidence

| Suite | Result | Notes |
|---|---|---|
| Unit tests | **16/16 pass** | `npm run test:units`; includes unit lint, broken-fixture lint, manifest current, boot bundle current, content inventory hashes, progress/storage/migration |
| v10 Playwright | **22/22 pass** | `npm run test:v10`; app 6, migration 5, responsive 5, wreck 3, Lounge loop 3 |
| Legacy Playwright | **120/126 pass on Chromium** | `npx playwright test tests --grep-invert "@v10" --project=chromium --reporter=line`; one deterministic pre-existing failure reproduces on `main` at `7480579`: `tests/lounge-play.spec.js:24` (`seat mismatch orrin a2`). Five other failures were load-sensitive under a busy machine: `lounge-games2.spec.js:315`, `lounge-play.spec.js:169`, `lounge-play.spec.js:210`, `lounge-polish.spec.js:63`, `lounge-polish.spec.js:96`. A serial rerun of those five passed four; only `lounge-polish.spec.js:96` still failed in the harness. A standalone probe of the same marker check found 18 gold pixels on both `main` and `v10`; the marker is animated and its pixel count oscillates, so the harness sampled a low phase. It is a pre-existing animation-phase flake, not a v10 regression. `lounge-polish.spec.js:167` (hidden cleanup) passed in this run. The full three-browser run was not usable under load and exceeded its 15-minute timeout. |
| Contrast audit | **66/66 pass** | `npm run contrast`; report in `docs/v10/contrast-report.md` |
| Migration fixtures | **5/5 pass** | Backup, import display, idempotence, source keys untouched, corrupt/read-only/storage-failure handling |
| Content inventory | **Pass** | `docs/v10/content-inventory.json` hashes and order match |
| Manifest / boot bundle | **Current** | `npm run manifest:check`, `npm run boot:check` |

## 6. Accessibility and responsive evidence

- Contrast: 66/66 pairs pass the WCAG checks in `scripts/check-contrast.js`.
- Responsive/a11y Playwright: 5/5 pass, including keyboard, lantern and outline operation without a pointer.
- Text-size and reduced-motion handling are present.
- **Open:** a manual screen-reader pass (VoiceOver/TalkBack/NVDA) has not been recorded. Automated checks are not a substitute for that human check.

## 7. Frozen contracts

The following were not changed:

- `network.js` transport.
- Presence format.
- Avatar catalogs.
- Classic Order Up behaviour.
- Chat-avatar contracts.

The v10 path does not load Firebase, Supabase, `network.js`, MiniSearch or third-party scripts. The Wreck reader uses the vendored renderer with sanitized fallback.

## 8. Open items required before G1 can pass

1. **Human content sign-off for Ratios.** A named human reviewer must review `js/units/number/shallows/ratios.review.md`, record `reviewedBy` and the date, and only then change the unit to `published`. Until then the unit stays `reviewed`.
2. **Owner playtest on a real phone.** Record device, OS, browser, throttling/network, and notes on the golden path, keyboard/touch, and perceived responsiveness.
3. **Performance gate.** Re-run `npm run perf` on an idle machine and record the median-of-3 result. Current status is 6/9; cached is expected to pass on an idle machine (~136 ms probe), Title LCP is load-sensitive, and uncached needs further boot/first-paint work to reach 1500 ms.
4. **Manual screen-reader pass** for the slice.
5. **Legacy suite decision.** Current Chromium result is 120/126. One deterministic failure is pre-existing on `main` in frozen Lounge code; five others were load-sensitive, and the remaining marker test is an animation-phase flake that passes in a standalone probe on both branches. The full three-browser run timed out under machine load and is not usable evidence. Decide whether to accept these as out of scope for G1 or fix them separately with owner approval; they are not caused by v10.

## 9. Reproduce

```powershell
node scripts/serve.js 4173
npm run test:units
npm run test:v10 -- --project=chromium --reporter=line
npm run test:legacy
npm run contrast
npm run perf
npm run manifest:check
npm run boot:check
```

The dev server serves gzip for compressible files and `Cache-Control: no-store` for HTML. The perf harness uses a fresh browser per scenario and stores every run in `docs/v10/perf.json`.

## 10. Verdict

The v10 vertical slice is real, navigable, test-green on its own path, and preserves all 42 legacy Wrecks and legacy progress. It is **not** a passed G1: content is reviewed but not human-signed-off, the owner phone playtest and manual screen-reader pass are not recorded, and the throttled performance gate is 6/9. Those are the honest blockers.
