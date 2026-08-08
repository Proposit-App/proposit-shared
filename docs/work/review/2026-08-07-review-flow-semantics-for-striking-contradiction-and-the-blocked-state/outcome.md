# Outcome — Review-flow semantics for striking, contradiction and the blocked state

Shipped on `feature/review-flow-striking-contradiction-blocked`, merged
fast-forward into local `main`. **Not pushed, not published**, per the
initiative's publish handling. Commit range on `main`: `e4f7305..ad8ecd4`.

`pnpm run check` — **green** (typecheck, prettier, eslint, 122 files / 1103
tests, build). Version cut to **0.60.0**, tagged `v0.60.0`. Validation tarball:
`/Users/brian/Projects/Proposit-App/proposit-shared/proposit-shared-0.60.0-main.tgz`.

## What shipped, task by task

**Task 1 — track core 4.0.0** (`66c901d`). Peer range → `^4.0.0`; dev pin is the
absolute `file:` tarball for the duration of the initiative. The evaluation-result
mirror in `src/schemas/review.ts` drops `allSupportingPremisesTrue`,
`isCounterexample` and `preservesTruthUnderAssignment` and gains
`struckPremiseIds`, `survivingSupportingPremiseCount`,
`survivingSupportingPremisesTrue`, `premisesHoldConclusionFalse`,
`conclusionAttribution`, `claimAttribution`, `premiseSetSatisfiable`,
`variableProvenance`, plus the four new sub-schemas.

**Tasks 2 + 5, merged — replace the collapsed grade** (`90c505e`). Planned as two
commits; they are one change. `verdictOf`, `TConclusionVerdict` and
`TReviewOverlay.grade` cannot be deleted before their replacement exists, because
`src/utils/format-review-share.ts` consumes the verdict type — a deletion-only
commit would have left the tree red at the boundary the plan required to be
green. Added `src/engine/review/assessment.ts` (`composeAssessment` and every
string both axes render), rewired both overlay builders and the share formatter,
and deleted `ReviewEngine.expandPremiseToExpressions` /
`backOutToPremiseLevel` (no callers in either client; one decision per premise
makes them meaningless).

**Task 4 — decision target** (`9aa9264`). New `src/engine/review/decision-target.ts`
with `outermostDecidableOperator`. `buildExpressionAssignment` stops populating
`premiseScope` and instead writes one `expressionOverrides` entry per
premise-scope decision, so accepting `(A ∧ B) → C` no longer marks the `∧`
accepted. `buildReviewOverlay` paints the same single expression.
`TOperatorQueueEntry` carries the target.

**Tasks 3 + 6 — contradiction detection and prose** (`848dbbe`). Fixtures were
built with the tests that need them rather than as a separate task; a fixtures
commit with no assertions proves nothing. New
`src/engine/review/contradiction.ts` with `detectContradictions` and
`reviewCoherence`.

**Task 7 — `blocked`** (`78d91a4`). Both phase unions widened; `runEvaluation`
computes coherence and sets the results phase through one `resultsPhase()`
helper that every route to results goes through, so a blocked review cannot be
stepped past. `isReviewComplete` in `wire.ts`. The engine snapshot carries
`assessment` and `coherence`.

**Task 8 — claim-queue reachability** (`e1de5a6`). Behavior unchanged; three
tests pin it and `buildClaimQueue`'s doc comment records what the investigation
found. See below.

**Task 9 — escalation** (root `03502f5`).

**Task 10 — Documentation Sync** (`9eb139d`). This repo's `AGENTS.md` has no
`## Documentation Sync` section (its own backlog item), so the pass was made
against the repo's actual doc set: release notes, developer changelog, and the
two review capabilities. `README.md` mentions neither reviews nor grades — no
trigger. The `Grammar rule-code coordination protocol` section is specific to
grammar rule codes, so the peer-range widening needs nothing there.

**Task 11 — version** (`4011500`, `ad8ecd4`). `pnpm version minor` → 0.60.0,
justified by the repo's stated pre-1.0 policy: minor may carry breaking changes
(semver §4), and every prior breaking shared release took a minor.

## What the plan and spec got wrong

**The design's claim-queue diagnosis is wrong, and the narrowing it asks for is a
no-op.** Both the design (§9) and the absorbed mobile request state that the
queue walks each premise's *variables*, so a claim-bound variable no expression
references is offered as a step. It is not: core's
`collectArgumentReferencedClaims` walks each premise's **expression tree** and
records a claim only at a variable expression. Verified on a purpose-built
fixture — the unreferenced variable's claim never appears in the queue. Criterion
11 as literally worded already held; it is now pinned by test rather than left
incidental.

