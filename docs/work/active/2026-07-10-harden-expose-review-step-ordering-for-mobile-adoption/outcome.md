# Outcome

## Verdict

**No shared code or export change is required for mobile to adopt the
review-step ordering. No publish is needed.** The already-published engine
suffices as-is.

- **Import path resolves for external consumers.** `package.json` `exports`
  declares `./engine/*` → `{ types, import, default }` pointing at
  `./dist/engine/*.{d.ts,js}`, so `@proposit/shared/engine/review/review-engine`
  and `@proposit/shared/engine/review/step-queue` both resolve (same path
  server already imports). No barrel export to add.
- **The ordering path is React-Native-safe.** No `window` / `localStorage` /
  `document` / DOM access anywhere reachable from `step-queue.ts` or
  `review-engine.ts`. The only match for "window" in the whole ordering path is
  a docstring. Runtime globals used are RN-safe: `globalThis.crypto.randomUUID`,
  `setTimeout`/`clearTimeout`, `Date`, `console`. The browser-gated
  `LocalStorageReviewStore` lives in `review-store.ts`; `review-engine.ts`
  imports `TReviewStore`/`TReviewKey` from it as **type-only**
  (`import type …`), which is erased at compile — so there is no runtime import
  of the browser-gated code. Mobile supplies its own `TReviewStore` (e.g. the
  already-exported `InMemoryReviewStore`, or an AsyncStorage-backed one).

## Behaviors: already held, not fixed

Both target behaviors already held end-to-end; the change is a regression
golden only.

- **Cross-premise dedupe** — delegated to core's
  `collectArgumentReferencedClaims`. A claim referenced by variables in two
  different premises is folded to a single first-appearance entry. New fixture
  `buildEngineWithClaimSharedAcrossPremises` binds `cShared` in both the
  supporting and conclusion premises; `buildClaimQueue` yields
  `["cShared", "cOther", "cConcl"]` — `cShared` once.
- **Null-claimId exclusion** — the existing `buildEngineWithTwoPremises`
  fixture already carries engine-synthesized premise-bound
  (derivation-consequent) variables with no `claimId` (probed: `P0`, `P1`).
  `buildClaimQueue` already excludes them; the golden now asserts it.

## Operator queue coverage

`buildOperatorQueue` multi-operator/multi-premise coverage was already present:
`step-queue.test.ts` asserts the queue returns both `pSupport` and
`pConclusion` (a two-premise, two-operator argument). No new coverage needed.

## Changes

- `src/engine/review/__tests__/fixtures.ts` — added
  `buildEngineWithClaimSharedAcrossPremises`.
- `src/engine/review/__tests__/step-queue.test.ts` — added two golden tests
  (cross-premise dedupe; null-claimId exclusion).

## Verification

`pnpm run check` green: typecheck, lint (prettier + eslint), 679 tests, build.

## Publish

No version cut — test-only change, this package's own CI concern. Mobile adopts
by catching its drifted `@proposit/shared` pin up to the already-published
version that carries the engine (currently 0.37.1).
