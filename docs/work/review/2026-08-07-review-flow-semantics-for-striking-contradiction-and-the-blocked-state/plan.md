# Plan — Review-flow semantics for striking, contradiction and the blocked state

Ordering principle: the tree typechecks at every commit boundary. Core 4.0.0 is
already pinned, so the tree is **red on arrival** (7 errors across
`overlay.ts`, `types.ts` and two test files). Task 1 clears that debris and
gives every later task a green baseline; the two risky pieces (the composer,
contradiction detection) land afterwards with their fixtures already in place.

## Task 1 — Track core 4.0.0

**Changes:** `package.json` (`peerDependencies` → `^4.0.0`; the dev pin is
already the `file:` tarball). `src/schemas/review.ts` — swap the three removed
mirror fields for core 4.0.0's eight new ones.
`src/engine/review/__tests__/evaluation.test.ts` — read
`survivingSupportingPremisesTrue`.

**Verify:** `pnpm run typecheck` is clean apart from the deliberate deletions in
task 2; `pnpm exec vitest run src/engine/review/__tests__/evaluation.test.ts`.

## Task 2 — Delete the collapsed grade

**Changes:** delete `verdictOf` (`overlay.ts`), `TConclusionVerdict`
(`types.ts`), `TReviewOverlay.grade`, the `gradeEvaluation` call in
`buildInlineReviewOverlay`, and the whole of
`src/engine/review/__tests__/verdict.test.ts` — it tests a function that no
longer exists and a core export that no longer ships. Delete
`expandPremiseToExpressions` and `backOutToPremiseLevel` from
`review-engine.ts` (no callers in either client).

**Verify:** `pnpm run typecheck` clean; `grep -rn "gradeEvaluation\|TCoreEvaluationGrade\|verdictOf" src/` empty.

## Task 3 — Fixtures for the new shapes

**Changes:** `src/engine/review/__tests__/fixtures.ts` — add builders for the
shapes every later task asserts against, so no task invents its own:

- `buildEngineWithNegatedConditional` — premise `¬(A → B)` plus a bare-`¬Q`
  premise, for the decision-target rule.
- `buildEngineWithRedundantSupport` — `A → C`, `B → C`, conclusion `C`.
- `buildEngineWithIrrelevantSupport` — the water-and-mammals shape:
  conclusion `W`, single supporting premise `M → W`.
- `buildEngineWithDerivationChain` — `P → Q`, `Q → R`, conclusion `R`, for the
  provenance assertion.
- `buildEngineWithRestrictionPremise` — premises `P → A`, `P → B` and
  restriction `¬(A ∧ B)` (the design's worked case: satisfiable, so a reader
  who assigns `P` true and grants both hits a resolvable collision).
- `buildEngineWithUnsatisfiablePremises` — `A`, `B`, restriction `¬(A ∧ B)`.
- `buildEngineWithUnreferencedClaimVariable` — a claim-bound variable no
  expression references, plus a `referenced` flag so the same builder produces
  the guard-against-over-narrowing variant.

**Verify:** each builder is exercised by a smoke assertion in
`fixtures.smoke.test.ts` (the file already exists for exactly this).

## Task 4 — Decision target: outermost decidable operator

**Changes:** `step-queue.ts` — `outermostDecidableOperator(premise)`;
`TOperatorQueueEntry` gains `expressionId`. `evaluation.ts` —
`buildExpressionAssignment` routes premise-scope decisions through
`expressionOverrides` on that one expression, never `premiseScope`.
`overlay.ts` — `buildReviewOverlay` paints the same single expression.

**Verify:** new tests in `step-queue.test.ts` (queue entry carries the target;
`¬(A → B)` yields the `implies`; bare `¬Q` is absent) and in
`evaluation.test.ts` (accepting `(A ∧ B) → C` yields exactly one operator
assignment, and evaluation leaves `A`/`B` unassigned). Criteria 1–2.

## Task 5 — The assessment composer

**Changes:** new `src/engine/review/assessment.ts` — `composeAssessment`, the
conclusion-axis statements, the argument-axis label table, the reason table,
the struck badge, and the restriction wording. Exported through the
`./engine/*` wildcard; no `package.json` change needed.

**Verify:** new `assessment.test.ts` — the redundant-support shape, the
water-and-mammals shape, the all-struck guard, the unsatisfiable case, plus a
vocabulary test asserting no exported string matches
`/prov(ed|en)|sound|valid|refut|denie|refus/i`. Criteria 3–5.

