# Outcome

Fixed in **v0.61.2**, tagged locally on branch `explain-review-result-explainer`
(shared with the explainer epic's slice; unrelated commits, same publish window).

## Diagnosis, verified rather than assumed

Reproduced against a real engine before touching the code. Two variables bound
to the conclusion claim, `implies(A, Q2)` accepted with `A` true and
`implies(Idle, Q1)` whose antecedent nothing settles:

```
propagatedValues: { vA: true, vIdle: null, vQ1: null, vQ2: true }
claimPropagated:  { cQ: null }          ← the chip
assessment:       conclusion "true", "reaches-conclusion"   ← the header
```

`vQ2` held the value; `vQ1` did not; first-wins selected `vQ1`. The reported
diagnosis was right.

One correction to it: `getVariables()` returns variables **ordered by id**, not
in insertion order — so "first-wins" means *lowest variable id*, which is why
the outcome looked like a coin flip. For the reported argument that selects
`019fbb25-df2a-…` (`P21`) over `019fbb25-df46-…`
(`MoralDutyExceedsHumanNature`).

## The rule

All variables bound to one claim denote the same proposition, so the claim's
displayed value resolves across **every** one of them. One `resolveClaimValue`
helper serves both read sites — the propagated chip value and the usage-based
default, which carried the same latent defect. No first-wins read of a claim's
variables remains in `src/engine/review/`; the map is now
`Map<string, string[]>`.

## Disagreement is reachable, and is not tie-broken

Confirmed empirically. `implies(A, Q2)` with `A` true puts `true` on one
variable; `implies(Q1, B)` with `B` false puts `false` on the other by modus
tollens. Core cannot see the contradiction — the two are independent variables
to it.

Such a claim resolves to unknown and its id is reported on the new optional
`TReviewOverlay.conflictedClaimIds`, so a client can show that the argument
asserts one proposition both ways rather than render whichever side an ordering
favoured. Pinned by `buildEngineWithContradictorilyBoundClaim`.

Note the negation route does *not* reach it: core does not back-propagate
through `not`, so `implies(A, ¬Q1)` leaves `vQ1` null.

## Core

`getVariableIdForClaim` has the same singular-by-construction contract, but no
consumer in shared, server or mobile calls it — what existed was shared's
reimplementation of the rule. Nothing is broken through it today, so it was
raised rather than changed:
`/Users/brian/Projects/Proposit-App/docs/work/inbox/2026-08-08-getvariableidforclaim-returns-one-variable-for-a-claim-that-binds-several.md`.

## Incidental

`docs/work/discarded/` was missing, which made `tcw` 0.18.2 report this repo as
having no work node at all. Created.

## Pending

Browser verification at `/view/019fbb25-deee-7347-9350-8a0dedc1cea5/2` — the
coordinator is driving it. `pnpm run check` green; nothing published, nothing
pushed. Tarball:
`proposit-shared-0.61.2-explain-review-result-explainer.tgz`.