The reported four-versus-three count is a *different* case: a claim whose only
expression reference lives inside an engine-generated derivation premise. **That
narrowing was not shipped, deliberately.** The design instructed confirming that
the narrowing "removes only steps that cannot matter". It does not: measured on
`buildEngineWithDerivationOnlyClaim`, answering that step `true` yields
`survivingSupportingPremisesTrue: true` while leaving it unanswered yields
`null`, because the derivation premise holding the claim is counted among the
surviving supporting premises. Removing the step would degrade the argument
assessment for every reader who answered it. Escalated to `proposit-core` as
`2026-08-07-a-derivation-premise-for-a-claim-no-authored-premise-references-is-counted-in-the-supporting-aggregate`;
the shared-side narrowing becomes safe and cheap once that lands.

**`¬(A → B)` is not expressible.** The design uses it as the worked example for
the decision-target rule. The grammar puts inference operators at a premise root
only, so `addExpression` throws *"Operator expression … with 'implies' must be a
root expression"*. The rule is exercised on `¬(A ∧ B)` instead, which reaches the
same recursion. The rule itself is unchanged and correct.

**Per-operator commitment prose keys on the premise's root operator, not the
decision target.** The spec said "the decision target". For `¬(A ∧ B)` the target
is the `and` while what the reader granted is the negation, so target-keyed prose
would have said "every part holds" about a premise asserting the opposite. The
root operator is what granting the premise commits the reader to; the target is
still carried as `decisionExpressionId` for a client offering the rejection
inline.

**The reject exit carries `counterexamples-exist` on inference premises only.**
Acceptance criterion 8 said "every contradiction". On a restriction premise
"counterexamples exist" is not what declining means, and the reject-reason
vocabulary is inference vocabulary. Restriction exits read *Decline this
constraint* and carry no reason code.

**Derivation is stated in prose, not as a second arrow.** The design asks for
"distinct notation for derivation and implication". Two arrow glyphs are not
distinguishable at UI sizes, and the failure mode the design names — reading
`(Unknown → True) → False` as nested implication — is caused by using an arrow at
all. `notation` therefore uses an arrow only for the premise's own operator, and
"became" is a provenance sentence. Recorded in the spec and in the module doc as
a deliberate deviation.

**`decision-target.ts` is a module the plan did not name.** `step-queue.ts`
already imports `toEvaluationContext` from `evaluation.ts`, and `evaluation.ts`
now needs the rule, so keeping it in `step-queue.ts` would have created an import
cycle. One file, re-exported from `step-queue.ts` for callers.

## Left standing, deliberately

- **A rejection of the conclusion premise does nothing.** Core never strikes the
  conclusion premise, but the operator queue still offers a decision on one that
  has a decidable operator. Same shape as the accepted "rejecting this did
  nothing" complaint the design records for restrictions. Out of scope here.
- **`blocked` cannot round-trip.** `draftToUpdatePayload` will send a phase
  `proposit-server`'s `argumentReviews_phase_check` rejects until slice C lands.
  The state is client-local until then, as the initiative sequenced it.
- **Both clients are red by construction** — `verdictOf`, `TConclusionVerdict`
  and `TReviewOverlay.grade` are gone and `TOperatorQueueEntry` widened. Slices
  C, D and E repair them.

## Verification the suite cannot check

The composed strings were read end to end in second person before the version
cut. Vocabulary is machine-checked for banned words (proof language in the
assessment tables, refusal language in the contradiction strings), but tone is
not. Consumer gates were not run — they are expected red.

---

# Follow-up — v0.60.1: the reject-this-premise exit dropped its reason

Found after this item entered review, by driving the web app in a browser. Not a
regression this item introduced, but this item is what made it reachable: once
the decision target became the outermost decidable operator, the exit began
storing a real `expressionId` on a premise-scope decision.

## The defect

`ReviewEngine` held one identity rule for an operator decision, written twice,
and the two copies disagreed.

- `opKey` — the rule `setOperatorAssignment` deduped with and
  `operatorDecidedKeys` published — keyed a `scope: "premise"` decision by the
  bare `premiseId`. One decision per premise; the operator's `expressionId` is
  provenance for the objection, never a second scope.
- `setOperatorReason(key, code)` re-derived its own rule:
  `key.split(":")` and then a match on `o.premiseId === premiseId &&
  (o.expressionId ?? "") === expressionId`. A bare `premiseId` yields an empty
  `expressionId`, so a stored row carrying a real one never matched, and the
  method threw `setOperatorReason: no op for <premiseId>`.

