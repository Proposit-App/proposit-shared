# Changelog — upcoming

<changes starting-hash="fe89f84" ending-hash="HEAD">

## Changed

- **Repinned `@proposit/proposit-core` to the 4.0.0 build carrying the
  four-valued closure.** Core's constraint closure was nondeterministic when two
  accepted steps drove one variable to opposite values — visitation order picked
  a winner. It is now confluent, and the conflict has a value of its own:
  `CONTESTED`. Restricted to `{true, false, unknown}` every operator table is
  unchanged, so nothing about an argument without a conflict moves.

- **`TConclusionValue` gains `"contested"`**, with
  `CONCLUSION_VALUE_LABELS.contested = "Contested"`. The literal matches core's
  wire value so the value never carries two names between the engine and the
  screen.

    `conclusionValueOf` previously ran `=== true` / `=== false` and fell through
    to `"unknown"`. That fall-through is the defect the fourth value exists to
    prevent: a value the reader settled twice would have been reported as one
    nobody settled. It is now `conclusionValueFor`, exported, contested-first,
    and the single place any four-valued value is turned into a reported one —
    `contradiction.valueLabel` and `describeCounterexample` both route through
    it rather than carrying their own ladders.

- **A tenth `CONCLUSION_EXPLAINERS` entry.** Definition, worked example in
  Proposit's notation (a reader asserts a claim, then grants a step concluding
  against it), and further reading into the actual formalism — four-valued
  logic, paraconsistent logic, the bilattice. The definition lands the
  distinction the change exists for (unknown is nobody settling it; contested is
  settling it twice) and states that it is the reader's to resolve, since both
  halves are theirs. `TExampleValue` gains `"contested"` so an example can draw
  it.

- **One concept, one value: `TReviewOverlay.conflictedClaimIds` is deleted.**
  This package had independently reached the same product concept in
  `resolveClaimValue` — a claim whose bound variables disagree holds one
  proposition both true and false — and resolved it the way the closure defect
  did: to unknown, with the fact moved onto a side channel. It now resolves to
  `CONTESTED`, on `claimPropagatedValues`, which is where a client reads a
  claim's displayed value anyway. The removed array is a one-line filter over
  that map, and keeping it would have meant shipping two ways to say the same
  thing.

    A claim's _assignment_ pill stays three-valued (`TAssignmentPill`
    unchanged): contested is a resolved value, never something a reader writes.
    Where a claim's usage-based defaults disagree, the evaluation input falls to
    unknown — the four-valued value is held separately and reaches the displayed
    value, so the finding is not lost on the way.

- **`detectContradictions` treats a contested premise root as a collision.** The
  check was `rootValue !== false`. With a confluent closure the colliding chain
  comes out `contested` rather than `false`, so the strict test would have
  silently stopped blocking reviews it used to block. "Evaluates false" now means
  _carries a false component_, which is what the four-valued reading of that
  predicate is. A consequence of confluence: the collision is reported against
  every accepted step it runs through rather than against whichever one an
  ordering reached first, and either is a way out of it.

- **Contradiction prose covers a contested value.** `provenanceSentences` skipped
  anything not `origin: "derived"`, so a contested value produced no sentence at
  all; it now names the granted steps from `contestedBy` and, when the reader
  supplied one of the two halves, says so. `assertedSources` walks `contestedBy`
  (a contested value has no `derivedBy`) and re-adds the reader's own variable,
  so the "change your answer" exits still point at something changeable. Whether
  the reader supplied a value is read from `claimAttribution`, not from
  `assignment.variables` — the assignment on a result is the _resolved_ one, in
  which a contested value reads back as `contested` and the fact is gone.

- **The evaluation-result mirror in `schemas/review.ts` admits the fourth
  value.** New `QuadrivalentValueSchema` and `TCoreResolvedAssignmentSchema`;
  `ValueOriginSchema` gains `"contested"`; `VariableProvenanceSchema` gains
  `contestedBy`. Without this a stored review containing a contested value fails
  `Value.Decode(ReviewStateSchema, …)`, and `LocalStorageReviewStore.load`
  treats a decode failure as corruption and drops the whole review.
  `TCoreExpressionAssignmentSchema` stays three-valued and is still what a
  reader's assignment is checked against.

- `computePropagatedVariableValues` and `TReviewOverlay.propagatedValues` widen
  to `TCoreResolvedVariableValues`.

## Unchanged, deliberately

- **The argument axis.** A contested conclusion is not `premises-contradict`:
  that outcome rests on `premiseSetSatisfiable`, which is asked of the surviving
  premise set alone and ignores the reader's assignment. A collision between a
  reader's inputs and the steps they granted can arise over a perfectly
  consistent premise set, so reporting it there would be false. It belongs to
  the conclusion axis, and the two axes are allowed to disagree. Recorded as a
  comment at `composeArgument` so it is not re-litigated as an oversight.

- The reader's own vocabulary: `TrivalentValueSchema`, `ClaimAssignmentSchema`,
  claim reactions, `wire.ts`'s server⇄draft value mapping. A reader still
  assigns exactly three values.

</changes>
