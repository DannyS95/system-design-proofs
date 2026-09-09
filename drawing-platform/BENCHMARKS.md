# Benchmarks

Measured on the native SVG implementation with Node 20.17, Vite 6.4.3, and
Vitest 3.2.7. These are development-machine observations, not service-level
guarantees.

| Metric | Result |
| --- | --- |
| Typecheck + production build | 8.16 s wall; Vite build completed in 1.63 s |
| HTML entry | 0.59 kB; 0.36 kB gzip |
| Browser JavaScript | 271.44 kB; 82.86 kB gzip |
| Browser CSS | 40.24 kB; 8.56 kB gzip |
| JavaScript source map | 775.74 kB; development artifact, not runtime transfer |
| Test suite | 15 files, 80 tests; 1.03 s reported duration |
| Editor-specific external runtime assets | None; system icons are local SVG geometry |

The React/TypeScript editor is part of the browser JavaScript bundle and renders
ordinary SVG DOM nodes. It does not download a separate editor engine, font
pack, or whiteboard asset tree. The current main chunk remains below Vite's
500 kB warning threshold.
