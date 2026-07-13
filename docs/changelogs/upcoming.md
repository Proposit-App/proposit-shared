# Changelog — upcoming

<!-- Add changelog entries here -->

## Changed

- `toEvaluationContext` (`src/engine/review/evaluation.ts`) now imports
  `isNakedQDerivationPremise` from `@proposit/proposit-core` instead of carrying
  a local re-implementation. Core exports the predicate publicly as of 2.4.3;
  the dropped local copy was behaviorally identical (derivation-type guard plus
  naked-Q tree-shape check). Internal refactor, no behavior change.
