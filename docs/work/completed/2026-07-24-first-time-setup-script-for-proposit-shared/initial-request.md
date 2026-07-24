
# First-time setup script for proposit-shared

Epic: [New-developer onboarding setup scripts](tcw://W/proposit-app/2026-07-24-new-developer-onboarding-setup-scripts)

## Problem

There is no reproducible path from "new laptop" to "working Proposit workspace."
The orchestration repo now ships two tiers of onboarding script:

1. `proposit-orchestration/scripts/initial-setup.sh` — pasted into a terminal from
   Discord or a web page. Checks prerequisites (git, Node ≥ 22.3, pnpm via
   corepack, GitHub SSH), clones all five repos, runs `pnpm install` in each.
2. `proposit-orchestration/scripts/setup.sh` — asks which repos the developer
   works on, then runs each one's own `scripts/first-time-setup.sh`.

Tier 3 is the per-repo script, and it does not exist here yet. `setup.sh` warns
and reports the repo as incomplete when it is missing.

## Proposed fix

Add `scripts/first-time-setup.sh` to this repo.

### Contract (binding — `setup.sh` depends on it)

- Path is exactly `scripts/first-time-setup.sh`, committed executable (`chmod +x`).
- Runs from the repo root. It is invoked as
  `( cd "$repo" && ./scripts/first-time-setup.sh )`.
- Idempotent — a second run on an already-configured machine succeeds and changes
  nothing.
- Works on macOS and Linux. A macOS-only step must be skipped on Linux with a
  printed explanation, not a failure.
- Exits non-zero on failure.
- Never attempts anything that cannot be installed non-interactively. Print
  instructions instead.
- Does **not** re-run `pnpm install` as its main job — tier 1 already did that.
  Repo-local post-install steps that `pnpm install` does not cover are in scope.
- Prints what it did and what the developer must still do by hand.

### Scope for this repo

proposit-shared is thin: no env file, no services, no database, and — unlike
proposit-core — no `prepare` script and no `.githooks/` directory. Verify the
following rather than trusting it; it was assembled from the README and
AGENTS.md by an orchestrator agent, not from running the code.

- The natural body is a verification pass. `pnpm run build` runs `gen:fixtures`
  first, so a fresh clone needs it before `dist/` exists; `pnpm run check` is the
  fuller gate. Pick what actually proves readiness without being punishingly slow.
- Print the cross-repo iteration tip from AGENTS.md: a consumer pinning
  `file:../proposit-shared` needs a current `dist/`, which means keeping
  `pnpm exec tsc -p tsconfig.build.json -w` running. That is guidance to print,
  not a process the script should start.
- While you are here: the README's "Consuming this package" paragraph is stale.
  It describes a `file:../proposit-shared` path dependency, but proposit-server
  and proposit-mobile both pin `@proposit/shared: "^0.50.0"` from public npm.
  Fix that paragraph as part of this slice.

If a step turns out to be unnecessary, leave it out and say why in the outcome —
a short honest script beats a long ceremonial one.

## Consumer impact

None to the published package. Developer tooling only; no product delta, so no
capability declarations.

## Test cases

- Run on a machine that is already set up → succeeds, changes nothing.
- Run twice in a row → second run is a clean no-op.
- `bash -n scripts/first-time-setup.sh` is clean.
- Exits non-zero when a required tool is missing.

## Adoption note

Do **not** use `tcw work inbox accept` — it double-dates the slug and drops the
`initiative` link on delegated cross-node slices. Instead:
`tcw work new "<title>" --initiative 2026-07-24-new-developer-onboarding-setup-scripts`,
write `initial-request.md` from this document, then `git rm` this inbox file.
