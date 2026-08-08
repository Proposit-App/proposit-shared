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

## Publish state

`proposit-shared-0.61.0-explain-review-result-explainer.tgz` built in the
package root. Rides the existing unpublished core-4.0.0 / shared-0.60.x window
per the epic spec — nothing published, nothing pushed.
