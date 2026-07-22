# Changelog — upcoming

- `buildInlineReviewOverlay` no longer marks every decidable operator
  `accepted`. Blanket acceptance fanned out through
  `canonicalizeOperatorAssignments` to `and`/`or` nodes, and core's constraint
  propagator reads an accepted `and` as an assertion that every conjunct is
  true — so `(A ∧ B) → Q` with an all-unknown assignment propagated `true` to A,
  B and Q, yielding `allSupportingPremisesTrue: true` and a `sound` grade with
  no reviewer input at all. Only `implies`/`iff` are accepted now; `and`/`or`
  resolve under normal Kleene logic, preserving transitive grounding from
  genuinely-true conjuncts. Fixture `buildEngineWithConjunctiveAntecedent` plus
  two regression tests in `inline-overlay.test.ts`.
