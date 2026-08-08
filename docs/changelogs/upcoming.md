# Changelog — upcoming

<changes starting-hash="e4f7305" ending-hash="HEAD">

## Breaking

- **`@proposit/proposit-core` peer range → `^4.0.0`** (`package.json`). Core 4.0
  removes `gradeEvaluation`, `TCoreEvaluationGrade`, `TCoreEvaluationGrading`
  and `preservesTruthUnderAssignment`, and renames
  `allSupportingPremisesTrue` → `survivingSupportingPremisesTrue` and
  `isCounterexample` → `premisesHoldConclusionFalse`. The dev pin is a `file:`
  tarball for the duration of the coordinated release; it reverts to a caret
  range when core publishes.

- **Removed `verdictOf`** (`src/engine/review/overlay.ts`), **`TConclusionVerdict`**
  and **`TReviewOverlay.grade`** (`src/engine/review/types.ts`). The single
  collapsed grade cannot represent two axes that legitimately disagree.
  Replaced by `composeAssessment` and `TReviewOverlay.assessment`.

- **`formatReviewShareText` signature changed** (`src/utils/format-review-share.ts`):
  takes `{ assessment: TReviewAssessment, argumentTitle, url }` instead of
  `{ verdict, argumentTitle, url }`, and emits both axes on their own lines.

- **Removed `ReviewEngine.expandPremiseToExpressions` and
  `ReviewEngine.backOutToPremiseLevel`** (`src/engine/review/review-engine.ts`).
  A reviewer gets one decision per premise, so seeding a decision onto every
  internal operator has no meaning. Neither had a caller in `proposit-server` or
  `proposit-mobile`.

- **`TOperatorQueueEntry` gains a required `expressionId`**
  (`src/engine/review/step-queue.ts`) — the premise's outermost decidable
  operator, i.e. the decision target.

- **`TReviewEngineSnapshot` gains required `assessment` and `coherence`**
  (both `| undefined`). Structural consumers constructing a snapshot literal
  must add them.

- **`ReviewPhaseSchema` and `ServerReviewPhase` admit `"blocked"`**
  (`src/schemas/review.ts`, `src/schemas/model/review.ts`). Exhaustive switches
  over either union need a new arm. `proposit-server`'s
  `argumentReviews_phase_check` constraint still admits only three values, so
  `blocked` does not round-trip until that migration lands.

## Added

- `src/engine/review/assessment.ts` — the two-axis composer and every string
  either axis renders, so all consumers share one vocabulary.
    - `composeAssessment(evaluation) → TReviewAssessment | undefined`
      (`undefined` when `!evaluation.ok`).
    - `TConclusionAssessment { value: "true"|"false"|"unknown", label,
assertedByReader, reachedWithoutAssertion, statements: string[] }`.
    - `TArgumentAssessment { outcome, label, reason?, reasonText?, struck }` with
      `TArgumentOutcome = "reaches-conclusion" | "does-not-reach" |
"premises-contradict"` and `TArgumentReason = "conclusion-came-from-you" |
"reasoning-rejected" | "not-enough-settled" |
"premises-hold-conclusion-does-not-follow"`.
    - `TStruckBadges { struckPremiseIds, rejectedPremiseCount,
declinedConstraintCount, labels }` — struck premises are a badge beside the
      outcome, never a member of it, which is what lets _Reaches its conclusion_
      and _1 premise rejected_ compose.
    - Tables: `CONCLUSION_VALUE_LABELS`, `ARGUMENT_OUTCOME_LABELS`,
      `ARGUMENT_REASON_TEXT`, `CONCLUSION_ASSERTED_STATEMENT`,
      `CONCLUSION_REACHED_STATEMENT`, `CONCLUSION_ONLY_ASSERTED_STATEMENT`.
    - Line helpers: `argumentAssessmentLine`, `conclusionAssessmentLine`.

        Reason precedence is first-match:
        `premises-hold-conclusion-does-not-follow` → `conclusion-came-from-you` →
        `reasoning-rejected` → `not-enough-settled`. Both underlying facts stay on
        the evaluation result, so a client wanting the other reading can take it.
        An all-struck supporting set is forced to `does-not-reach` +
        `reasoning-rejected` regardless of attribution, because an empty conjunction
        makes `survivingSupportingPremisesTrue` vacuously true.

