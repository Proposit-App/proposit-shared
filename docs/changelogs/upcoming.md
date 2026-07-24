# Changelog — upcoming

- **Add `scripts/first-time-setup.sh`** — the per-repo tier of the workspace
  onboarding scripts, invoked by the orchestration repo's `scripts/setup.sh`.
  Checks Node (against `engines.node`) and pnpm, installs dependencies if
  `node_modules` is absent, runs `pnpm run build` (fixtures codegen + `dist/`,
  the only post-install step this repo has), and prints the cross-repo `tsc -w`
  iteration tip. Idempotent; no published package delta.
- **README: correct the "Consuming this package" paragraph.** It described a
  `file:../proposit-shared` path dependency; server and mobile both consume the
  published npm package with a caret pin. Also replaced the stale "future
  sub-entries" line with the `api-client` / `engine` / `ui` entries that now
  exist.
