# Ratios — content review

- Unit: `number-shallows-ratios` (Number Reef · Shallows · Ratios)
- Version: v1, rev 1
- Reviewer: Codex content review (fresh-context pass)
- Review date: 2026-10-28
- Status after review: `reviewed`
- Human sign-off: **pending** — this unit is not `published` and must not be presented as published until a human reviewer signs off and records `reviewedBy` plus the date.

## Scope

Reviewed every learner-visible string in `js/units/number/shallows/ratios.js`:

- 4 objectives and the `objectiveCoverage` mapping.
- 5 dives × 4 cards = 20 cards.
- 15 Surface checks (3 per dive), including prompts, options, correct answers, explanations and `why_wrong` distractors.
- 5 practice templates (`sort`, `sequence`, `tune`, `estimate`, `balance`) and their answers/tolerances.
- 8 glossary entries.
- 5 collectibles and their source notes.
- Sources and standards claims.

Method: read the unit against its stated sources (OpenStax Prealgebra 2e §5.6, Illustrative Mathematics Grade 6 Ratios), recomputed every answer independently, checked each distractor against the concept it tests, and checked that the objective coverage actually exercises each objective twice.

## Per-dive findings

### Dive 1 — What a ratio is

- 2:1 flour:milk and the order-matters point are correct.
- Part-to-part 2:1 vs part-to-whole 2:3 is stated and tested correctly.
- Doubling 2:1 → 4:2 is correct.
- 120 km in 2 h as a rate example is correct.
- Prompt answers verified: 2:1; milk:whole = 1:3; fill = 4:2; swimmers:lifeguard is part-to-part.
- Checks verified: `d1k1` (3 parts blue), `d1k2` (2/3 = 4/6), `d1k3` (1/2 of 10 = 5).
- Practice `sort` places the part/whole examples correctly.
- Collectible: brass measuring cup; NIST Handbook 44 Appendix C is an appropriate source.

### Dive 2 — Equivalent ratios

- ×4: 2:3 → 8:12 is correct.
- ÷5: 10:15 → 2:3 is correct.
- Cross products: 4×9 = 6×6 = 36 is correct.
- Double number line: 3 cups per batch → 12 cups at 4 batches is correct.
- Prompt answers verified: 3:4 × 3 = 9:12; 12:18 ÷ 6 = 2:3; 5:7 × 2 = 10:14; 4 batches = 12 cups.
- Checks verified: `d2k1` (7:4 → 14:8), `d2k2` (nuts:whole = 2:7), `d2k3` (2/3 of 12 = 8).
- Practice `sequence`: write fractions → cross-multiply → compare products → equivalent. The ordering is mathematically sound.
- Collectible: recipe card; no factual claim needs a source.

### Dive 3 — Rates and unit rates

- 120 km / 2 h = 60 km/h is correct.
- Shop A 4 kg for $12 = $3/kg; Shop B 6 kg for $15 = $2.50/kg; A is cheaper per kg. Correct.
- 300 g for $6 = $0.02/g; 500 g for $12 = $0.024/g; the smaller pack is cheaper per gram. Correct.
- 3/4 of a book in 1/2 h = 1.5 books/h is correct.
- 1/2 km in 1/4 h = 2 km/h is correct.
- Checks verified: `d3k1` (48 pages / 4 min = 12 pages/min), `d3k2` (6:9 → 2:3), `d3k3` (3/4 of 20 = 15).
- Practice `tune`: recipe from 2 to 5 servings, factor 2.5; rice 1 cup, stock 2 cups, lemon 1 whole. Correct.
- Collectible: brass scale dial; the unit-rate connection is accurate.

### Dive 4 — Scaling a ratio

- 1:5 map: 4 cm → 20 km and 7 cm → 35 km are correct.
- 3:2 flour:milk with 9 flour → 6 milk is correct.
- 2:5 paint:water with 8 paint → 20 water is correct.
- 2 cm:10 km: 6 cm → 30 km is correct.
- 1:100 room 4 m × 6 m → 4 cm × 6 cm; the plan ratio 4:6 simplifies to 2:3. Correct.
- 2:3 scaled ×5 → 10 cm, 15 cm. Correct.
- Checks verified: `d4k1` (1:24 model, 18 cm → 432 cm), `d4k2` (15 L / 3 min = 5 L/min), `d4k3` (3/5 → 9/15).
- Practice `estimate`: 1 cm:5 km, 6.4 cm → 32 km with tolerance 1.5. Correct.
- Collectible: folding map scale; Ordnance Survey is an appropriate source.

### Dive 5 — Comparing ratios

- A 3:4 = 0.75 vs B 5:7 ≈ 0.714 → A is stronger. Correct.
- 2:5 = 0.4 vs 3:8 = 0.375 → 2:5 is stronger. Correct.
- Common term: 4:6 and 6:9 → 12:18. Correct.
- Proportion 3:4 = 9:x → x = 12. Correct.
- 2:5 = 6:x → x = 15. Correct.
- The card correctly warns that a ratio does not imply fairness or a verdict, and that the same parks:people ratio does not fix the actual counts.
- Checks verified: `d5k1` (1:3 ≈ 0.33 vs 2:7 ≈ 0.29 → 1:3), `d5k2` (1:80 plan, 5 cm → 400 cm = 4 m), `d5k3` (5/6 of 18 = 15).
- Practice `balance`: 2:3 on the left, 4:x on the right → x = 6; options 5, 6, 8, 9. Correct.
- Collectible: ratio lens.

## Distractor review

Every `why_wrong` explanation names the actual error class rather than saying “wrong”:

- Additive thinking where multiplicative thinking is required (e.g. adding the same amount instead of multiplying both terms).
- Reversing part-to-part and part-to-whole.
- Comparing numerators or denominators instead of the ratio value.
- Forgetting to scale both quantities.
- Treating a unit rate as a total.
- Confusing a ratio with a count or a fairness judgement.

No distractor was found to be accidentally correct, and no correct option is duplicated.

## Structural checks

- Objectives: 4; each is covered by two checks in `objectiveCoverage`.
- Checks: 15, exactly 3 per dive; every check has one correct answer and at least two plausible distractors.
- Cards: 20; every dive has 4 cards and ends with a prompt.
- Practice: one template per dive; all five templates are implemented in `js/v10/activities.js`.
- Glossary: 8 entries, all used by the unit.
- Collectibles: one per dive, each with a source note.
- Lint: `npm run lint:units` passes with no warnings.
- Size: 9.5 KB gzip, inside the 30 KB unit budget.

## Caveats and open items

- **Human sign-off is still required.** The unit remains `status: 'reviewed'`. Do not change it to `published` without a named human reviewer and date.
- The sources are well-known open references, but the exact page/anchor for Illustrative Mathematics is the site root rather than a specific task; a human reviewer may want a more precise citation.
- The unit uses British spelling in some learner-facing strings and US spelling in others; this is a copy-consistency issue, not a mathematical one.
- The Kitchen two-way return loop and exactly-once result recording are now implemented and covered by `tests/v10/lounge-loop.spec.js`; the inline practice remains available if the legacy Lounge scripts fail.

## Verdict

Content is mathematically correct, internally consistent, and appropriate for the stated 6.RP.A.1–3 objectives. It is ready for human review. It is **not** ready to be marked `published` until that review is recorded.
