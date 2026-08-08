# Spec

Scope of this slice: the shared-side data only. Rendering is each client's slice.
The epic spec is the design of record — see `initial-request.md` for its path;
this does not restate it.

## Surface

New module `src/engine/review/explainer.ts`, reachable as
`@proposit/shared/engine/review/explainer` (the existing `./engine/*` wildcard in
`package.json` already declares `types` / `import` / `default` for it).

Types: `TExampleValue`, `TExampleItem`, `TWorkedExample`, `TReference`,
`TExplainer`, `TReferenceOnlyExplainer`, `TArgumentExplainerKey`,
`TCounterexampleRow`.

Data:

- `CONCLUSION_EXPLAINERS: Record<TConclusionValue, TExplainer>` — 3 keys.
- `ARGUMENT_EXPLAINERS: Record<TArgumentExplainerKey, TExplainer>` — 6 keys:
  `reaches-conclusion`, `premises-contradict`, and
  `does-not-reach:<reason>` for each of the four reasons.
- `CONCLUSION_ATTRIBUTION_EXPLANATIONS: Record<string, string>` — built with the
  three exported statement constants from `assessment.ts` as computed keys, so
  it cannot drift from the labels it explains.
- `VACUOUS_INFERENCE_EXPLANATION: TReferenceOnlyExplainer`.

Functions:

- `argumentExplainerKey(argument: TArgumentAssessment): TArgumentExplainerKey`.
- `describeCounterexample(assignment, titleByVariableId): TCounterexampleRow[]`.

## Constraints

- No markup, no React, no platform globals — structured data only.
- Every explainer key is derived from the `assessment.ts` unions, never a
  parallel string list.
- Definitions carry none of the deleted grade vocabulary
  (`sound`/`unsound`/`vacuously true`/`inadmissible`/`indeterminate`), and
  allocate no fault.
- `describeCounterexample` skips variables it has no title for rather than
  emitting an id, and sorts by title so two runs read the same.

## Done when

`pnpm run check` is green with `src/engine/review/__tests__/explainer.test.ts`
pinning: key coverage over all outcome × reason shapes, non-empty definitions,
`https://` references, example shape (exactly one conclusion item, first),
absent grade vocabulary, attribution-key identity, and counterexample mapping.
