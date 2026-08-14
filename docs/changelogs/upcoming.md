# Changelog — upcoming

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

