---
from: proposit-app
---

> Routed by the orchestrator on 2026-08-13.

# Carry the moderation hidden flag on the argument read response

## Problem

`proposit-shared/arguments/see-status-and-shape-while-reading` promises "A
version that moderation has hidden is marked as hidden, so you are never reading
withdrawn content without knowing it." Mobile can build the rest of that
capability (published/draft, premise and claim counts) but not the hidden
marker: no REST read tells a client that the version it is holding is hidden.

## Root cause

`ArgumentSchema` (`@proposit/shared/schemas/model/arguments`) declares no
`hidden` field, and the versioned read serializes strictly through it —
`createResponse(r, ArgumentSchema)` at
`proposit-server/src/app/api/v1/argument/[argumentId]/[version]/route.ts:78`. The
`arguments.hidden` column is selected by the model (`select("*")` in
`src/model/argument/shared.ts:138`) and then stripped on the way out.

`hidden` exists in `@proposit/shared` only as the response body of the
hide/unhide **mutations** (`SetArgumentHiddenResponseSchema`), which a reader
never calls.

Web does not have this problem because it reads the flag server-side:
`resolveArgumentViewGate` returns `gate.hidden`, passed down as the `isHidden`
prop (`src/app/view/[argumentId]/[version]/page.tsx:130`). That path is
Next-server-only and has no REST equivalent.

This is not an unreachable case on mobile. The route's `canReadHiddenState`
bypass lets a participant (and a moderator) read their own hidden version — they
just are not told it is hidden, which is exactly the "reading withdrawn content
without knowing it" the capability rules out.

## Proposed fix

Add `hidden: boolean` to the argument read response and let mobile render the
marker.

The route already computes visibility for this exact version — non-participants
get a 404 — so the flag is only ever `true` for a viewer entitled to see it, and
adding it discloses nothing new. Note `withoutBanMarker` strips the *mechanism*
by which a version was hidden; that should stay stripped, only the boolean is
wanted.

Shape is the shared node's call; the smallest version is a field on
`ArgumentSchema` itself, at the cost of every producer of a `TArgument` having to
supply it. An `ArgumentWithMetadata`-style extension on the read path only, or a
sibling field on the response envelope, avoids that.

## Consumer impact

- `proposit-server`: serialize the flag on the versioned GET (and the
  version-omitted GET if the shape is shared).
- `proposit-mobile`: unblocks the hidden marker on
  `see-status-and-shape-while-reading`, which stays `Missing` here until it
  lands. The rest of that capability is being built now; this is the last
  fragment, and it is one of the two entries still holding the mobile-parity
  epic open.
- Web is unaffected — it keeps reading the gate directly.

## Test cases

- A participant reading their own hidden version receives `hidden: true`.
- A participant reading a normal version receives `hidden: false`.
- A non-participant still receives 404 for a hidden version — no new disclosure.
- The ban-vs-moderation distinction remains invisible in the response.
