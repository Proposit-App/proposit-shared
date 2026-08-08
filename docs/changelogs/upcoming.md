# Changelog — upcoming

<changes starting-hash="41fc35c" ending-hash="HEAD">

## Added

- **`@proposit/shared/engine/review/explainer`** — the explanatory material for
  the vocabulary `./engine/review/assessment` reports with, authored as data so
  web and mobile render one set of definitions rather than two. No markup: an
  explainer is a definition string, a flat depth-tagged worked example
  (`TExampleItem[]`, claim cards and operator labels with true/false/unknown
  pills), and a further-reading list, which each client draws with its own
  primitives.

- `CONCLUSION_EXPLAINERS: Record<TConclusionValue, TExplainer>` — three entries,
  one per conclusion value.

- `ARGUMENT_EXPLAINERS: Record<TArgumentExplainerKey, TExplainer>` — six
  entries. `TArgumentExplainerKey` is the outcome, except that `does-not-reach`
  composes with its reason (`` `does-not-reach:${TArgumentReason}` ``), because
  the bare outcome says almost nothing without one. `argumentExplainerKey`
  resolves a `TArgumentAssessment` to its key, falling back to
  `not-enough-settled` for a reasonless `does-not-reach` that `composeArgument`
  cannot currently produce.

- `CONCLUSION_ATTRIBUTION_EXPLANATIONS` — what each attribution statement means,
  built with `CONCLUSION_ASSERTED_STATEMENT`, `CONCLUSION_REACHED_STATEMENT` and
  `CONCLUSION_ONLY_ASSERTED_STATEMENT` as computed keys so the explanations
  cannot drift from the labels they explain.

- `VACUOUS_INFERENCE_EXPLANATION` (`TReferenceOnlyExplainer`) — the note for a
  step that is satisfied but passes nothing on.

- `describeCounterexample(assignment, titleByVariableId)` — turns a
  `TCoreCounterexample["assignment"]` (a `TCoreExpressionAssignment`) into
  `TCounterexampleRow[]`: claim title plus `TConclusionValue`. Variables with no
  title are dropped rather than shown as ids, and rows sort by title so two runs
  of the same check read identically.

- `src/engine/review/__tests__/explainer.test.ts` pins what prose can break
  silently: key coverage over every outcome × reason shape, non-empty
  definitions, `https://` references, exactly one conclusion item and it first,
  the absence of the retired grade vocabulary from every definition, the
  attribution keys' identity with the statement constants, and
  `describeCounterexample`'s mapping/skipping/sorting.

No `package.json` change was needed: the existing `./engine/*` pattern already
declares `types` / `import` / `default` for the new subpath.

## Changed

- Reformatted the `docs/capabilities/reviews/results/**` metadata, which had
  landed unformatted and was failing `prettify:check`.

</changes>
