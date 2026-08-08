# Spec — Review-flow semantics for striking, contradiction and the blocked state

Design of record:
`/Users/brian/Projects/Proposit-App/docs/work/active/2026-08-07-review-verdicts-as-two-axes-with-rejection-striking-premises-from-the-record/design.md`

## Capability changes

Planned ledger deltas only.

- **`reviews/see-the-argument-grade` — rewrite the wording, keep `Supported`.**
  Its current text names the collapsed grade vocabulary ("sound, unsound,
  vacuously true, a counterexample, inadmissible, or indeterminate"). That
  vocabulary no longer exists: `@proposit/proposit-core` 4.0.0 deleted
  `gradeEvaluation` and `TCoreEvaluationGrade`. Replace with the two-axis
  wording — a conclusion assessment (true / false / unknown, with attribution)
  and an argument assessment (reaches / doesn't reach / premises contradict),
  plus a separate rejected-premise badge.
- **`reviews/decide-each-operator` — rewrite the wording, stays `Missing`.**
  A reviewer gets one decision per premise, targeted at that premise's
  outermost decidable operator, and a rejection strikes the premise rather than
  asserting anything false. Restriction premises read *grant* / *decline*.
- No new capability ids. The blocked state is a precondition on an existing
  capability (completing a review), not a new thing a user can do.

Client-visible surfaces for both live in `proposit-server` and
`proposit-mobile`; this node ships the vocabulary those clients render.

## Problem

Slice A changed what a reviewer's accept/reject decision *means* in the engine:
rejection strikes the premise from the evaluated set instead of asserting the
conditional false, and evaluation emits orthogonal facts with per-value
provenance instead of one grade enum. `proposit-shared` owns the review flow
both clients run, and it still encodes the superseded model:

1. **The decision target fans out.** `buildExpressionAssignment`
   (`src/engine/review/evaluation.ts:86-99`) collects premise-scope decisions
   into `premiseScope` and hands them to core's
   `canonicalizeOperatorAssignments`, which stamps the decision on **every**
   decidable operator expression in the premise. Accepting `(A ∧ B) → C`
   therefore marks the `∧` accepted too, and core reads an accepted conjunction
   as an assertion that each conjunct holds — manufacturing `true` for `A` and
   `B` that nobody supplied. `buildReviewOverlay`
   (`src/engine/review/overlay.ts:91-98`) fans out identically.
2. **The collapsed grade is still the published contract.** `verdictOf`
   (`src/engine/review/overlay.ts:46-62`) returns a five-member
   `TConclusionVerdict` (`src/engine/review/types.ts:16-22`) built from
   `isCounterexample` / `allSupportingPremisesTrue`, and
   `buildInlineReviewOverlay` returns `grade: gradeEvaluation(result).grade`
   (`src/engine/review/overlay.ts:260`). All four inputs were deleted in core
   4.0.0; `pnpm run typecheck` fails on them today.
3. **There is no contradiction detection anywhere.** Nothing reads "an accepted
   premise that evaluates false under the reader's own values", so a review can
   be completed while incoherent.
4. **There is no `blocked` state.** `ReviewPhaseSchema`
   (`src/schemas/review.ts:106-110`) and `ServerReviewPhase`
   (`src/schemas/model/review.ts:33-37`) are both the three-literal union
   `claims | operators | done`, and `ReviewEngine.advanceStep`
   (`src/engine/review/review-engine.ts:489-492`) walks `claims → operators →
   done` with no coherence gate. `done` doubles as "standing on the results
   step" and "finished".
5. **The mirror schema is stale.** `TCoreArgumentEvaluationResultSchema`
   (`src/schemas/review.ts:232-255`) still declares
   `allSupportingPremisesTrue`, `isCounterexample` and
   `preservesTruthUnderAssignment`, and declares none of the fields core 4.0.0
   added.
6. **Sub-premise decision APIs contradict the model.**
   `expandPremiseToExpressions` / `backOutToPremiseLevel`
   (`src/engine/review/review-engine.ts:406-431`) exist to record a decision per
   internal operator. The design gives the reviewer exactly one decision per
   premise. Neither method has a caller in `proposit-server` or
   `proposit-mobile`.

### The claim-queue reachability question — cause established

The absorbed `proposit-mobile` request states the root cause as *"the queue's
unit is the variable, not the expression … nothing downstream re-checks whether
the variable is actually wired into the logic."* **That is not what the code
does, and the narrowing it proposes is a no-op.**

`buildClaimQueue` (`src/engine/review/step-queue.ts:44-54`) delegates collection
to core's `collectArgumentReferencedClaims`, which walks each premise's
**expression tree** from its root and records a claim only when it meets a
`type === "variable"` expression referencing a claim-bound variable
(`node_modules/@proposit/proposit-core/dist/lib/core/review-helpers.js:70-97`).
A claim-bound variable that no expression references is already invisible to it.

Verified against a purpose-built engine fixture (three claim-bound variables, one
of them referenced by no expression): the unreferenced variable's claim does not
appear in the queue, and the queue is nevertheless one entry longer than the
argument's authored claim count. The extra entry is a claim whose **only**
expression reference lives inside an engine-generated **derivation premise** —
exactly the reported shape ("its premises are all `derivation`, so the text tree
never renders it"). The DB-level orphan variable the request's SQL finds is a
co-symptom of the same editing history, not the cause: a claim carries both an
authored variable and an engine-synthesized derivation-consequent variable, and
the queue dedupes by claim, so the claim stays queued through the second variable
after the first is orphaned.

So the criterion-11 sentence — *a claim-bound variable that no expression
references is not offered as a review step* — **already holds**, untested. And
the narrowing that would remove the reported step is a different one: dropping
claims reachable only through derivation premises.

**That narrowing is not free, so this item does not ship it.** Measured on the
same fixture, with the derivation-only claim assigned `true` the evaluation
reports `survivingSupportingPremisesTrue: true`; with it unassigned or assigned
`false` the same evaluation reports `null`, because the derivation premise
`implies(source_var, Orphan)` is itself counted as a surviving supporting
premise. Removing the step therefore *degrades* the argument assessment in
precisely the case a reader answers it. The design's instruction was to "confirm
the narrowing removes only steps that cannot matter"; it does not. The real
defect is that a derivation premise for a claim no authored premise references is
counted in the supporting aggregate at all — an evaluation-set question owned by
`proposit-core`. Recorded as a finding, escalated separately, not patched here.

## Goals

1. One decision per premise, targeted at that premise's **outermost decidable
   operator** — the outermost operator that isn't `not`, recursing through
   `not`. A premise with none (bare `¬Q`, a bare variable) is not offered.
   Nested operators are left unassigned and evaluate normally.
2. A **two-axis assessment composer** in shared, so server, mobile and any
   future client render one vocabulary rather than four string tables.
3. **Contradiction detection, localization and prose**, one-sided, with
   per-value provenance, per-operator commitment sentences, both exits, and the
   inductive exit named.
4. **`blocked` as an explicit review state**, with completion redefined as
   *reached the results step and coherent*.
5. Reader-caused vs author-caused routing by premise-set satisfiability, with
   copy that describes the conflict and never allocates fault.
6. The mirror schema tracks core 4.0.0.
7. Criterion 11 pinned by test, and the real cause recorded.

## Non-goals

- Narrowing the claim queue by derivation-only reachability (see above).
- Review phase reordering; the conclusion keeps defaulting to unknown under the
  existing order.
- Relaxing `proposit-server`'s `argumentReviews_phase_check` — slice C.
- Any client rendering. This node ships data and strings only.
- Publishing to npm.

## Design

### 1. Decision target

`outermostDecidableOperator(premise)` (new, `step-queue.ts`) returns
`premise.getDecidableOperatorExpressions()[0]`. Core's implementation is a
rooted pre-order DFS that skips `not` operators and non-operator nodes
(`premise-engine.js:1174-1192`), so its first element *is* the outermost
non-`not` operator, and the list is empty exactly when there is none.

- `TOperatorQueueEntry` gains `expressionId` — the decision target, carried so
  clients can explain *what specifically* is under judgment without re-deriving
  it. The queue's membership rule is unchanged (a premise qualifies iff it has
  a decidable operator), so no premise enters or leaves.
- `buildExpressionAssignment` stops populating `premiseScope`. A premise-scope
  draft entry becomes an `expressionOverrides` entry on that premise's
  outermost decidable operator; expression-scope entries layer on as before.
- `buildReviewOverlay` paints the same single expression rather than every
  decidable one.
- `expandPremiseToExpressions` and `backOutToPremiseLevel` are deleted. They
  have no callers and their purpose is now prohibited.

The draft record keeps `scope: "premise"` and stays keyed by premise id, with
`expressionId` optional — finer targeting can arrive later without a migration.

### 2. Assessment composer — `src/engine/review/assessment.ts` (new)

`composeAssessment(evaluation)` → `{ conclusion, argument }`.

**Conclusion axis** — value `true | false | unknown` from `conclusionTrue`, plus
the two attribution facts from `conclusionAttribution`, rendered as up to two
*independent* statements, never fused:

- `assertedByReader` → `"You assigned this."`
- `reachedWithoutAssertion` → `"The argument reaches it on its own."`
- `assertedByReader && !reachedWithoutAssertion` →
  `"It holds only because you assigned it."`

**Argument axis** — one primary outcome plus, for the negative outcome, one
reason:

| Outcome | Label | Condition |
| --- | --- | --- |
| `premises-contradict` | Its premises contradict each other | `premiseSetSatisfiable === false` |
| `reaches-conclusion` | Reaches its conclusion | `conclusionAttribution.reachedWithoutAssertion` |
| `does-not-reach` | Doesn't reach its conclusion | otherwise |

Reason, in precedence order (documented in code, first match wins):

| Reason | Text | Condition |
| --- | --- | --- |
| `premises-hold-conclusion-does-not-follow` | its premises hold and its conclusion doesn't follow | `premisesHoldConclusionFalse === true` |
| `conclusion-came-from-you` | the conclusion came from you | `conclusionAttribution.assertedByReader` |
| `reasoning-rejected` | you rejected part of its reasoning | `struckPremiseIds.length > 0` |
| `not-enough-settled` | not enough was settled | otherwise |

The structural finding leads the attribution one because it says something the
reader could not have seen; the design leaves the ordering to composition (§5,
"Overlap").

**Struck premises are a separate badge**, not an outcome member:
`{ count, label }` with `label` = `"1 premise rejected"` / `"N premises
rejected"`. That is what lets *Reaches its conclusion* + *1 premise rejected*
compose. For restriction premises the badge reads `"1 constraint declined"`.

No label uses proof language, and none implies an inductively accepted step
establishes less than an entailment.

`verdictOf`, `TConclusionVerdict` and `TReviewOverlay.grade` are deleted;
`TReviewOverlay` gains `assessment?: TReviewAssessment`.

### 3. Contradiction detection — `src/engine/review/contradiction.ts` (new)

`detectContradictions({ evaluation, argEngine, draft })` → `TContradiction[]`.

**Signature, one-sided:** a premise that (a) the reader **accepted**, (b) is not
in `struckPremiseIds`, and (c) has `rootValue === false`. A rejected premise is
struck and never reported — a reader who rejects `P → Q` while holding `P` and
`Q` true has made the material conditional true while denying the relationship,
which is the normal state of a rejection, and a two-sided check would flag every
rejection in the system. Only `true` and `false` collide: an explicit unknown
propagates as `null` under Kleene, so a premise containing one cannot come out
`false`, and no extra guard is needed for it.

Each finding carries:

- `premiseId`, `premiseTitle`, `expressionId` (the decision target),
  `operator`, and `premiseKind: "inference" | "restriction"`.
- `commitment` — **per-operator** prose, one sentence per operator:
  - `implies`: "By accepting this premise you are saying there is no
    circumstance where {antecedent} is true and {consequent} is false, however
    you have assigned values that contradict this."
  - `iff`: each side holds exactly when the other does.
  - `and`: every part holds.
  - `or`: at least one part holds.
  - restriction premises use *granting* rather than *accepting* language.
- `values` — one entry per claim-bound variable the premise references, with
  the **claim title** (never the variable symbol), the value, and the origin
  from `variableProvenance`.
- `provenance` — for each `origin === "derived"` value, one sentence naming the
  premise that produced it and the values it consumed, resolved through
  `derivedBy.fromVariableIds` to claim titles. This is what stops the alert
  asking a reader to fix a value they never set.
- `notation` — the premise's own operator rendered over its operand values
  (`"True → False"`). **Derivation is stated in prose, not as a second arrow.**
  The design asks for "distinct notation for derivation and implication"; two
  arrow glyphs are not distinguishable at UI sizes, so the distinction is drawn
  by using an arrow for implication only and a sentence for "became". Recorded
  as a deliberate deviation.
- `exits` — both, always: `reject-premise` (carrying
  `reasonCode: "counterexamples-exist"` and copy that names the inductive
  reading — "the inference generally holds, but not in this case") and one
  `change-assignment` per asserted value involved. For a restriction premise the
  first exit reads **decline**, never reject/deny/refute.

Detection is a pure function of the latest evaluation, so re-checking after each
change is the caller re-evaluating — no cached list to invalidate. Stated in the
module doc.

### 4. Reader-caused vs author-caused routing

`reviewCoherence({ evaluation, contradictions })` →
`{ state, blocksCompletion, notice? }`:

- `premiseSetSatisfiable === false` → `state: "premises-contradict"`,
  `blocksCompletion: false`, and a start-of-review `notice` describing the
  conflict. The reader is told, never blocked, and derivation is already
  suppressed by core.
- contradictions present, otherwise → `state: "reader-resolvable"`,
  `blocksCompletion: true`.
- else → `state: "coherent"`.

No string in either branch attributes the conflict to anyone. Satisfiability
decides whether a resolution exists, not who erred.

### 5. `blocked`

- `ReviewPhaseSchema` and `ServerReviewPhase` gain `"blocked"`.
- `ReviewEngine.runEvaluation()` sets `phase` to `"blocked"` when
  `reviewCoherence(...).blocksCompletion`, and back to `"done"` when a
  re-evaluation clears it. Both phases render the results step, so `blocked` is
  the results step **as a gate** rather than a display.
- `isReviewComplete(draft)` (new, `wire.ts`) is `draft.phase === "done"` —
  `phase === "done"` remains the persisted completion signal hydration reads,
  and a blocked review can never carry it.
- The engine snapshot gains `assessment`, `contradictions` and `coherence` so a
  client has everything without recomputing.

`blocked` cannot round-trip to `proposit-server` until slice C relaxes
`argumentReviews_phase_check`. Deliberate and out of scope here.

### 6. Mirror schema

`TCoreArgumentEvaluationResultSchema` drops `allSupportingPremisesTrue`,
`isCounterexample` and `preservesTruthUnderAssignment`, and adds
`struckPremiseIds`, `survivingSupportingPremiseCount`,
`survivingSupportingPremisesTrue`, `premisesHoldConclusionFalse`,
`conclusionAttribution`, `claimAttribution`, `premiseSetSatisfiable` and
`variableProvenance`.

### 7. Sibling sweep

The repo-wide sweep for defects sibling to the reported ones is the
`gradeEvaluation` / `allSupportingPremisesTrue` / `isCounterexample` /
`TCoreEvaluationGrade` grep, which reaches `src/schemas/review.ts`,
`src/engine/review/types.ts`, `src/engine/review/overlay.ts` and three test
files, and the `premiseScope` grep, which reaches `evaluation.ts` and
`overlay.ts`. Both are exhausted by this item. No other module reads an
evaluation result.

## Acceptance criteria

1. `buildOperatorQueue` entries carry the premise's outermost decidable operator
   expression id; a premise whose root is `¬Q` is absent from the queue.
2. Accepting a premise whose tree is `(A ∧ B) → C` produces exactly one entry in
   the core operator assignment — the `implies` — and evaluation assigns nothing
   to `A` or `B`.
3. `composeAssessment` returns `reaches-conclusion` with a `1 premise rejected`
   badge for the redundant-support shape (`A → C` struck, `B → C` granted,
   `B` true).
4. `composeAssessment` returns `does-not-reach` with reason
   `conclusion-came-from-you` for the water-and-mammals shape, and the
   conclusion axis reports value `true` with both statements
   `"You assigned this."` and `"It holds only because you assigned it."`.
5. No string exported by the assessment module contains `proved`, `proven`,
   `sound`, `unsound`, `valid`, `invalid`, `refuted`, `denied` or `refused`,
   asserted by a test over the exported tables.
6. `detectContradictions` reports the premise a reader accepted that evaluates
   false under their own values, and reports **nothing** for the mirror case (a
   rejected `P → Q` with `P` and `Q` both true).
7. A contradiction whose colliding value was derived carries a `provenance`
   sentence naming the premise that produced it and the claim titles it
   consumed — asserted on the chain shape `P → Q`, `Q → R`, `P` true, `R` false.
8. Every contradiction carries both exits, and the reject exit carries
   `reasonCode: "counterexamples-exist"`.
9. A contradiction on a restriction premise renders *decline* / *withheld*, and
   no exported contradiction string contains `deny`, `denied`, `refute` or
   `refuted`.
10. `runEvaluation()` on an incoherent draft leaves `phase === "blocked"` and
    `isReviewComplete(draft) === false`; resolving the collision and
    re-evaluating returns it to `"done"` with `isReviewComplete === true`.
11. An unsatisfiable premise set yields `state: "premises-contradict"` with
    `blocksCompletion: false`.
12. A claim-bound variable that no expression references is not offered as a
    review step; the same variable referenced by one expression is; and the
    queue length equals the count of evaluation-relevant authored claims.
13. `pnpm run check` passes.

## Risks

- **Consumers break by construction.** `verdictOf`, `TConclusionVerdict` and
  `TReviewOverlay.grade` are removed and `TOperatorQueueEntry` widens; both
  clients fail to typecheck until slices C, D and E. Expected and recorded in
  the epic — not a regression to chase here.
- **`blocked` cannot persist yet.** `draftToUpdatePayload` will send a phase the
  server's CHECK constraint rejects. The state is client-local until slice C.
- **Precedence between the two `does-not-reach` readings is a judgment call.**
  Both facts are exported alongside the composed label, so a client that wants
  the other reading can take it.
- **The derivation-only queue entry stays.** The reported four-versus-three
  count is unchanged by this item. Escalated rather than patched, with the
  measurement recorded above.

## Notes

`@proposit/proposit-core` is pinned to an absolute `file:` tarball
(`4.0.0-feature-rejection-strikes-the-premise`) for the duration of the
initiative; the coordinated npm publish and repin happen at the end. The
`peerDependencies` range widens to `^4.0.0` because core 4.0.0 is a breaking
release this package's source now depends on.