Consequence in the app: taking the contradiction alert's "Reject this premise —
counterexamples exist" exit applied the rejection, dropped the reason code, and
aborted the `jumpToResults()` on the next line, leaving the reader stranded and
the exit's own label unfulfilled. Reproduced in the browser twice.

The suite could not see it: `proposit-server`'s `contradiction-alert.test.tsx`
mocks the engine (`setOperatorReason = vi.fn()`), so it asserts the call was made
and never that the real engine accepts the key. No test in this repo drove the
real `ReviewEngine` with a premise decision carrying an `expressionId`.

## The fix

`src/engine/review/operator-key.ts` — `operatorAssignmentKey`, the rule stated
once, with the reasoning for excluding `expressionId` from premise identity in
its doc. `setOperatorAssignment`, `setOperatorReason`, `operatorDecidedKeys`, and
`LocalStorageReviewStore.upsertOperatorAssignment` (which held a third,
non-divergent copy) now all resolve through it. Regression test in
`__tests__/review-engine.test.ts`.

`skipOperator` was checked and is not divergent: its key space is the operator
queue's, which is the bare `premiseId` for every entry — the same string
`operatorAssignmentKey` produces. Documented rather than changed.

The throw is kept. A reason has nothing to attach to without a decision, every
caller records the decision first, and `setClaimReason` fails the same way; with
identity fixed, a miss is a caller bug worth surfacing.

## Standing defects this exposed, not fixed here

1. **`computeSnapshot` drops the decision target.** The operator step it emits
   carries `premiseId` and `scope` but never `expressionId`, though
   `TReviewStep` declares the field and `buildOperatorQueue` computes it. So
   every decision made through the wizard stores `expressionId: undefined` and
   the provenance this item introduced is never recorded on the main path —
   which is also why the same mismatch in `premise-step.tsx` never threw. Not
   fixed here because of (2).
2. **The server's uniqueness key disagrees with this one.** `reviewOperator-
   Assignments` upserts on `["reviewId","premiseId","scope","expressionId"]`,
   so the same premise decision saved once without an operator id and once with
   becomes two rows. Today the contradiction-alert exit populates the id while
   the wizard leaves it null, so the two paths can already double-write one
   premise. Evaluation re-derives the target from the premise and ignores the
   stored id, so the verdict is unaffected, but the UI's
   `find(o => o.scope === "premise" && o.premiseId === x)` can read the stale
   row. Aligning the DB key with `operatorAssignmentKey` is server-side work.

## Follow-up — v0.60.2, the decision target now reaches the record

Standing defect (1) above is fixed. `proposit-server` v0.46.1 shipped migration
`20260808062909_align_review_operator_assignment_identity`, which makes a
premise-scope decision unique on `(reviewId, premiseId, scope)` with
`expressionId` excluded from identity — the SQL transcription of
`operatorAssignmentKey`, and it de-duplicated the rows local data had already
accumulated. That cleared (2), so emitting a real `expressionId` on every wizard
decision is safe: it can no longer turn an occasional double-write into the norm.

The drop was one line. `computeSnapshot` now builds the operator step with the
queue entry's `expressionId`, so `currentStep.expressionId` is the premise's
outermost decidable operator — the same id `buildOperatorQueue` resolved and the
same id the contradiction alert reports as `decisionExpressionId`. The design's
§3 promise that finer targeting can arrive later without a backfill migration is
now true of decisions made on the main path, not only of the ones taken through
the alert.

No other drop site. The only construction of a `kind: "operator"` step is the
one in `computeSnapshot`; `getOperatorQueue()` also narrows entries to
`premiseId`, but its consumers use it for membership tests only
(`apply-review-jump.ts`, `results-step.tsx`), never to record a decision, so it
was left alone.

Two regression tests in `__tests__/review-engine.test.ts`, both failing before
the change:

- the emitted operator step carries its queue entry's `expressionId`, and a
  decision made from that step persists it;
- a premise accepted in the wizard (now carrying a real `expressionId`) and then
  rejected from the contradiction alert's exit leaves **one** assignment, whose
  `expressionId` is the wizard's — the interaction the two defects made
  interlock, now covered end to end through the real engine.

`pnpm run check` green. Tarball
`proposit-shared-0.60.2-main.tgz`, tag `v0.60.2`, merged to main locally, not
pushed or published.

Still open, server-side and routed separately: `createReview` discards the
resolved operator id and seeds its rows with `expressionId: null`, so a review's
initial rows carry no target even though the wizard's updates now do.
