# Flaky suite: debounced review-store save rejects after test env teardown

## Problem

`pnpm run test` (and therefore `pnpm run check`) intermittently exits 1 while
every test passes. Observed signature:

```
 Test Files  102 passed (102)
      Tests  992 passed (992)
     Errors  2 errors
 ELIFECYCLE  Test failed. See above for more details.
```

The two errors are unhandled rejections:

```
⎯⎯⎯⎯ Unhandled Rejection ⎯⎯⎯⎯⎯
ReviewStorageUnavailableError: SSR
 ❯ LocalStorageReviewStore.save src/engine/review/review-store.ts:149:35
 ❯ Timeout._onTimeout src/engine/review/review-engine.ts:212:29
 ❯ listOnTimeout node:internal/timers:605:17
 ❯ processTimers node:internal/timers:541:7

This error originated in "src/engine/review/__tests__/review-engine.test.ts"
```

## Observed reproduction

- Hit once on 2026-07-24 during unrelated work, on a machine under concurrent
  load (that run reported `transform 9.47s` against the usual ~3s).
- Immediately re-ran `pnpm run test` four times back to back: 4/4 exit 0.

Load- and timing-dependent, not deterministic. Rerunning hides it.

## Root cause (read, not yet confirmed by a fix)

`ReviewEngine.schedulePersist` (`src/engine/review/review-engine.ts:208-216`)
arms a 200 ms `setTimeout` whose callback does:

```ts
void this.store.save(this.key, { draft: this.draft, lastResult: this.lastResult })
```

Two things combine:

1. The promise is discarded with `void` — nothing is attached, so any rejection
   is unhandled by construction.
2. `LocalStorageReviewStore.save` (`src/engine/review/review-store.ts:146-149`)
   rejects with `ReviewStorageUnavailableError("SSR")` whenever
   `browserGlobals.window === undefined`.

When a test finishes and vitest tears down the jsdom environment before the
200 ms timer fires, the timer still runs, `window` is gone, `save` rejects, and
no handler exists. Under load the teardown/timer race flips the losing way often
enough to fail the run.

## Why it matters

A suite that fails with every test passing burns an afternoon for whoever hits
it first — the output points at a review-store error, not at a timer race. It
also has a concrete downstream cost: `scripts/first-time-setup.sh` (the
new-developer onboarding script) cannot use `pnpm run check` as its gate,
because an onboarding script must not fail for reasons unrelated to onboarding.
It runs `pnpm run build` and prints `check` as a manual next step instead; that
workaround can be reverted once this is fixed.

## Proposed fix (sketch — verify before implementing)

1. Handle the rejection at the source: attach a `.catch` to the scheduled save in
   `schedulePersist`, so a persist landing after the window is gone is swallowed
   (or logged) instead of escaping. This is also correct outside tests — the same
   race exists in a real client during teardown or navigation.
2. Test hygiene: dispose the engine in an `afterEach` (there is already a
   `cancelPersist`) so no timer outlives the environment.

(1) alone removes the failure mode everywhere and improves runtime behavior;
(2) alone only fixes the tests. Prefer (1), treat (2) as hygiene.

## Test cases

- A reproduction that arms a persist and removes the browser globals before the
  200 ms timer fires produces no unhandled rejection.
- `pnpm run test` stays green, including under an artificially loaded or
  serialized run.

## Notes

Its own defect — deliberately **not** linked to the new-developer onboarding
initiative; that slice only surfaced it.
