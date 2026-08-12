# Expose the premise operator-reaction route through the api-client factory

Epic: [Close the remaining mobile gaps vs the web app](tcw://W/proposit-app/2026-08-12-close-the-remaining-mobile-gaps-vs-the-web-app)

Escalated by `proposit-mobile`, routed by the orchestrator on 2026-08-12.

## Inbox contents

## Inbox manifest

- `2026-08-12-expose-the-premise-operator-reaction-route-through-the-api-client-factory.md`

## Inbox body

---
from: proposit-app
initiative: 2026-08-12-close-the-remaining-mobile-gaps-vs-the-web-app
---

> Escalated by `proposit-mobile`; routed by the orchestrator on 2026-08-12.

# Expose the premise operator-reaction route through the api-client factory

Route to `proposit-shared`. No server work is implied — the route already exists
and already serves the web app.

## Problem

`proposit-shared/reviews/decide-a-premise-while-reading` is `Supported` on web
and cannot be built on mobile. Mobile has the premise header, the operator queue
(`buildOperatorQueue` → `TOperatorQueueEntry.rejectable`) and the reason
vocabulary (`getOperatorReasonsForDecision`) already — all from
`@proposit/shared`. What it has no way to reach is the store the decision goes
into.

## Root cause

On the reading surface the decision is an **operator reaction**, not a
review-draft assignment. The capability's own description says so: "This is the
premise counterpart of setting a claim's assignment by reacting." Web routes it
through `useOperatorReactionsOrNull()` →
`POST/DELETE /api/v1/argument/{argumentId}/{version}/premise/{premiseId}/reactions`.

Two things about that route are server-local:

- Its request/response schemas live in the route folder
  (`proposit-server/src/app/api/v1/argument/[argumentId]/[version]/premise/[premiseId]/reactions/schemas.ts`),
  not in `@proposit/shared/schemas/api/`.
- `@proposit/shared`'s api-client factory exposes no method for it. Verified
  against `@proposit/shared@0.67.0` `dist/api-client/factory.d.ts`: there are
  `createReaction` / `getReaction` / `deleteReaction` (argument-level) and
  `createClaimReaction` / `deleteClaimReaction` / `getClaimReaction` /
  `getClaimReactionMap`, and nothing for a premise operator reaction.

Mobile's `AGENTS.md` forbids both available workarounds: a raw `fetch` (every
internal call goes through the shared factory with a mobile `fetchImpl`), and
re-declaring the schemas locally.

## Proposed fix

Mirror the claim-reaction shape one level down:

- `@proposit/shared/schemas/api/operator-reaction` — request/response bodies
  matching what the route already serves, moved from the server route folder so
  both clients read one contract.
- api-client factory methods: create, delete, and a per-argument bulk map read
  (`getOperatorReactionMap`) so a reading surface can seed every premise header in
  one request, the way `getClaimReactionMap` already does for claims.

The response shape must match what web's operator-reactions context renders
today (`{ counts: { accept, reject }, own }` per premise), so adopting the client
is a no-op for web.

## Consumer impact

- **web** — none if the shape is preserved; the local schemas are deleted and the
  context calls the factory instead of `strictFetch`.
- **mobile** — unblocks `decide-a-premise-while-reading`, which is recorded as an
  asserted `Missing` naming this gap until the method exists and mobile is
  repinned.

## Test cases

- A premise decision made on the reading surface survives a reload.
- A decision on the same premise from the wizard and from the header do not
  double-record — the reaction store and the review draft stay independent
  (the one-way write invariant).
- The bulk map returns an entry only for premises somebody has decided.
- A premise the operator queue marks non-rejectable accepts an accept and refuses
  a reject.
