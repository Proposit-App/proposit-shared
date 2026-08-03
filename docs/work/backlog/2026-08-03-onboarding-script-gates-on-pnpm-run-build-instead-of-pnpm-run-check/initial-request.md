# Onboarding script gates on `pnpm run build` instead of `pnpm run check`

## Problem

`scripts/first-time-setup.sh` runs `pnpm run build` as its last step and prints
`pnpm run check` as a manual next step for the new developer
(`scripts/first-time-setup.sh:38-44`). That is a workaround, not a design
choice: `pnpm run check` was intermittently exiting 1 with every test passing,
and an onboarding script must not fail for a reason unrelated to onboarding.

The blocker is gone. The flake was an unhandled rejection escaping
`ReviewEngine`'s debounced persist, fixed in `76b32fa` under
`2026-07-24-flaky-suite-debounced-review-store-save-rejects-after-test-env-teardown`.

## The question this item has to answer

Whether onboarding *should* gate on `check` now that it can. `check` is
typecheck + lint + 1139 tests + build — noticeably more than `build` alone, and
onboarding is where a slow gate is felt most. The counter-argument is that a new
developer who never runs `check` finds out their environment is wrong later, in
a worse place.

Both answers are defensible. Pick one deliberately rather than leaving the
script describing a constraint that no longer exists.

## Proposed fix (sketch)

If yes: replace the `pnpm run build` step with `pnpm run check` (which runs
`build` as its last stage anyway, so nothing is lost) and drop the "run
`pnpm run check` for the full gate" line from the closing message.

If no: leave the behavior alone, but rewrite the closing message so it reads as
a deliberate choice about onboarding time rather than as a workaround for a
flake that no longer exists.

## Test cases

- `bash scripts/first-time-setup.sh` on a clean checkout exits 0.
- The closing message contains no instruction duplicating a step the script
  already ran.

## Notes

Deferred out of the flaky-suite item at its acceptance on 2026-08-03: the fix
removed the blocker, but this is an independent call about onboarding rather
than part of that defect.
