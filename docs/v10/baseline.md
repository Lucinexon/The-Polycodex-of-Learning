# Baseline — classic Polycodex

Captured 2026-10-31T02:07:33.200Z with Slow 4G + 4× CPU.

| Scenario | LCP | DCL | Load | Heap | Long tasks | JS gzip | CSS gzip |
|---|---:|---:|---:|---:|---:|---:|---:|
| legacy-home | 4180 ms | 11976 ms | 12152 ms | 0 MB | 42 | 667 KB | 56 KB |
| legacy-lesson | 4792 ms | 12849 ms | 13033 ms | 0 MB | 74 | 667 KB | 56 KB |

The classic shell eagerly loads fonts, KaTeX, Prism, marked, DOMPurify, MiniSearch, confetti, Firebase and Supabase. v10 loads only the shell and the one live unit on demand.
