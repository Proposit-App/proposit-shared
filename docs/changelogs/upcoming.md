# Changelog — upcoming

## Fixed

**`buildOperatorQueue` now offers constraint premises.** It sourced its
premises from `listSupportingPremises()` plus the conclusion premise, and that
list filters on `isInference()` — so a premise whose root expression is `and`,
`or`, or `not` was dropped before either of the queue's own gates ran, and the
reader was never asked to decide it. The queue now walks the engine's full
premise sequence, supporting then conclusion then everything else, which is the
sequence `collectArgumentReferencedClaims` already walks for the claim queue.

Everything downstream was already built for these premises and could not reach
them: the evaluator strikes a rejected constraint and reports it as a declined
one, `detectContradictions` lists `constraintPremises` as candidates but gates
on the premise having been accepted, and both consuming apps already render
"Granted"/"Declined" off `isConstraint()`. The contradiction alert's "Decline
this constraint" exit was unreachable in practice for exactly this reason.

Both gates keep their meaning. `type === "derivation"` is now the only thing
excluding a naked-Q derivation premise — its bare-variable root used to keep it
out of the supporting list, and it now arrives among the constraints instead.

## Changed

**`scripts/first-time-setup.sh` gates on `pnpm run check`, not `pnpm run
build`.** The build-only gate was a workaround for a suite flake — an unhandled
rejection escaping the review store's debounced persist — that was fixed some
time ago, and the script had gone on describing a constraint that no longer
existed while telling the reader to run `check` by hand afterwards. `check` ends
in `build`, so `dist/` is still written; it costs about 37 seconds more on an
installed checkout, less than the `pnpm install` it follows. The closing message
no longer instructs the reader to repeat a step the script already ran.

## Removed

**The two dark argument metrics in `@proposit/shared/engine/argument-metrics`.**
Gone: `computeCitationStrength` and `TCitationStrengthMetric`,
`detectEnthymemeWarnings` and `TEnthymemeWarning`, and the
`computeArgumentMetrics` / `TArgumentMetrics` rollup that existed only to
combine the two. All shipped in 0.33.0 and neither app ever imported one —
confirmed by grep across `proposit-core`, `proposit-server`, and
`proposit-mobile` before removal — so this is a breaking change to the export
surface that no consumer has to answer. The rollup goes rather than shrinking:
with both fields removed it returns an empty object.

`detectEnthymemeWarnings` also had to go for a reason beyond disuse. It flagged
a premise as enthymematic from structure alone (`P implies Q` with fewer than
two antecedent conjuncts), while the platform's `enthymeme` marker is an
authorial declaration — the registered vocabulary reads "declared, never
derived". One word named two contradictory things in the same dependency tree,
and the derived one was the impostor.

**Kept in the module:** `getClaimProofState` and `TClaimProofState`, which the
mobile app imports from `@proposit/shared/engine/argument-metrics`, and
`consequentClaimIds`, which is separately exported and tested. Both private
helpers (`unwrapFormulaLayer`, `childrenByPosition`) are still reached by
`consequentClaimIds`.
