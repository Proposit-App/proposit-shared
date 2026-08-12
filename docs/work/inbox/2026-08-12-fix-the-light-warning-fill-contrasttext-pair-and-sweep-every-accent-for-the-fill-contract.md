---
from: proposit-app
---

# Fix the light warning fill/contrastText pair and sweep every accent for the fill contract

> Escalated by `proposit-server` on 2026-08-08; routed here by the orchestrator on 2026-08-12. Original entry title: *filled warning chips fail aa warning contrasttext on warning main is 3 22 1 in light*.

## Problem

The shared light palette's `warning` fill and its `contrastText` do not clear
the AA floor when used together, which is the one way a fill token is *meant*
to be used. Measured at **3.22:1** against a 4.5:1 requirement for normal text.
Dark mode passes, so this is invisible to anyone developing in dark.

Found during a code review of `proposit-server`'s review-results work. It is not
specific to that work, and it is not the server's to fix: the pairing is a
property of the tokens.

## Blast radius

Roughly **13 sites app-wide** in `proposit-server` alone — every filled
`warning` chip and any surface putting `warning.contrastText` on `warning.main`.
`proposit-mobile` consumes the same tokens and is not audited here.

The server is deliberately **not** working around it. One site that would
otherwise have become a fourteenth (`ArgumentOutcomeChip`'s `does-not-reach`
outcome) is drawn outlined instead, so it lands on `warning.asText` via the
theme's routing rather than on the fill.

## Root cause, and the reason it was never caught

`proposit-server/src/ui/__tests__/tokens.test.ts` measures **`asText`-on-
background** pairs and asserts each admitted accent clears AA against every
background it can land on. It never measures a **fill / `contrastText`** pair.
That is the blind spot: the token set has two distinct contrast contracts and
only one of them is under test.

Every accent has the same exposure — `warning` is simply the one that failed.

## Proposed fix

1. Adjust the light-mode `warning` pair in `@proposit/shared/ui` until
   `contrastText` on `main` clears 4.5:1. Either darken the fill or take
   `contrastText` to the opposite end; the choice is the palette's to make.
2. Add a fill/`contrastText` sweep to the shared token tests, over **every**
   accent (`primary`, `warning`, `success`, `info`, `error`) and **both**
   schemes, so an accent cannot ship a fill its own contrast text cannot sit on.
   Shaping it as a `Record` keyed by accent — the way the existing `asText` walk
   is — makes omitting one a compile error rather than a silent gap.

## Consumer impact

- `proposit-server`: the ~13 filled-warning sites become legible without any
  server change; a shared minor + repin is all that is needed. The server's
  local mirror `src/ui/proposit-palette.css` must be resynced with the new
  values in the same change.
- `proposit-mobile`: same tokens, same fix, no client change expected.

## Test cases

- `contrastRatio(warning.contrastText, warning.main)` ≥ 4.5 in **light**
  (currently 3.22) and in dark (currently passing).
- The same assertion for every other accent, both schemes.
- The existing `asText`-on-background assertions keep passing — the fix must not
  be made by moving `warningAsText`, which is a different pair with a different
  job.

