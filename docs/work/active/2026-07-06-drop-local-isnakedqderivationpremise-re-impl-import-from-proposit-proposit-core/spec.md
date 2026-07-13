# Spec

Drop the local re-implementation of `isNakedQDerivationPremise` in
`src/engine/review/evaluation.ts` and import the now-publicly-exported
predicate from `@proposit/proposit-core` instead.

Mechanical refactor, no behavior change. The local re-impl was verified
byte-for-byte behaviorally identical to core's exported version
(`type === "derivation"` guard + naked-Q tree-shape check). Call sites
(`toEvaluationContext`) keep working; the private local function and its
mirror comment are deleted.

Verification: `pnpm run check` green.
