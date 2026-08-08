# Changelog — upcoming

<changes starting-hash="5d04b71" ending-hash="HEAD">

Second review pass over the contested-value branch. Two defects, one moderate,
two documentation corrections.

## Fixed

- **Rejecting the conclusion premise was offered, recorded, ignored — and
  unblocked the review.** Core exempts the conclusion premise from striking, so
  a rejection against it changes nothing, yet `buildOperatorQueue` queued it for
  a verdict and `buildExits` offered `reject-premise` as the _first_ exit out of
  a contradiction, under copy promising it "takes the premise out of the
  reckoning". Measured on `buildEngineWithTwoPremises` with
  `{ cA: true, cB: false }`, taking that exit moved coherence from
  `reader-resolvable` (blocking) to `coherent` (not blocking) and
  `contestedVariableIds` from `["vA","vB"]` to `[]` — by dropping the premise out
  of `detectContradictions`' accepted-set filter, not by resolving anything.
  `struckPremiseIds` stayed empty throughout, so `buildStruckBadges` showed no
  badge and `reasonFor`'s struck branch could not fire, landing the argument
  line on `not-enough-settled` ("Every step the argument needs is still standing
  and you have ruled nothing out") for a reader who had settled every claim and
  rejected a step.

    **Contract change both clients absorb:** `TOperatorQueueEntry` gains
    `rejectable`, `false` for the conclusion premise, and the operator step for
    it must stop offering Reject. Accepting is untouched — it grants the
    inference for propagation and is meaningful. `buildExits` produces no
    `reject-premise` for that premise; the `change-assignment` exits it already
    produced are the honest resolutions. `dropStaleAssignments` prunes a
    rejection an older build recorded against it, so a persisted draft cannot
    keep the collision out of the accepted set.

    `contradiction.test.ts` asserted the reject exit was present on the
    conclusion premise; that assertion is inverted, with a companion test that
    premises core _does_ strike still offer it.

- **`contestedVariableIds` was missing from the persisted mirror.** TypeBox
  strips undeclared properties on `Encode`, so the field was dropped between
  save and load, and `reviewCoherence`'s `?? []` then produced
  `blocksCompletion: false` from a rehydrated result — for exactly the
  contested-only case the field exists to catch, where every aggregate reads
  clean and nothing else can reconstruct the block. Declared now, with a
  round-trip test over **the whole result mirror**, field by field through
  `Encode` → `JSON` → `Decode`, so the next addition cannot go missing silently.

- **A coherence finding outlived the draft it described.** `resultsPhase()`
  consulted `lastCoherence` without checking it still applied: evaluate clean →
  `done`, edit a claim, step forward, and the stale finding authorized `done`
  again with `isReviewComplete` true. `done` now requires a finding whose
  `evaluatedFingerprint` matches the current draft; a diverged fingerprint is
  treated the same as no finding at all, which is what it is. The comment there
  claimed the gate held because `runEvaluation` re-checks after every change —
  that overstated it, since nothing forced the order, and it has been rewritten
  to state what the function itself guarantees.

## Changed

- `TWorkedExample.items` documents that an example may contain **no operator
  item**, which one entry now does — a client pairing `items[i]`/`items[i + 1]`
  or drawing connectors between adjacent claims breaks on it. `TExampleItem`'s
  own comment no longer says an operator sits "between claims". Pinned by a test
  that the operator-free example is well-formed.

- `assertedByReader` is documented, and its explainer copy reworded, to say what
  core actually sets it from: the reader supplied a value for at least one claim
  the conclusion premise _references_, not for the conclusion itself. The two
  coincide only where the conclusion is a bare variable. `"This value is yours"`
  overstated that and is now `"Your own answers are part of what produced this"`.

</changes>
