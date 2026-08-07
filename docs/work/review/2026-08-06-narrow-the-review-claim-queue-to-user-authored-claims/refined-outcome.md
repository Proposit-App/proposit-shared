# Refined outcome — Narrow the review claim queue to user-authored claims

**Accepted** by the user on 2026-08-06.

## Evidence

- `pnpm run check` green: 119 test files / **1183 tests**, typecheck, lint,
  build. Re-run in the second session on the merged branch.
- All four of the request's test cases covered.
- Two review fixtures that were structurally invalid — and that no assertion had
  ever looked at — were corrected and now pass `validateEvaluability()`.
- Consumer-side proof, which is where the fix is actually visible: the server's
  `review-wizard` e2e fails against a reverted `buildClaimQueue` with `Step 1 of
  3` and an empty `heading [level=5]` — the reported symptom exactly — and
  passes against this version. Mobile's walk shows 4 steps on an argument with 4
  authored and 11 citation claims.

## Closeout choices

- **Version:** v0.59.1 (patch), tagged. `buildClaimQueue` keeps its signature
  and returns a subset of what it returned before, so nothing here is additive
  or breaking.
- **Published** to NPM as `@proposit/shared@0.59.1`, now `latest`.
- **Merge:** fast-forwarded into `main`; pushed with the user's approval.
- **Capabilities:** `reviews/walk-through-and-decide-each-claim` (`cap-154720`)
  had its wording updated to state which claims the walk covers. No status
  change — `Missing` is this master ledger's baseline (96 of 105 entries), with
  realization tracked in the consumers' overrides, both of which read
  `Supported`.

## Deferred, deliberately

**Rejecting a sourced claim leaves soundness undetermined.** `implies(unknown,
false)` is unknown, so a reviewer who rejects a claim the author cited gets
"Indeterminate" rather than a verdict. Verified not to be a regression this
slice introduced: before the narrowing the only route to a decided verdict there
ran through answering the blank card, and skipping it — what a reviewer actually
did — already produced the same `null`. Pinned by a test that asserts current
behavior so a future fix has a visible place to land, and escalated. Now adopted
at the root as
`2026-08-06-rejecting-a-sourced-claim-leaves-soundness-undetermined`, standalone
rather than as an epic child, because it needs a product decision this slice's
spec put out of scope.
