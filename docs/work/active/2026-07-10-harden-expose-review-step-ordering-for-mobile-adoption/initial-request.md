# Harden + expose review-step ordering for mobile adoption

Slice **S1** of a cross-node epic. `proposit-mobile` is going to adopt this
package's review-step ordering (it currently re-implements it and stubs out
operators). `proposit-server` already consumes it. Your job is to make sure the
existing ordering is correct, regression-guarded, and cleanly importable by
mobile — **not** to build anything new.

## Investigate first (this decides the whole epic's shape)

Determine whether mobile adopting the engine needs **any** code or export change
here, or whether the already-published engine suffices. Report that verdict
before cutting a version.

- The ordering already lives here: `src/engine/review/step-queue.ts`
  (`buildClaimQueue`, `buildOperatorQueue`, `advanceQueue`) and
  `src/engine/review/review-engine.ts` (`ReviewEngine`, `TReviewStep`).
- Both are already reachable at `@proposit/shared/engine/review/review-engine`
  and `.../step-queue` via the existing `./engine/*` export path server already
  imports. **No barrel export to add.**

## Tasks

1. **Regression golden.** Add a test asserting: an argument with a claim
   referenced across multiple premises yields that `claimId` **once** in
   `buildClaimQueue` (dedupe is delegated to core's
   `collectArgumentReferencedClaims` — confirm it holds end-to-end), and a
   null-claimId (derived/wrapper) row is excluded. Fixtures live under
   `src/engine/review/__tests__/`.
2. **Confirm the operator queue** covers a multi-operator, multi-premise argument
   (`buildOperatorQueue`).
3. **RN-safety.** Verify the ordering path (`step-queue` / `review-engine`) has no
   `window` / `localStorage` / DOM access, so React Native can import it. The
   browser-gated code is isolated in `review-store.ts`, which mobile need not
   import — confirm the ordering path doesn't pull it in.

## Publish decision (conditional)

- **If tasks 1–3 need no code/export change** (likely): land the golden as a
  normal internal commit. **Do not cut a version for consumers** — the golden is
  this package's own CI concern; mobile adopts by catching its (drifted)
  `@proposit/shared` pin up to the already-published version that carries the
  engine.
- **If a real code/export change is required:** `pnpm run check`, version bump,
  rotate `docs/release-notes/upcoming.md` + `docs/changelogs/upcoming.md`, tag —
  but **do not `pnpm publish`**. Hand the `pnpm pack` tarball to the orchestrator
  for consumer-side validation across server + mobile before publish.

## Canonical order (fixed — do not change)

Proof order: supporting premises → conclusion → constraints (pre-order DFS),
claims deduped to first appearance. This is what the engine already produces and
what server already shows. Do not reorder it.

## Report back to the epic

Report your investigate-verdict (code change needed? publish needed?) via
`tcw work escalate` so the orchestrator knows whether to run the
publish/validation flow and whether the server slice (S3) is needed at all.

