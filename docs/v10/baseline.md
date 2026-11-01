# Baseline — classic Polycodex

Captured 2026-11-01T06:53:05.486Z with Slow 4G + 4× CPU.

| Scenario | LCP | DCL | Load | Heap | Long tasks | JS gzip | CSS gzip |
|---|---:|---:|---:|---:|---:|---:|---:|
| legacy-home | 9644 ms | 9237 ms | 9681 ms | 0 MB | 13 | 667 KB | 56 KB |
| legacy-lesson | 4032 ms | 8650 ms | 8745 ms | 0 MB | 20 | 667 KB | 56 KB |

The classic shell eagerly loads fonts, KaTeX, Prism, marked, DOMPurify, MiniSearch, confetti, Firebase and Supabase. v10 loads only the shell and the one live unit on demand.
