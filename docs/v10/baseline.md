# Baseline — classic Polycodex

Captured 2026-10-30T08:37:00.003Z with Slow 4G + 4× CPU.

| Scenario | LCP | DCL | Load | Heap | Long tasks | JS gzip | CSS gzip |
|---|---:|---:|---:|---:|---:|---:|---:|
| legacy-home | 6472 ms | 24684 ms | 24997 ms | 0 MB | 31 | 664 KB | 56 KB |
| legacy-lesson | 5584 ms | 18902 ms | 19075 ms | 0 MB | 55 | 664 KB | 56 KB |

The classic shell eagerly loads fonts, KaTeX, Prism, marked, DOMPurify, MiniSearch, confetti, Firebase and Supabase. v10 loads only the shell and the one live unit on demand.