- `src/engine/review/contradiction.ts` —
    - `detectContradictions({ evaluation, argEngine, draft }) → TContradiction[]`.
      Signature: an **accepted**, non-struck premise whose `rootValue === false`.
      One-sided by construction — a rejected premise is struck and never
      examined, so a rejection making its material conditional true is not
      reported. Explicit unknowns need no special case: they propagate as `null`,
      so a premise carrying one cannot come out `false`.
    - `TContradiction { premiseId, premiseTitle, premiseKind, operator,
decisionExpressionId?, commitment, values, provenance, notation, exits }`.
      `commitment` is one sentence chosen by the premise's **root** operator
      (`implies` / `iff` / `and` / `or` / `not`, with a fallback).
      `values` carry claim titles, not variable symbols. `provenance` carries one
      sentence per derived value naming the producing premise and the values it
      consumed. `notation` renders the root operator over its operand values
      (`"True → False"`).
    - `TContradictionValue { variableId, claimId?, title, value, origin }`.
    - `TContradictionExit { kind: "reject-premise" | "change-assignment", label,
detail, premiseId?, reasonCode?, claimId?, variableId? }`. Both kinds are
      always present. The reject exit on an inference premise carries
      `reasonCode: "counterexamples-exist"`; on a restriction premise it reads
      _Decline this constraint_ and carries no reason code. `change-assignment`
      exits walk derived values back through `variableProvenance.derivedBy` to the
      reader's own assertions, so the reader is offered values they actually set.
    - `reviewCoherence({ evaluation, argEngine, draft }) → TReviewCoherence`
      with `state: "coherent" | "reader-resolvable" | "premises-contradict"`,
      `blocksCompletion`, `contradictions`, `notice?`. Only
      `reader-resolvable` blocks. `CONTRADICTORY_PREMISE_SET_NOTICE` is exported
      for the start-of-review notice.
    - `TPremiseKind = "inference" | "restriction"`.

- `src/engine/review/decision-target.ts` —
  `outermostDecidableOperator(premise)`, the premise's outermost non-`not`
  operator (`getDecidableOperatorExpressions()[0]`, whose rooted pre-order walk
  makes the first element exactly that). Re-exported from `step-queue.ts`. Its
  own module so `step-queue` and `evaluation` can both use it without a cycle.

- `isReviewComplete(draft)` (`src/engine/review/wire.ts`) — `phase === "done"`.

- Mirror-schema additions (`src/schemas/review.ts`): `ValueAttributionSchema`,
  `ValueOriginSchema`, `DerivationStepSchema`, `VariableProvenanceSchema`, and
  on `TCoreArgumentEvaluationResultSchema` the fields `struckPremiseIds`,
  `survivingSupportingPremiseCount`, `survivingSupportingPremisesTrue`,
  `premisesHoldConclusionFalse`, `conclusionAttribution`, `claimAttribution`,
  `premiseSetSatisfiable`, `variableProvenance`.

- Fixtures (`src/engine/review/__tests__/fixtures.ts`):
  `buildEngineWithNegatedPremises`, `buildEngineWithDerivationChain`,
  `buildEngineWithRestrictionConflict`,
  `buildEngineWithUnsatisfiablePremises`, `buildEngineWithRedundantSupport`,
  `buildEngineWithUnreferencedClaimVariable`,
  `buildEngineWithDerivationOnlyClaim`.

- Tests: `assessment.test.ts`, `contradiction.test.ts`,
  `decision-target.test.ts`, `blocked-state.test.ts`, plus reachability cases in
  `step-queue.test.ts`.

## Changed

- **`buildExpressionAssignment`** (`src/engine/review/evaluation.ts`) no longer
  populates `premiseScope`. A premise-scope draft entry becomes a single
  `expressionOverrides` entry on that premise's outermost decidable operator, so
  core's fan-out across every non-`not` operator no longer happens. This is the
  fix for accepted-conjunction value manufacture; core still validates the
  override ids.

- **`buildReviewOverlay`** (`src/engine/review/overlay.ts`) paints the same
  single expression instead of every decidable operator, and both overlay
  builders now return `assessment`.

- **`ReviewEngine`** — `runEvaluation()` computes `reviewCoherence` and sets the
  results phase to `blocked` or `done` accordingly. Every route to the results
  step (`advanceStep`, `jumpToResults`, `proceedWithSkippedAsUnknown`, the
  edit-return path) goes through one `resultsPhase()` helper, so a blocked
  review cannot be stepped past. `canRunEvaluation` is now true in both results
  phases so a reader can re-check after a fix.

- **`buildOperatorQueue`** emits `expressionId` and skips a premise with no
  outermost decidable operator — which now also covers a premise whose whole
  content is a negated atom.

## Internal

- `buildClaimQueue`'s doc comment records what the reachability investigation
  established: reachability is already expression-level (core's
  `collectArgumentReferencedClaims` walks each premise's expression tree), so a
  claim-bound variable no expression references never reaches the queue and a
  variable-level narrowing would be a no-op. A claim reachable only through a
  derivation premise is still offered, with the measurement that says why
  removing it is unsafe today. No behavior change; three tests pin it.

- Escalated to `proposit-core` (root inbox,
  `2026-08-07-a-derivation-premise-for-a-claim-no-authored-premise-references-is-counted-in-the-supporting-aggregate`):
  a derivation premise for a claim no authored premise references is counted in
  `survivingSupportingPremisesTrue`, which is what blocks the claim-queue
  narrowing.

- `docs/capabilities/` — `reviews/see-the-argument-grade` reworded to the two
  axes; `reviews/decide-each-operator` reworded to one decision per premise with
  rejection striking it. Statuses unchanged.

- **Note on `¬(A → B)`.** The design of record uses it as the worked example for
  the decision-target rule. The grammar does not admit it: an inference operator
  may only sit at a premise root, so `addExpression` rejects an `implies` nested
  under a `not`. The rule is exercised on `¬(A ∧ B)` instead.

</changes>
