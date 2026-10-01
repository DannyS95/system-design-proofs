# Repository rules

- Read `../DESIGN_STANDARD.md`, `README.md`, `SPEC.md`, `DESIGN.md`, `TASKS.md`,
  and this file before a phase.
- Implement one named mechanism at a time and keep contracts versioned.
- Preserve the local-first persistence invariant.
- Keep domain contracts free of React, browser, Fastify, and filesystem imports.
- Treat the repo-owned React/TypeScript SVG editor as a browser module over the
  versioned `BoardScene` contract; it is not a server or persistence layer.
- Validate board identifiers before deriving filesystem paths.
- Never silently resolve revision conflicts with last-write-wins.
- Do not introduce authentication, collaboration, vendor icon packs, databases,
  queues, caches, or orchestration before their task exists.
- Every phase includes tests and updates `CHANGELOG.md` and `CONTEXT.md`.
- Existing architecture folders belong to the user; avoid unrelated cleanup.
- Follow the repository commit format in `../AGENTS.md` exactly.
