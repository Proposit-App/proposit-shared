# Spec: debounced review-store save rejects after test env teardown

## Capability changes

None. Library-internal robustness fix with no user-facing surface: no new
capability, no status flip, no taxonomy delta.

## Problem

`ReviewEngine.schedulePersist` (`src/engine/review/review-engine.ts:208-216`)
arms a 200 ms `setTimeout` and discards the resulting promise:

```ts
this.saveTimer = setTimeout(() => {
    this.saveTimer = undefined
    void this.store.save(this.key, { draft: this.draft, lastResult: this.lastResult })
}, 200)
```

`LocalStorageReviewStore.save` (`src/engine/review/review-store.ts:145-159`) is
a rejecting API on three paths, all reachable from that timer:

- `browserGlobals.window === undefined || !ls` →
  `ReviewStorageUnavailableError("SSR")` (`review-store.ts:146-148`)
- quota exhaustion → `ReviewStorageQuotaError` (`review-store.ts:153-155`)
- any other `setItem`/encode throw → re-rejected as `Error`
  (`review-store.ts:156-158`)

`browserGlobals` is `globalThis` (`review-store.ts:28`), so when vitest tears
down the jsdom environment while the 200 ms timer is still armed, the timer
fires against a `globalThis` with no `window`, `save` rejects, and nothing is
attached — an unhandled rejection. Vitest reports it as a run-level error, so
`pnpm run test` exits 1 with every test passing, which is what was observed on
2026-07-24 under concurrent load.

The same race exists outside tests: a real client that navigates away or unmounts
between the last edit and the 200 ms deadline hits the identical path, and the
rejection escapes to `window.onunhandledrejection`.

The other two `store.save` call sites are awaited inside `async` methods
(`review-engine.ts:537` in `runEvaluation`, `review-engine.ts:567` in
`runValidityCheck`), so their rejections propagate to the caller normally. A
repo-wide sweep for the sibling defect class — a promise discarded with `void`
or an un-`.catch`-ed floating call — found `review-engine.ts:212` to be the only
instance in `src/`; the four `void` statements in
`src/schemas/api/pipeline-status/schema.ts:42-64` discard type-assertion
bindings, not promises. `src/engine/review/review-engine.ts:210` is also the only
`setTimeout` in non-test source outside the `sleep` helper
(`src/utils/utils.ts:14`).

## Goals

1. A scheduled persist that rejects never produces an unhandled rejection,
   whatever the rejection reason.
2. A rejection that indicates storage is simply unavailable (SSR, teardown,
   navigation) is discarded quietly — it is expected, not a defect.
3. A rejection that indicates a real persist failure (quota, serialization) is
   still visible to a developer rather than silently swallowed.
4. `pnpm run test` no longer has this failure mode, and a regression test fails
   if the handler is removed.

## Non-goals

- **A public `dispose()`/`destroy()` on `ReviewEngine`.** Goal 1 removes the
  failure mode at the source for every caller; adding disposal API and an
  `afterEach` in the review-engine tests would only fix the test path, and buys
  a new public surface for consumers to get wrong.
- **Reverting the `scripts/first-time-setup.sh` workaround** (it runs
  `pnpm run build` and prints `pnpm run check` as a manual next step, script
  lines 38-44). The fix removes the blocker, but whether onboarding *should*
  spend a full `check` is an independent call and not part of this defect.
- **Changing `LocalStorageReviewStore.save`'s contract.** It stays a rejecting
  API; only the fire-and-forget caller changes. Turning `save` into a
  never-rejecting no-op would hide quota failures from the two awaited call
  sites that currently surface them.
- **Any other flaky-test mitigation in the suite.**

## Design

Attach a rejection handler to the scheduled save inside `schedulePersist`,
discriminating on the error type:

- `ReviewStorageUnavailableError` → swallow. Storage being absent is the normal
  state during SSR, teardown, and navigation; nothing the caller can act on.
- anything else → `console.warn`, matching the existing house pattern in
  `review-store.ts:135` (`console.warn("review-store: dropping corrupted review
  state", err)`).

`ReviewStorageUnavailableError` is exported from `review-store.ts:65` (alongside
`ReviewStorageQuotaError` at `review-store.ts:59`), which the engine already
imports from, so the discrimination needs no new type.

Regression test in `src/engine/review/__tests__/`: a store double whose `save`
rejects, a persist armed through a normal mutation, fake timers advanced past
200 ms, then a drained event-loop turn — assert no `unhandledRejection` fired
and that the quiet/loud split holds for the two error classes.

## Acceptance criteria

1. With a store whose `save` rejects with `ReviewStorageUnavailableError`,
   arming a persist and advancing past the 200 ms deadline produces **no**
   `unhandledRejection` on the process and **no** `console.warn`.
2. With a store whose `save` rejects with a non-unavailable error (e.g.
   `ReviewStorageQuotaError`), the same sequence produces no
   `unhandledRejection` and exactly one `console.warn` naming the failure.
3. Removing the handler from `schedulePersist` makes at least one of those tests
   fail.
4. `runEvaluation` and `runValidityCheck` still reject to their callers when
   `store.save` rejects — the awaited paths are untouched (existing tests stay
   green).
5. `pnpm run check` in `proposit-shared` exits 0.

## Risks

- **Masking a real failure.** Swallowing every rejection would hide quota
  exhaustion, which is why criterion 2 keeps the non-unavailable branch loud.
- **Test detects nothing.** An `unhandledRejection` assertion that never
  observes the event even without the fix is a test that always passes;
  criterion 3 (remove the handler, watch it fail) is the guard against that.
- **Residual timer leak.** Timers can still outlive a test environment; after
  this fix they are harmless (a caught rejection) rather than fatal. If the
  leak later causes a different symptom, the disposal hygiene in the non-goals
  becomes its own item.

## Notes

The 2026-07-24 observation is load-dependent and was not reproduced on demand
(4/4 clean reruns). The regression test therefore reproduces the *mechanism*
(a rejecting save behind the debounce), not the original race, which is the only
part that can be made deterministic.
