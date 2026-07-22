# Changelog — upcoming

<changes starting-hash="9cf9062" ending-hash="HEAD">

## Fixed

- `engine/review/overlay.verdictOf` gates `"Valid and Sound"` and `"Vacuous"` on
  `evaluation.allSupportingPremisesTrue === true`, falling through to
  `"Indeterminate"` otherwise. The function previously read only
  `conclusionTrue`, so an argument with Unknown (or absent) supporting premises
  reported as sound. `undefined` is treated exactly as `null` — the field is
  `Type.Optional` in `TCoreArgumentEvaluationResultSchema`.
- Precedence is otherwise unchanged: `isCounterexample === true` →
  `"Logically Invalid"`, then `conclusionTrue === false` → `"Failing"`, then the
  premise gate.

## Changed

- `@proposit/proposit-core` peer/dev dependency raised to `^3.2.0`, which
  applies the matching gate in `gradeEvaluation` (the source of
  `buildInlineReviewOverlay`'s `grade`). The two functions are two views of one
  rule and are now asserted to agree.

## Added

- `src/engine/review/__tests__/verdict.test.ts`: table-driven coverage of every
  permutation of `allSupportingPremisesTrue` × `conclusionTrue` ×
  `isCounterexample` over `true` / `false` / `null` / `undefined`, crossed with
  vacuous and non-vacuous conclusions, asserting both `verdictOf`'s result and
  its agreement with core's `gradeEvaluation`.

## Notes

- No schema change. `TCoreArgumentEvaluationResultSchema` already declared
  `allSupportingPremisesTrue`; the value was already on the wire and persisted.
- No migration. Verdicts are derived at render time, not stored.

</changes>
