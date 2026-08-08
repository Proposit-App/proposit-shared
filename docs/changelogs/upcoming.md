# Changelog — upcoming

<changes starting-hash="7f3a1a2" ending-hash="HEAD">

## Fixed

- **A claim's review chip read `Unknown` while the review header for the same
  argument read `True`.** `buildInlineReviewOverlay` keyed a claim's displayed
  value off the first variable it found bound to that claim — a rule its own
  comment stated, written to match core's `getVariableIdForClaim`. A persisted
  claim binds more than one variable (an authored one plus the
  engine-synthesized derivation one) and `getVariables()` returns them ordered
  by id, so which one won had nothing to do with which one carried the value.

    The conclusion was the claim that failed, because every other claim in a
    finished review has been assigned by the reader — which writes the same value
    onto both of its variables and makes the display right by accident.

    All variables bound to one claim denote the same proposition, so the claim's
    value now resolves across the claim's full set of bound variables. One
    `resolveClaimValue` helper serves both read sites: the propagated value on the
    chip, and the usage-based default behind a claim the reader has not touched —
    the second had the same latent defect.

- Two of a claim's variables can carry **opposite** settled values in one
  evaluation (modus ponens onto one, modus tollens onto the other), which means
  the argument asserts one proposition both ways. That is not tie-broken: the
  claim resolves to unknown and its id is reported on the new optional
  `TReviewOverlay.conflictedClaimIds`, so a client can show the inconsistency
  rather than silently render whichever side an ordering favoured.

- Regression tests in `src/engine/review/__tests__/inline-overlay.test.ts` over
  two new fixtures — `buildEngineWithConclusionBoundToTwoVariables` (the
  reported shape: the value lands on the later-ordered variable) and
  `buildEngineWithContradictorilyBoundClaim` (the disagreement case).

Not a regression from the review-verdicts or explainer work: the first-wins rule
is `adc7e2f` (2026-07-21, shipped in v0.46.0) and
`git log v0.60.2..HEAD -- src/engine/review/overlay.ts` was empty before this
change.

Core's `getVariableIdForClaim` carries the same singular-by-construction
contract. No consumer calls it, so nothing is broken through it today; raised
with core rather than changed here.

## Changed

- Added `docs/work/discarded/`, which `tcw` 0.18.2 requires of a work store —
  without it the CLI reported this repo as having no work node at all.

</changes>
