# Feature inventory (M0.4 / P0.3)

Every legacy nav item and HUD element, with its v10 disposition and a one-line reason.
P0 means the capability remains reachable; “merge” means it is folded into a v10
surface rather than kept as a separate screen.

## Top bar

| Element | Evidence | Disposition |
|---|---|---|
| Menu / brand | `index.html:137-141` | Replace with the dive computer and the Title logo. |
| Search | `index.html:142-147` | Keep as Sonar, opened from the dive computer or `/`. |
| Streak HUD | `:149` | Hide. Streak guilt is banned; the forgiving weekly rhythm (P1) appears in Logbook. |
| Energy | `:150` | Move to Logbook → Extras. It does not belong on the learning path. |
| XP bar + level | `:151-155` | Merge. XP is a Logbook/Reference figure; the Title has no XP bar. |
| Probes | `:159` | Move to Logbook → Extras, unchanged. |
| Daily Dispatch | `:160` | Merge into Review → Daily Dive (P1). |
| Lounge | `:161` | Keep on the Title menu and as the practice venue. |
| Notebook | `:162` | Move to Logbook → Notes. |
| Badges | `:164` | Move to Logbook → Extras (read-only legacy badges). |
| Settings | `:165` | Keep as Logbook → Settings. |
| Account | `:166` | Keep as a Title corner icon and a Settings row. |
| Back to top | `index.html:170` | Drop; every v10 screen has its own scroll and header. |

## Sidebar / nav (`engine.js:222-233`, 19 items)

| Item | Disposition |
|---|---|
| Home | Replace with Title. |
| Sectors 1–10 | Replace with Number/Life/Matter & Motion/Sky & Sea/Signal/Chronicle reef map. Legacy sectors become Wrecks grouped by their sector, never removed. |
| Probes | Logbook → Extras. |
| Dispatch | Review → Daily Dive (P1). |
| Lounge | Title menu + practice link + Logbook → Extras entry. |
| Notebook | Logbook → Notes (P1 notes deep-link; legacy vault reachable from Extras). |
| Chrono Matrix | Extras; Sequence activity wraps its content later. |
| Sys-Log | Logbook → Reference. |
| Neural Matrix | Logbook → Review. |
| Void Trial | Wreck challenge / Zone Trial (P2). |
| Profile card, stats, Reset | Profile merges into Settings; Reset stays only in legacy (`?ui=legacy`). v10 never deletes progress. |

## Home cards and buttons

Home’s four cards (`index.html:211-214`) and five buttons are replaced by the four Title
items (Continue, Dive, Lounge, Logbook). No XP/streak/energy on Title.

## Lounge

Keep all rooms and games. Add the Kitchen practice link and Recipe Scaler. The Lounge
ledger stays authoritative for Lounge XP with its 30/day cap; first clears of linked
activities pay once through `CodexProgress` (`act:*:first`). No second currency.

## Kept without a v10 surface in P0 (reachable through `?ui=legacy`)

Chat, avatar studio, social/study rooms, notebook shared rooms, BYOK, probes, energy,
badges, Chrono Matrix, Void Trial, legacy sector quizzes. Cutover keeps
`?ui=legacy` for one release, so none of these becomes unreachable.
