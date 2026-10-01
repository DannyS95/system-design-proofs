# Repository-wide design guidance

- Read and follow [`DESIGN_STANDARD.md`](./DESIGN_STANDARD.md) before creating or
  revising any board or design artifact in this repository.
- Treat board-specific requirements as specializations of the global standard.
  When they differ, preserve the board's stated learning goal without erasing
  information required for mental reconstruction.
- Preserve unrelated user changes and existing source artifacts.

## Commit format

- Write every commit subject as `#<feature-name>; <change>; <change>`.
- Join the feature-name words with hyphens and place it immediately after `#`.
- After the first semicolon, give a simple semicolon-separated list of every
  material addition or change included in the commit.
- Do not use Conventional Commits prefixes such as `feat:`, `fix:`, or `docs:`.
- Keep the complete list in the commit subject; do not replace it with a prose
  commit body.

Example:

```text
#design-png-export; add PNG generation; reference previews from project READMEs; verify generated artifacts
```
