# Changelog — upcoming

## Added

- `LARGE_ORIGIN_DOCUMENT_CODE_POINTS` (1500) and
  `isLargeOriginDocument(text)` are exported from
  `@proposit/shared/engine/render` (`src/engine/render/origin-size.ts`) — the
  single rule deciding whether a source text reads embedded in an argument or
  needs a reading surface of its own. The unit is **code points**, counted with
  `codePointLength`: a whitespace word count scores an unspaced script (Chinese,
  Japanese) at ~1 word regardless of length, and `String.prototype.length`
  over-counts every astral character. The value is ~300 words of English rounded
  — the curated corpus in `src/fixtures/historical-figures/` measures 5.3–6.0
  chars/word, and its four documents run 15,561–97,032 characters, so all four
  sit an order of magnitude past the line. Supersedes the mobile app's local
  `CLAMP_THRESHOLD = 600`; the web app had no threshold at all. No new `exports`
  subpath — `./engine/render` already existed.
- `buildOriginRuns(snapshot)`, `anchorsForTarget(snapshot, targetId)`, and the
  `TOriginRun` type are exported from `@proposit/shared/engine/render`
  (`src/engine/render/origin-runs.ts`). Both are pure functions over
  `TProjectReactiveSnapshot`'s `origin` slice, carried over from the web app's
  route-local view model unchanged, including the invariants that are easy to
  lose in a move: anchors sharing a span collapse into one run and overlapping
  spans **merge rather than nest** (a claim used in two premises is anchored at
  both of its expressions, so overlap is the common case, and adjacent touching
  spans stay separate); every slice goes through `sliceByCodePoints`; and an
  anchor whose span leaves the document is dropped by the **same** predicate on
  both functions, so a cue can never be produced for a highlight no run can
  match. The web app kept the only copy, which left the mobile app unable to
  highlight or sequence traced passages without duplicating the code-point
  arithmetic into a second repo.

## Changed

- `arguments/see-the-original-source-text` in the capability master now
  describes the size-aware split — a short source text reads in place, a long one
  opens in a reading surface of its own — rather than "alongside the argument
  itself", which described only the embedded sidebar. Status untouched.
- Two capabilities added to the master, seeded `Missing` under
  `Feature=argument-browse`: `arguments/step-through-traced-passages` and
  `arguments/find-text-in-the-source-text`.

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
