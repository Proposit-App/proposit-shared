# Changelog — upcoming

<changes starting-hash="8b65872" ending-hash="HEAD">

## Fixed

- **`buildClaimQueue` now returns only user-authored claims**
  (`src/engine/review/step-queue.ts`). It returned
  `collectArgumentReferencedClaims(...).claimIds` verbatim — every claim bound to
  any variable in the argument. That set includes the two claim types a reviewer
  cannot judge: a claim carrying at least one citation mints a derivation premise
  shaped `implies(citation_var, Q)`, so the **citation** claim is claim-bound and
  was queued as its own step, and **axiomatic** claims are claim-bound the same
  way. Both are titleless by schema (`CitationClaimSchema` and
  `AxiomaticClaimSchema` declare `title: Null` / `body: Null`; identity lives in
  `citation` / `axiom`), so any consumer rendering a queued claim's title
  rendered an empty card.

    The queue now keeps only claims whose bound claim resolves to
    `type === "normal"`, looked up through the engine's claim library via the
    `claimVersion` the collector reports in `byId`. `@proposit/proposit-core` is
    untouched: `collectArgumentReferencedClaims` is a general-purpose collector
    and its contract is correct as written — the review-specific narrowing
    belongs here.

    This is the claim-side counterpart of the gate `buildOperatorQueue` already
    applies to premises, documented on the function the same way, including the
    consequence for callers: **queue length is not the argument's claim count**
    and must not be labelled as one. Every source and every axiom the argument
    cites is missing from it.

    Axioms were additionally being asked a question whose answer was thrown
    away — `buildExpressionAssignment` already omits axiom-bound variables from
    the assignment map because `ArgumentEngine.evaluate()` throws
    `AXIOM_VARIABLE_ASSIGNMENT_FORBIDDEN` on any caller-supplied key for one, and
    the engine forces them `true` internally.

- **Two review test fixtures were structurally invalid**
  (`src/engine/review/__tests__/fixtures.ts`).
  `buildEngineWithCitationBackedDerivationPremise` minted a fresh claim-bound
  consequent variable for `cA` while `cA` already had one (`vA`, in `pSupport`).
  `mutateCreateDerivationPremise`'s mint path removes the auto-allocated
  consequent — and `ensureClaimBoundVariable` had returned the *existing* `vA`
  for it — so `vA` was deleted and its `pSupport` child expression cascaded away,
  leaving that premise's IMPLIES root with one child. `validateEvaluability()`
  reported `EXPR_CHILD_COUNT_INVALID`, but no assertion looked at it.

    Both fixtures now adopt the existing variable
    (`existingConsequentVariableId`), which is the shape production uses when the
    canonical claim-bound variable already lives in the argument, and both pass
    `validateEvaluability()`.

## Changed

- **`buildEngineWithCitationBackedDerivationPremise` covers both
  derivation-only claim types.** `cSource` is now an actual `TCitationClaim`
  (it was a normal claim standing in for one, which could not exercise a
  type-based gate), and the fixture gains `cAxiom` plus a second derivation
  premise wired by `populateDerivationFromAxiom`. New fixture
  `buildEngineWithConclusionThroughCitedClaim` builds the shape where the only
  path to the conclusion runs through a cited claim.

- **Capability wording** — `reviews/walk-through-and-decide-each-claim`
  (`cap-154720`) states which claims the walk covers: the ones the author wrote,
  with sources and axioms not put to the reviewer, and the step count therefore
  not the argument's total claim count. No status change.

## Notes

- **Dropping the citation step does not stall evaluation on the accept path.**
  The concern was that an unqueued source leaves its variable unassigned while
  the `implies(citation_var, Q)` derivation premise stays in the evaluation
  context (`toEvaluationContext` filters only naked-Q derivation premises).
  `implies(unknown, true)` is true, so a derivation premise holds on the strength
  of the derived claim alone. Verified on the conclusion-through-a-citation
  shape, not just on an argument where the citation sits off the conclusion's
  path.

    One combination does not settle: rejecting a sourced claim while the
    conclusion holds gives `implies(unknown, false)` → unknown →
    `allSupportingPremisesTrue === null`. Pinned by test. Whether rejecting a
    sourced claim ought to render an argument unsound rather than undetermined is
    a question about evaluation semantics, not about which claims are queued, and
    is tracked separately.

</changes>
