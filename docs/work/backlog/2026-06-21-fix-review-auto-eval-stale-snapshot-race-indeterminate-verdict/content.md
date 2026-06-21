# Fix review auto-eval stale-snapshot race (Indeterminate verdict)

## Product changes

## Technical changes

## Meta changes

# Change request: review auto-evaluation reads a stale snapshot → `Indeterminate`

**From:** `proposit-server`
**Date:** 2026-06-21
**Impact area:** `@proposit/shared/engine` (review auto-evaluation / engine sync service)
**Target version:** TBD (behavioral fix; no public API change expected)
**Tracking work item:** `proposit-server/docs/work/active/2026-06-21-atv-crud-restoration-follow-ups/` (item 2)

## Problem

The review wizard's results step runs auto-evaluation in a mount `useEffect`,
reading the same engine snapshot the user just wrote via `setClaimValue` /
`setOperatorAssignment`. There is a commit lag between the write and the read
(a debounce / microtask / sync-service queue), so the evaluator occasionally
reads a **stale** snapshot — the operator-decision row hasn't landed yet — and
lands on **Indeterminate** instead of the verdict the user's inputs drive.

## Root cause

The operator decision flows through `engine.setOperatorAssignment`, which
commits via a sync service with a small delay. The results-step auto-evaluation
fires unconditionally on mount and does not wait for that commit. The window
widened on the shared `0.8.0`-era stack (the auto-evaluation path now goes
through a heavier snapshot reconciliation), so the sync-service commit can lag
further behind the user action that triggered the step advance.

## Consumer impact / current workaround

`proposit-server` masks this in e2e with a fixed `await page.waitForTimeout(1500)`
in `e2e/helpers/wizard.ts` (`driveTrueTrueAcceptKeyboard`), bumped up from 300ms
specifically because of the heavier reconciliation. This is a flake-masking
band-aid, not a fix — real users on slow devices can still see a transient or
sticky `Indeterminate` verdict. The workaround stays in place until this ships.

## Proposed fix (source-side)

Make the results step observe a consistent snapshot before evaluating. Either:

1. **`advanceStep()` awaits its own pending writes** — the step transition does
   not resolve until the sync service has committed the writes made on the
   step being left, so the results mount reads a settled snapshot; or
2. **Gate results-mount auto-evaluation on a "snapshot consistent" signal** from
   the engine (e.g. a `pendingWrites === 0` / generation-counter check) instead
   of running unconditionally on mount.

Option 1 is preferable — it fixes the ordering at the source rather than making
every reader defensive.

## Repro

```
cd proposit-server
pnpm exec playwright test e2e/tests/review-wizard.spec.ts:687 --repeat-each 5
```

(after temporarily removing the `waitForTimeout(1500)` in `e2e/helpers/wizard.ts`).
The verdict intermittently reads `Indeterminate` instead of the driven verdict.

## Acceptance

- With the `waitForTimeout` workaround removed, `review-wizard.spec.ts` passes
  reliably under `--repeat-each 5`.
- No public API surface change (or, if a signal is exposed, it is additive).

