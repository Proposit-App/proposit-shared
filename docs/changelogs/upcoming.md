# Changelog — upcoming

## Fixed

- `ReviewEngine`'s debounced persist no longer produces an unhandled rejection.
  Every mutation that reaches `notify()` arms a 200 ms timer whose callback
  discarded the resulting promise with `void`, while
  `LocalStorageReviewStore.save` is a rejecting API on three paths — no
  `window`/`localStorage` (`ReviewStorageUnavailableError("SSR")`), quota
  exhaustion (`ReviewStorageQuotaError`), and any other `setItem` or encode
  throw. A timer that fired after the browser globals were gone therefore
  rejected with nothing attached. The scheduled save now carries a `.catch`:
  `ReviewStorageUnavailableError` is swallowed — a persist landing after
  navigation, unmount, or a torn-down test environment says nothing a caller
  could act on — and every other reason is reported through
  `console.warn("review-engine: persist failed", err)` rather than silently
  dropped. The two awaited `store.save` call sites in `runEvaluation` and
  `runValidityCheck` are untouched and still reject to their callers.

    The symptom in this repo was an intermittent `pnpm run test` exiting 1 with
    every test passing (`992 passed`, `2 errors`), because vitest tears down the
    jsdom environment while the 200 ms timer is still armed and counts the escaped
    rejection as a run-level error.
