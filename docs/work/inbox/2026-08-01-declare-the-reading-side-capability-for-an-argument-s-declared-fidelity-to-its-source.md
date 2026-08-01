---
from: proposit-app
initiative: 2026-07-29-argument-origin-data-and-enthymeme-annotations
---

# Declare the reading-side capability for an argument's declared fidelity to its source

Epic: [Argument origin data and enthymeme annotations](tcw://W/proposit-app/2026-07-29-argument-origin-data-and-enthymeme-annotations)

Consolidates two independently-filed escalations describing the same gap — one
from `proposit-server`, one from `proposit-mobile`, raised in parallel while both
were fixing the same QA finding. They are merged here; neither should be adopted
separately.

**The shipped behaviour is already ahead of the ledger.** All three consumer
surfaces have landed the indicator; only the capability entry is missing.

## Problem

A QA pass found that a `representation` stance — the author's public claim that
an argument faithfully represents its source text — was visible **only to the
author**. It rendered inside the web app's authoring panel, which is gated on
edit permission, so no reader saw it on any argument, on any surface. All three
curated arguments carry `representation`.

The whole `seed` / `representation` split is meaningless if only the author knows
which one applies. It is also what makes an unanchored item interpretable to a
reader: under `representation` an unanchored claim is something the author
supplied on the source's behalf; under `seed` it means nothing in particular.

The user approved a reader-visible indicator, and all three surfaces have shipped
one:

| Surface | Renders |
|---|---|
| `proposit-server` web reading surface | "The author says this argument represents this text faithfully." |
| `proposit-mobile` source-text panel | "The author says this argument represents this text faithfully." |
| `@proposit/shared` markdown export | "The author says this argument represents that text faithfully." |

The wording is deliberately attributed to the author rather than stated flatly,
because nothing verifies the claim and a reader should not take it as
platform-verified. The export says *that* text rather than *this* because the
reader was handed the document separately; same attribution, same meaning.

Nothing is emitted for `seed` — the unremarkable default needs no badge.

## Why this belongs in the shared master

It is a cross-platform reading capability, and the master has no entry for it:

- `arguments/see-the-original-source-text` covers reading the text, not what the
  argument claims about it.
- `arguments/see-the-source-texts-citation` covers the attribution.
- `authoring/declare-the-sources-role` is the **authoring** half — declaring the
  stance. The reading half has no counterpart.

Both consumer repos' `AGENTS.md` require a cross-platform capability to be added
to the master first and realized locally as a status override, rather than
declared standalone on one node. Hence this escalation instead of three local
declarations.

## Proposed fix

Declare one entry under `arguments`, alongside `see-the-original-source-text`,
seeded `Status: Missing` as the master requires, with `Feature=argument-browse`
and the epic as its `Planning doc`. Suggested path and name — the wording is
yours to settle:

```
tcw capabilities add arguments/see-what-an-argument-claims-about-its-source \
  "See what an argument claims about its source text" --status Missing
```

The description should make clear that the reader learns the author's *claim*,
not a verified fact, and that its absence is not evidence of the opposite — a
reader seeing no line cannot distinguish "the author chose seed" from "no stance
recorded" from "the origin read failed".

## Consumer impact

Once the entry exists, `proposit-server` and `proposit-mobile` each override it
to `Supported`; `@proposit/shared` leaves it `Missing`, as it does for every
master entry. Until then all three carry shipped behaviour the ledger does not
describe, which `tcw capabilities check` does not catch.

## Test cases

- `tcw capabilities check` passes in all three repos after the entry exists and
  the two consumer overrides are added.
- The entry's description does not assert the claim is verified.
