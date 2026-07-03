# Changelog — upcoming

## Added

- New `src/engine/argument-metrics.ts` module: `computeCitationStrength` (argument-wide
  citation coverage ratio) and `detectEnthymemeWarnings` (flags freeform `implies` premises
  whose antecedent is a single claim rather than an explicit conjunction of two or more).
  `computeArgumentMetrics` combines both. Also exports the `getClaimProofState` /
  `consequentClaimIds` building blocks the metrics are built on. Purely additive — no
  existing exports change shape.
