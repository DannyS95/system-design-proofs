# Benchmarks

Measured on the phase-one implementation. These are development-machine
observations, not service-level guarantees.

| Metric | Environment | Result |
| --- | --- | --- |
| Production build | Node 20.17, Vite 6.4.3 | 21.52 s wall, 41 MiB `dist/` |
| JavaScript output | Minified, source maps included separately | 7,767,674 bytes; 1,340.42 kB main entry (435.78 kB gzip) |
| Editor runtime assets | Self-hosted Excalidraw fonts/assets | 14 MiB |
| Test suite | Vitest 3.2.7, 27 tests | 0.76 s wall; 439 ms reported duration |
| API health | Loopback, warm process | 2.39 ms observed |
| API board list | Loopback, warm process | 0.65 ms observed |

The build warns about chunks above 500 kB. That weight is primarily the editor
engine and its lazy diagram/export integrations; code splitting is a later
optimization, not a correctness claim for this scaffold.
