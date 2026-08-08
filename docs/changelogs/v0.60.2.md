# Changelog — upcoming

<changes starting-hash="d29308e" ending-hash="HEAD">

## Fixed

- **The operator step the review wizard renders dropped the operator it was
  built from, so no decision made through the wizard recorded what it was
  about.** `buildOperatorQueue` resolves each queued premise's outermost
  decidable operator and carries it on the queue entry, and `TReviewStep`
  declares the matching `expressionId` — but `ReviewEngine`'s snapshot built the
  operator step from `premiseId` and `scope` alone. `currentStep.expressionId`
  was therefore always `undefined`, and a consumer that records it (the web
  app's premise step does) persisted `undefined` on every decision. Only the
  contradiction alert's reject-this-premise exit stored a real id, because it
  reads `decisionExpressionId` off the coherence result rather than off the
  step. The snapshot now carries the queue entry's `expressionId` through to the
  step.

- The decision's identity is unchanged: a `scope: "premise"` decision is still
  keyed by the bare `premiseId` (`operatorAssignmentKey`), so the same premise
  decided in the wizard and again from a contradiction alert resolves to one
  assignment, not two.

- Regression tests in `src/engine/review/__tests__/review-engine.test.ts`: the
  emitted operator step matches its queue entry's `expressionId` and a decision
  made from that step persists it; and a premise decided in the wizard and then
  rejected from the contradiction alert leaves a single assignment.

</changes>
