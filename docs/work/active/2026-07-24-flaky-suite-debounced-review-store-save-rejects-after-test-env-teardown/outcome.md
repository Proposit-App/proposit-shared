# Outcome: handle the debounced review-store save rejection

## What shipped

**Task 1 — failing regression test** (`a60c44e`,
`src/engine/review/__tests__/review-engine.test.ts`)

New `describe("ReviewEngine — debounced persist failures")` block ahead of the
existing suites, plus two helpers: `rejectingStore(err)` (a `TReviewStore`
double whose `save` always rejects and whose unused members throw) and
`persistAgainstRejectingStore(err)`, which registers a local
`process.on("unhandledRejection")` capture, arms the persist through
`setClaimValue`, advances fake timers past 200 ms, then yields a macrotask so
Node has decided what is unhandled.

Run against the unfixed engine, both cases failed with the reported signature —
`[ "ReviewStorageUnavailableError: SSR" ]` and
`[ "ReviewStorageQuotaError: localStorage quota exceeded" ]` against an expected
`[]`. That is spec criterion 3, satisfied by the commit order rather than by a
later revert-and-restore: the test demonstrably observes the defect.

**Task 2 — the fix** (`76b32fa`, `src/engine/review/review-engine.ts:209-225`)

`schedulePersist`'s `void this.store.save(...)` became a `.catch` that returns
early on `ReviewStorageUnavailableError` and `console.warn`s
`"review-engine: persist failed"` for anything else. A value import of
`ReviewStorageUnavailableError` from `./review-store.js` sits alongside the
existing `import type` line rather than replacing it. `verbatimModuleSyntax`
(`tsconfig.json:14`) would also accept an inline-`type` mix on one line; two
lines leaves the existing type-only import untouched and matches how the rest
of the file's imports are split.

**Task 3 — verification** (`bbb177d` for the lint follow-up)

`pnpm run check` initially failed on `@typescript-eslint/no-empty-function` for
the two `mockImplementation(() => {})` spies; changed to
`mockImplementation(vi.fn())`. Re-run clean: typecheck, lint, **116 files /
1139 tests passed**, build.

**Task 4 — Documentation Sync** (`0b6233e`)

`docs/changelogs/upcoming.md` — `## Fixed` entry covering the three rejecting
paths in `save`, the swallow/warn split, and the vitest symptom.
`docs/release-notes/upcoming.md` — one consumer-facing section plus a
`## Repinning` note stating the change is behavioral only. `README.md` did not
fire: `schedulePersist` and `cancelPersist` are private, nothing exported moved.

## Test result

`pnpm run check` exits 0 (typecheck · lint · 1139 tests · build). Spec criteria
1, 2, 4 and 5 are covered by the two new cases and the green suite; criterion 3
by the pre-fix run recorded above.

## What the plan or spec got wrong

- **Plan Task 2 said "split or widen"** the `import type` line. Neither: a
  separate value import was the correct move, for the reason recorded above.
- **Plan Task 3 described a temporary revert** of the handler to prove the test
  is load-bearing. Unnecessary — Task 1 was committed and run before Task 2, so
  the failing run already is that proof. Doing the revert afterwards would have
  demonstrated the same thing twice.
- **Nothing in `spec.md` was contradicted by the code.** The three rejecting
  paths, the two awaited call sites, and the single-instance sweep all held as
  written.

## Notes

The original 2026-07-24 failure was load-dependent and never reproduced on
demand. Nothing here proves that specific race is gone; the argument is by
construction — the escaped rejection had exactly one source, that source now
handles it, and the repo-wide sweep in `spec.md` found no sibling
fire-and-forget promise in `src/`. A green suite is consistent with the fix,
not evidence of it, since the suite was usually green before too.

Timers can still outlive a test environment. After this change they resolve
into a caught rejection instead of a run-level error, so the disposal hygiene
listed as a non-goal stays unbuilt unless a different symptom shows up.
