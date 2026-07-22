# Accepted conjunctions must not force unknown claims true

## Problem

Viewing a published argument in which **every** claim reads `Unknown` still
grades the argument `Sound`. Reproduced on `proposit-server` at
`/view/019f19cb-cf9e-74cf-b775-77aec6dcf9cf/4` (Trial of Socrates: Crito): 25
claims, all chips `Unknown`, grade chip `Sound`.

Instrumenting `buildInlineReviewOverlay` on that page showed the evaluation
returning:

```
{ ok: true, isAdmissibleAssignment: true, allSupportingPremisesTrue: true,
  conclusionTrue: true, isCounterexample: false, nSupporting: 4 }
```

with every one of the 25 variables fed in as `null`.

## Root cause

`buildInlineReviewOverlay` marks **every** decidable operator accepted:

```ts
const premiseScope: Record<string, TCoreOperatorAssignment> = {}
for (const premise of argEngine.listPremises()) {
    premiseScope[premise.getId()] = "accepted"
}
const operatorAssignments = canonicalizeOperatorAssignments(
    toEvaluationContext(argEngine), { premiseScope, expressionOverrides: {} }
)
```

`canonicalizeOperatorAssignments` fans a premise-scope decision out to every
operator expression the premise holds — `and` and `or` included, not just the
root inference. Core's constraint propagator then reads an accepted `and` as an
assertion that the conjunction is *true*:

```
// A ∧ B accepted => all children must be true
for (const child of children) trySetChild(child, true)
```

So on `(A ∧ B ∧ C ∧ D) → Q`, accepting the `and` sets A..D — all unknown — to
`true`, and the accepted `implies` then propagates `Q = true`. Every supporting
premise comes out true and the argument grades `Sound` purely from the
scaffolding, with no reviewer input anywhere.

This is not a grading bug. Core's `gradeEvaluation` (3.2.0) and shared's
`verdictOf` (0.48.0) both already gate on `allSupportingPremisesTrue !== true`;
they are being handed a genuinely-true input manufactured by the overlay.

## Proposed fix

The inline overlay's blanket acceptance exists for one reason, stated in its own
comment: so **transitive grounding** lights up — a claim grounded by citations
should propagate truth to what it supports. That only needs the *inference*
connectives. Accepting `and`/`or` is not an inference claim at all; it is an
assertion about the truth of the operands, which the overlay has no basis to
make.

Restrict the synthetic acceptance to `implies` and `iff`:

```ts
const operatorAssignments: Record<string, TCoreOperatorAssignment> = {}
for (const premise of argEngine.listPremises()) {
    for (const e of premise.getDecidableOperatorExpressions()) {
        if (e.operator === "implies" || e.operator === "iff") {
            operatorAssignments[e.id] = "accepted"
        }
    }
}
```

`resolveValue` still evaluates `and`/`or` normally under Kleene logic, so a
conjunction of genuinely-true (citation-grounded, axiomatic) conjuncts still
resolves true and still drives the accepted `implies`. What stops is inventing
truth for unknown conjuncts.

Verified against the live page by patching the installed `dist`: the same
argument then evaluates `allSupportingPremisesTrue: null`, `conclusionTrue:
null`, and the grade chip renders **Indeterminate**.

## Scope

- `src/engine/review/overlay.ts` — `buildInlineReviewOverlay` only.
- The review wizard's real reviewer decisions are untouched: a reviewer who
  genuinely accepts a conjunction still asserts its conjuncts.
- Consumer impact: `proposit-server` and `proposit-mobile` both render the grade
  and per-claim propagated values from this overlay, so both pick the
  correction up on repin.

## Test cases

- A fixture with `(A ∧ B) → Q` and no reactions/overrides grades
  `indeterminate`, and neither A nor B propagates to `true`.
- Transitive grounding still works: with A and B reacted `true`, Q still
  propagates to `true` (the existing accepted-inference test must keep passing).
