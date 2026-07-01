# Changelog — upcoming

## Added

- New `./engine/premise-reading-order` entry point exporting
  `orderPremisesForReading(snapshot)` — a pure, display-only function returning an
  argument's premise ids in reading order: a pre-order depth-first traversal of
  the antecedent→consequent proof tree rooted at the conclusion, so a premise's
  support always follows it. Cycle-safe (visited set), deterministic
  (lexicographic-id tie-break and off-chain append), and polarity-aware (a
  rebuttal concluding `¬B` is not treated as a proof of antecedent `B`).

## Changed

- `buildTextTree` now emits premises in reading order (via
  `orderPremisesForReading`) instead of conclusion-first-then-id order, so a
  reader following the argument's antecedent→consequent structure scrolls up as
  little as possible — each premise's support sits directly below it. Web and
  mobile both render through `buildTextTree` and inherit the new order.
  Display-only (nothing persisted); derivation premises are still skipped.