## Task 6 — Contradiction detection and prose

**Changes:** new `src/engine/review/contradiction.ts` —
`detectContradictions`, the per-operator commitment sentences, claim-title
resolution, derived-value provenance sentences, both exits,
and `reviewCoherence`.

**Verify:** new `contradiction.test.ts` — the accepted-false premise is
reported; the mirror rejection is not; the chain shape carries a provenance
sentence naming the producing premise and consumed claim titles; every finding
carries both exits with `counterexamples-exist`; the restriction premise reads
*decline*; the unsatisfiable set routes to `premises-contradict` without
blocking. Criteria 6–9, 11.

Riskiest task, deliberately placed after task 3 so its fixtures already exist
and after task 5 so the vocabulary rules are already pinned by a test.

## Task 7 — `blocked` and the completion precondition

**Changes:** `src/schemas/review.ts` `ReviewPhaseSchema` and
`src/schemas/model/review.ts` `ServerReviewPhase` gain `"blocked"`.
`review-engine.ts` — `runEvaluation` sets/clears `blocked` via
`reviewCoherence`; `computeSnapshot` treats `blocked` as a results step and
adds `assessment`, `contradictions`, `coherence`. `wire.ts` —
`isReviewComplete(draft)`.

**Verify:** new tests in `review-engine.test.ts` — an incoherent draft lands in
`blocked` and `isReviewComplete` is false; resolving and re-evaluating returns
`done`. Criterion 10.

## Task 8 — Claim-queue reachability: pin the behavior, record the cause

**Changes:** `step-queue.ts` — extend `buildClaimQueue`'s doc comment with what
the investigation established (reachability is already expression-level and
delegated to core; the reported extra step is derivation-only reachability and
is deliberately still offered, with the measurement that says why). No
behavioral change.

**Verify:** three tests in `step-queue.test.ts`, exactly the request's cases —
the unreferenced variable's claim is not queued; the same variable referenced
by one expression is; queue length equals the count of evaluation-relevant
authored claims. Criterion 12.

## Task 9 — Escalate the derivation-premise aggregate finding

**Changes:** `tcw work escalate` to `proposit-core` — a derivation premise for a
claim no authored premise references is counted in
`survivingSupportingPremisesTrue`, which is what makes the claim-queue
narrowing unsafe. Body carries the fixture and the measured before/after.

**Verify:** the inbox document exists at the root and names the reproduction.

## Task 10 — Documentation Sync

`proposit-shared/CLAUDE.md` has **no** Documentation Sync section (tracked
separately as `2026-08-03-agents-md-has-no-documentation-sync-section…`), so
there is no trigger table to walk. Invoke `tcw:documentation-sync` **once** over
the finished diff and answer whatever it raises against the repo's actual doc
set, which is:

- `docs/release-notes/upcoming.md` — user-facing: the two axes, the rejected
  badge, the blocked state, one decision per premise.
- `docs/changelogs/upcoming.md` — every added/removed/changed export.
- `CLAUDE.md` — the "Grammar rule-code coordination protocol" section describes
  the core→shared→consumers publish chain; check whether the peer-range widening
  to `^4.0.0` needs a note there.
- `docs/capabilities/**` — rewrite `reviews/see-the-argument-grade` and
  `reviews/decide-each-operator` per the spec's Capability changes.

Commit docs separately from code.

## Task 11 — Version, tag, tarball

`pnpm run check` green first. Then **`pnpm version minor`** — pre-1.0 policy in
`CLAUDE.md` says minor may carry breaking changes (semver §4), and every prior
breaking shared release took a minor. Rotate `upcoming.md` in both doc folders
to the new version and start fresh ones. Commit, `git tag v{version}`,
`pnpm run build && pnpm run pack:branch`. Merge to `main` locally; do not push,
do not publish. Remove any stray `*.tgz`.

## Verification the suite cannot check

- **Copy quality.** The vocabulary tests catch banned words, not tone. Read the
  composed strings once end to end, in second person, before cutting the
  version.
- **Consumer breakage is intended.** Do not run `proposit-server` or
  `proposit-mobile` gates; they are red by construction until slices C, D, E.
- **`blocked` cannot round-trip.** Nothing in this repo can prove it persists;
  that verification belongs to slice C.

## Notes

Every task is one commit. Task 9 touches the workspace root, not this repo, so
it commits there.
