# Spec

## The rule

All variables bound to one claim denote the same proposition, so a claim's
displayed value reflects **any** of them that is settled, not whichever the
enumeration reaches first. Applies to both places the overlay reads that map:
the propagated value on the chip, and the usage-based default behind a claim the
reader has not touched.

Two settled values that disagree are not tie-broken. That state means the
argument asserts one proposition both ways; the claim resolves to unknown and is
named on the overlay so a client can show it.

## Done when

- A claim whose second-ordered bound variable carries the propagated value shows
  that value on its chip. Regression test with a fixture built for the shape,
  written before the fix.
- The disagreement case is pinned by its own test, with a fixture that reaches
  it (modus ponens onto one variable, modus tollens onto the other).
- No remaining first-wins read of a claim's variables anywhere in
  `src/engine/review/`.
- `pnpm run check` green.

## Out

Core's `getVariableIdForClaim`, which has the same singular-by-construction
contract. Nothing in shared, server or mobile calls it, so nothing is broken
through it today — raised with core rather than changed here.
