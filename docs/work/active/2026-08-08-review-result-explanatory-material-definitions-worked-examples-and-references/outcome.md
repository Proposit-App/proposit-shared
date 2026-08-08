# Outcome

Shipped on branch `explain-review-result-explainer`, cut as **v0.61.0** (tagged
locally, not pushed, not published).

## What landed

`src/engine/review/explainer.ts`, reachable as
`@proposit/shared/engine/review/explainer`. Exports:

| Symbol | What it is |
| --- | --- |
| `TExampleValue`, `TExampleItem`, `TWorkedExample`, `TReference`, `TExplainer`, `TReferenceOnlyExplainer` | The data shapes an explainer is made of |
| `CONCLUSION_EXPLAINERS` | `Record<TConclusionValue, TExplainer>` — 3 keys |
| `TArgumentExplainerKey`, `ARGUMENT_EXPLAINERS` | 6 keys; `does-not-reach` composes with its reason |
| `argumentExplainerKey` | `TArgumentAssessment` → key |
| `CONCLUSION_ATTRIBUTION_EXPLANATIONS` | Keyed by the three statement constants themselves |
| `VACUOUS_INFERENCE_EXPLANATION` | `TReferenceOnlyExplainer` |
| `TCounterexampleRow`, `describeCounterexample` | A failing case, in claim titles |

`src/engine/review/__tests__/explainer.test.ts` — 42 assertions over the
invariants prose can break silently.

## Decisions worth recording

- **No `package.json` change.** The existing `./engine/*` pattern already maps
  `engine/review/explainer` with all three conditions (`types` / `import` /
  `default`) — it is how the server already resolves
  `@proposit/shared/engine/review/review-engine`. An explicit entry would have
  been a duplicate of the pattern that already works.
- **`describeCounterexample` takes `TCoreExpressionAssignment`, not a flat
  record.** `TCoreCounterexample["assignment"]` is
  `{ variables, operatorAssignments }`; the helper reads `.variables`. Taking a
  flat record would have pushed the unwrapping into both clients.
- **One module, not two.** The counterexample helper is the same "state the
  result in the reader's words" concern as the explainer tables and is ~15
  lines; a sibling file would have been a second import path for one function.

## Not in this slice

Rendering. Web draws these on the results stage, mobile from its assessment
chips — those are the clients' slices of the epic. The five `Missing`
capabilities under `docs/capabilities/reviews/results/` stay `Missing` until a
client actually surfaces the material.

## Follow-up: v0.61.1 — the example's framing copy

An external design review found the worked example is drawn with primitives
identical to the real argument, so past a small `EXAMPLE` label nothing tells a
reader the illustration is not their own work. The web had fixed it locally
(`proposit-server/src/components/client/review/assessment-explainer.tsx`);
mobile had no equivalent sentence and labelled its result line `Result:`, which
reads as *the reader's* result.

That is the failure this module exists to prevent — one client able to say
something the other cannot — so the three framing strings moved here:
`WORKED_EXAMPLE_HEADING`, `WORKED_EXAMPLE_DISCLAIMER` (the web's wording
verbatim) and `WORKED_EXAMPLE_RESULT_LABEL` (`"Result of this example:"`, the
web's, because the bare form is the confusion being fixed). They are named and
commented as chrome for a `TWorkedExample` rather than more of its content: a
label a reader can mistake for their own result is a correctness problem, not a
styling one.

No definition, example or reference changed. Tests extended to pin all three
non-empty and to pin that the disclaimer says plainly the example is not the
reader's own work.

## Publish state

`proposit-shared-0.61.1-explain-review-result-explainer.tgz` built in the
package root (the 0.61.0 tarball was removed — a stray `.tgz` makes a later
`pnpm publish` fail with EUSAGE). Rides the existing unpublished core-4.0.0 / shared-0.60.x window
per the epic spec — nothing published, nothing pushed.

## Follow-up: v0.62.0 — the tenth entry, and one concept instead of two

Core gained a fourth truth value. Its constraint closure was nondeterministic
when two accepted steps drove one variable to opposite values, and the product
decision was explicitly *not* to resolve that to unknown — "it's not that the
value is unknown, it's that the user is saying it is both true and false" — so
core now implements Belnap's four-valued logic, with `CONTESTED` reachable only
by evaluation and never by assignment.

This module had already invented the same concept, in `resolveClaimValue`, for a
different cause: two variables bound to one claim carrying opposite values. It
resolved to unknown and reported the fact on `conflictedClaimIds` — the
resolution the product owner rejected, arrived at independently. The two are now
one value. `conflictedClaimIds` is deleted rather than kept as a derived
convenience: it is a one-line filter over `claimPropagatedValues`, and its
existence *was* the second vocabulary.

The tenth `CONCLUSION_EXPLAINERS` entry follows the nine in voice and structure.
Its definition carries the two loads the value exists for: contested is the
opposite of unknown rather than a shade of it, and it is always the reader's to
resolve, because both halves came from them. Further reading points at
four-valued logic, paraconsistent logic and the bilattice — a curious reader now
has somewhere real to go.

The dangerous edits were the ones the compiler could not flag:
`conclusionValueOf`'s fall-through to `"unknown"` (the exact outcome the product
decision rejected), `detectContradictions`' `rootValue !== false` (which would
have silently stopped blocking reviews it used to block, because a colliding
chain now comes out contested rather than false), `describeCounterexample`'s
truthiness test (contested is a truthy string), `provenanceSentences`' `origin
!== "derived"` skip, and the evaluation-result schema mirror — where a rejected
decode makes the review store drop the whole stored review as corrupt.

The argument axis is unchanged, deliberately and on the record: `premises-
contradict` is about the premise set alone and a contested conclusion can arise
over a perfectly consistent one.

## Publish state

`proposit-shared-0.62.0-explain-review-result-explainer.tgz` built in the package
root (the 0.61.2 tarball was removed — a stray `.tgz` makes a later
`pnpm publish` fail with EUSAGE). Still riding the unpublished core-4.0.0 window;
nothing published, nothing pushed.
