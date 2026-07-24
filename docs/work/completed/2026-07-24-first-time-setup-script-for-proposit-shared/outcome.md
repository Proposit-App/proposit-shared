# Outcome

Added `scripts/first-time-setup.sh` (committed `100755`) and corrected two stale
README paragraphs. No product delta, no published-package delta — `scripts/` is
outside `files: ["dist"]`.

## What the script does

1. `cd`s to the repo root relative to its own path, `set -euo pipefail`.
2. Prerequisites: `node` and `pnpm` on `PATH`, plus a Node version check against
   `engines.node` read out of `package.json` (no hardcoded duplicate). A missing
   or too-old tool prints an install instruction and exits 1 — nothing is
   installed non-interactively.
3. `pnpm install` **only** when `node_modules` is absent (the workspace-level
   `initial-setup.sh` normally did it). Not the main job.
4. `pnpm run build` — fixtures codegen + `dist/`. This is the only real
   post-install step this repo has.
5. Prints that nothing is left to do by hand, points at `pnpm run check` for the
   full gate, and prints the cross-repo iteration tip (`tsc -p
   tsconfig.build.json -w` keeps `dist/` current for a consumer resolving this
   package from disk).

## Deliberately left out

- **No env file, service, database, git-hook, or credential step.** Verified:
  the repo has no `.env.example`, no `prepare` script, and no `.githooks/`.
- **No macOS/Linux branch.** Nothing in the body is platform-specific, so there
  is no macOS-only step to skip on Linux.
- **`pnpm run check` is not the body.** It was, and the script ran green with it,
  but the suite has a pre-existing flake: `src/engine/review/__tests__/review-engine.test.ts`
  can emit an unhandled `ReviewStorageUnavailableError("SSR")` when a debounced
  review-store save fires after the jsdom environment is torn down. All 102 files
  / 992 tests still pass, but vitest exits 1, so `check` fails intermittently
  under load. An onboarding script must not fail for reasons unrelated to
  onboarding, so the body is `build` (deterministic, ~4 s) and `check` is printed
  as the next step. The flake is unrelated to this slice and is not fixed here.
- **No shell test file.** The contract's test cases are manual and were run
  directly (below); a bash harness for a 40-line script is ceremony.

## Verification observed

- `bash -n scripts/first-time-setup.sh` — clean.
- Two consecutive runs: `exit=0`, `exit=0`; `git status --porcelain` shows no
  tracked-file changes from the run (the regenerated
  `src/fixtures/historical-figures/content.generated.ts` is byte-identical, so
  the codegen step is genuinely idempotent).
- `env -i PATH=/usr/bin:/bin bash ./scripts/first-time-setup.sh` → prints the
  install instruction, `EXIT=1`.
- Version comparison checked across `22.3.0/22.3.0`, `22.2.9`, `24.1.0`,
  `22.10.0`, `9.9.9` — all correct (numeric, not lexicographic).
- `pnpm run prettify:check` — clean.

## README correction

The stale claim held up. `README.md` said the package was consumed via
`file:../proposit-shared` "from the proposit-server feature branch" until
"Phase 0" completed; both consumers in fact pin `"@proposit/shared": "^0.50.0"`
from public npm (`proposit-server/package.json:70`,
`proposit-mobile/package.json:24`). Rewrote the paragraph around the published
package, the peer dependency, and sub-path-only imports, keeping the
`file:` path-dep as what it actually is now — the local-iteration escape hatch.
Also replaced the adjacent "Future sub-entries: `api-client` (PR 3), `engine`
(PR 4)" line, since both ship today, and added a `First-time setup` section.

## Review triage (`bllm-review-many`, qwen25 + gemma4)

Applied:

- **`engines.node` parsing.** `.replace(/^\D+/, "")` would yield `"22.3.0 <24"`
  for a compound range; switched to `.match(/\d[\d.]*/)[0]`.

Dismissed:

- **"`sort -V` is a GNU-only extension, unavailable on macOS."** Both models
  raised it; it is out of date. macOS `sort` (2.3-Apple) supports `-V` and was
  verified here against the five version pairs listed above, and GNU `sort`
  supports it. Moving the comparison into embedded JS would trade a portability
  non-issue for more code.
- **"`pnpm install` contradicts the contract."** The contract bars it as the
  script's *main job*; here it is a guarded fallback for an absent
  `node_modules`, which otherwise makes `build` fail with a confusing error.
- **"`pnpm run check` failure is unhandled."** False — `set -euo pipefail`
  propagates the non-zero exit. (Moot now: the body is `build`.)
- **"Give more detail than `corepack enable`."** The message already carries the
  exact command to paste.
- **"Missing tests."** See above — manual cases run, no harness added.
