# Plan: handle the debounced review-store save rejection

Small item — four tasks, one code file, one test file, two doc files. No stage
document manifest.

## Task 1 — Failing regression test

**Changes:** `src/engine/review/__tests__/review-engine.test.ts` (new
`describe` block; the file already has the jsdom pragma and the `MemoryStorage`
shim at lines 1-35, so no new test file is warranted).

Shape:

- A minimal `TReviewStore` double whose `save` returns
  `Promise.reject(...)`, parameterized by the error to reject with; `load`
  resolves `undefined` and the remaining members throw if touched.
- Register a local `process.on("unhandledRejection", …)` capture for the test
  and remove it in a `finally`.
- `vi.useFakeTimers()`, build an engine over `buildEngineWithTwoPremises()`,
  `start()`, then a mutation that reaches `notify()` (`setClaimValue`) to arm
  the persist; `vi.advanceTimersByTime(200)`; restore real timers and yield one
  macrotask (`await new Promise((r) => setImmediate(r))`) so Node's
  unhandled-rejection detection has run.
- Two cases: `ReviewStorageUnavailableError` — capture empty, `console.warn`
  spy not called; `ReviewStorageQuotaError` — capture empty, `console.warn`
  called once.

**Verified by:** `pnpm exec vitest run src/engine/review/__tests__/review-engine.test.ts`
fails on both new cases before Task 2. Ordering matters here: written before the
fix, the test proves it can observe the defect (spec risk 2), which a test
written after the fix cannot.

## Task 2 — Attach the handler in `schedulePersist`

**Changes:** `src/engine/review/review-engine.ts` — replace the `void` at line
212 with a `.catch` that swallows `ReviewStorageUnavailableError` and
`console.warn`s anything else. Adds a value import of
`ReviewStorageUnavailableError` from `./review-store.js` (currently a
`import type` at line 15 — split it or widen it, whichever keeps lint quiet).

**Verified by:** the Task 1 cases go green; the rest of
`review-engine.test.ts` and `review-store.test.ts` stay green.

## Task 3 — Confirm the test is load-bearing, then full check

**Changes:** none committed.

**Verified by:** temporarily revert Task 2's handler, confirm at least one Task 1
case fails (spec criterion 3), restore. Then `pnpm run check` exits 0 (spec
criterion 5).

## Task 4 — Documentation Sync

`proposit-shared/AGENTS.md` has **no** `## Documentation Sync` section, so no
entry list governs this. Evaluated against the repo's actual convention (a
`docs/changelogs/` + `docs/release-notes/` pair per version, both with an
`upcoming.md` working file, both currently empty):

- `docs/changelogs/upcoming.md` — **fires.** Behavior-affecting fix. Add a
  `## Fixed` entry: what the timer did, why the rejection escaped, what is now
  swallowed vs. warned.
- `docs/release-notes/upcoming.md` — **fires.** Consumer-visible: a client that
  navigates away mid-debounce no longer trips
  `window.onunhandledrejection`. One short section, no code sample.
- `README.md` — does not fire. No public surface changes; `schedulePersist` and
  `cancelPersist` are private.

**Verified by:** both files read as entries a consumer could act on, and neither
mentions a work-item slug, stage, or `docs/work/**` path.

## Verification

Beyond the suite:

- The original defect is **load-dependent and was not reproduced on demand**
  (4/4 clean reruns on 2026-07-24). Nothing here proves the original race is
  gone; the argument is by construction — the only unhandled path is the one
  Task 2 closes, and the repo-wide sweep in `spec.md` found no sibling. State
  this plainly in `outcome.md` rather than claiming a flake was "fixed and
  verified".
- No consumer-side check needed. Nothing exported changes, so
  `proposit-server` / `proposit-mobile` need no validation pass before publish.

## Notes

The missing `## Documentation Sync` section in `AGENTS.md` is a gap worth its own
item — every version in `docs/changelogs/` was written by convention alone.
Out of scope here.
