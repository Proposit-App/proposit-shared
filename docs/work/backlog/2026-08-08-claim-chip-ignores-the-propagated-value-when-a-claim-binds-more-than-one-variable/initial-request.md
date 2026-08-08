# Initial request

## Symptom

On a review where every claim is assigned True except the conclusion, and every
premise accepted, the conclusion claim's chip reads a bare `Unknown` while the
header for the same review reads `True` / `Reaches its conclusion`. Reported at
`/view/019fbb25-deee-7347-9350-8a0dedc1cea5/2`.

The capability `reviews/see-each-claims-assignment` (`cap-ac74f5`, `Supported`)
promises the opposite: *"a claim that starts unknown but is transitively
grounded shows its propagated 'unknown → true' state on the chip"*.

## Cause

`buildInlineReviewOverlay` (`src/engine/review/overlay.ts`) keys a claim's
displayed value off the **first** variable it finds bound to that claim. A
persisted claim binds more than one — an authored variable plus the
engine-synthesized derivation one — and `getVariables()` returns them ordered by
id, so which one wins is unrelated to which one carries the value. The
conclusion is the claim that fails because every other claim here was assigned
by the reader, which puts the value on both of its variables and makes the
display right by accident.

Confirmed in the database for the reported argument's conclusion claim:

```
019fbb25-df46-77f1-be66-51ee3e2abe02 | MoralDutyExceedsHumanNature | Moral duty exceeds human nature
019fbb25-df2a-77be-a456-808b25cdf24e | P21                         | Moral duty exceeds human nature
```

## Not a regression from current work

`adc7e2f`, 2026-07-21, shipped in v0.46.0 — weeks before the review-verdicts and
explainer epics. `git log v0.60.2..HEAD -- src/engine/review/overlay.ts` is
empty; neither epic touched this file.
