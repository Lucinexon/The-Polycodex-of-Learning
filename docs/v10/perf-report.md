# Polycodex v10 performance gate

Generated 2026-10-30T08:37:00.003Z against `http://127.0.0.1:4173` with Chromium, Slow 4G (1.6 Mbps down, 150 ms RTT) and 4× CPU throttling. Gate scenarios run three times in a fresh browser each; the table reports the median run (per metric).

## Gate

| Check | Measured | Budget | Result |
|---|---:|---:|---|
| Title JS (gzip) | 50 KB | 150 KB | PASS |
| Title CSS (gzip) | 12 KB | 25 KB | PASS |
| Title third-party scripts | 0 | 0 | PASS |
| Title LCP (Slow 4G, 4× CPU) | 2604 ms | 2500 ms | FAIL |
| Title event latency | 128 ms | 200 ms | PASS |
| Dive first card cached | 566 ms | 300 ms | FAIL |
| Dive first card uncached | 3759 ms | 1500 ms | FAIL |
| Ratios unit (gzip) | 9.5 KB | 30 KB | PASS |
| backdrop-filter in v10 CSS | 0 | 0 | PASS |

## Baseline / comparison

| Scenario | LCP | DCL | Load | Heap | Long tasks | Max event | JS gz | CSS gz | Third-party |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| legacy-home | 6472 ms | 24684 ms | 24997 ms | 0 MB | 31 | 0 ms | 664 KB | 56 KB | 17 |
| legacy-lesson | 5584 ms | 18902 ms | 19075 ms | 0 MB | 55 | 4584 ms | 664 KB | 56 KB | 17 |
| v10-title | 2604 ms | 2714 ms | 2714 ms | 0 MB | 5 | 128 ms | 50 KB | 12 KB | 0 |
| v10-dive-cached | 3628 ms | 1916 ms | 1917 ms | 0 MB | 6 | 0 ms | 50 KB | 12 KB | 0 |
| v10-dive-uncached | 3776 ms | 3757 ms | 3757 ms | 0 MB | 4 | 0 ms | 50 KB | 12 KB | 0 |

## Notes

- Resource weight is gzip size fetched from the same files the page requested; transfer sizes are not used because the dev server gzips on the wire.
- Dive “first card” is the real first paint of `#dive-title` after a double `requestAnimationFrame`. Cached is measured from a Descent click after the unit and shell are warm; uncached is a direct dive URL in a fresh browser.
- Title event latency is the longest `event` timing entry (INP proxy) from the Continue interaction, not wall-clock click duration.
- The 10-minute heap ratio is not run in the default gate (it is a 12-minute measurement). Run it manually before release.
- Legacy rows are the before baseline, not gates. They use the classic Home and the inline `#s1-1` lesson expansion.
- Full JSON, including every gate run: `docs/v10/perf.json`.
