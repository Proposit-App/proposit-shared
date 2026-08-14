---
from: proposit-app
---

> Routed by the orchestrator on 2026-08-13.

# capability wording: what an argument row shows is described from mobile, and contradicts web

Route to `proposit-shared` — the master entry
`arguments/see-metadata-in-the-list` describes one app's row and contradicts the
other's. Wording, not behaviour; nothing is broken.

## Problem

The master body promises "title, version, published date, and reaction counts".
Two of those four are wrong for web, both because web ships something
deliberately different:

- **"reaction counts"** — web's row draws a two-tone support/counter split meter
  and shows **no** raw tallies. `proposit-server/src/components/client/arguments/argument-card.tsx:235-283`
  builds the meter; the comment at `:535-537` states the intent outright: "Vote
  tallies are intentionally not shown — the product signals support vs counter
  qualitatively (the split bar above), never as raw counts." Mobile shows
  "↑ n ↓ n".
- **"published date"** — web's row renders a *relative* `createdOn` marker, not a
  publication date (`argument-card.tsx:518-533`): "Cards carry a relative 'last
  active'-style marker rather than an absolute wall-clock timestamp".

The master body also omits two things web's row does carry: a published/draft
status chip and the topic tag.

Note the "reaction counts" divergence is not isolated. The sibling capability
`reviews/see-how-other-readers-decided` — declared on 2026-08-13 — states the
opposite rule explicitly: "an ordinary reader is never shown a count or a
percentage. Raw per-stance tallies are reserved for the argument's owner." So
the master currently promises reader-facing counts in one entry and forbids them
in another.

## Root cause

The entry predates the split-meter treatment and was written from the surface
that was in front of the author.

## Why this is escalated rather than overridden

`proposit-server` has taken a local `description.md` override that describes
web's row truthfully, so this node's ledger is honest today. But "does an
argument row show a reader a tally, or only a lean?" is a product decision that
should be settled once in the master, not answered differently by each node's
override. Two apps disagreeing about what a row shows is the question; the
override is only a holding position.

## Proposed fix

Decide which is intended, then either:

1. **Qualitative everywhere** (consistent with `see-how-other-readers-decided`):
   reword the master to say the row shows *which way readers are leaning*, drop
   "published date" in favour of a neutral recency wording, and add the status
   and topic signals. Mobile then has a real gap to close.
2. **Counts are fine on the list row**: keep the master wording, and web's
   deliberate omission becomes a divergence to record rather than a description
   error — in which case say so, since web's comments assert the opposite.

Either way the master should stop naming a specific date semantic.

## Consumer impact

None on behaviour. `proposit-server` drops its local `description.md` override
once the master wording lands; `proposit-mobile` is handling its own row
separately.
