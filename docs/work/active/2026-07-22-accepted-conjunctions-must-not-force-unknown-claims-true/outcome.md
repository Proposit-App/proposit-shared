# Outcome

Fixed as proposed. `buildInlineReviewOverlay` now builds the operator
assignment map directly, marking only `implies`/`iff` expressions `accepted`,
instead of fanning a premise-scope `accepted` out through
`canonicalizeOperatorAssignments`.

## Verification

- Failing test written first: `does not manufacture truth for the conjuncts of
  an unreviewed conjunction` failed with `expected true to be null` on
  `claimPropagatedValues.cA` before the fix.
- New fixture `buildEngineWithConjunctiveAntecedent` — `(A ∧ B) → Q`, the shape
  that exposes the defect. The existing two-premise fixture has no conjunction,
  which is why the suite was green through the whole bug.
- Second test pins the behaviour the fix must *not* break: with A and B reacted
  true, Q still propagates true through the accepted implication.
- `pnpm run check` green — 101 files, 982 tests, typecheck + lint + build.
- Verified end-to-end in a real browser against
  `/view/019f19cb-cf9e-74cf-b775-77aec6dcf9cf/4` by patching the installed
  `dist`: `allSupportingPremisesTrue` went `true → null` and the grade chip went
  `Sound → Indeterminate`.

## Notes

No core change. `gradeEvaluation` and `verdictOf` were already correct — they
were being handed a genuinely-true `allSupportingPremisesTrue` manufactured
upstream. This is the second half of the earlier soundness work: that item
stopped `null` from being *read* as true, this one stops `null` from being
*turned into* true.

Related finding, not a defect: on the same page two chips carried a "user"
provenance dot with the review deleted. The `claimReactions` table does hold a
row for that claim (`value: unknown`, `reasonCode: speculation`), so the
overlay's provenance is correct — the reviewer has an *unsure* reaction they
can no longer see or clear, because the server's three-state reaction control
lost its unknown option. Tracked on the server node.
