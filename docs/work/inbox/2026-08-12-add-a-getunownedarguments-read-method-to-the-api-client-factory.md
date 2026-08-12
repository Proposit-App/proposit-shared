---
from: proposit-app
---

# Add a getUnownedArguments read method to the api-client factory

> Escalated by `proposit-mobile` on 2026-07-30; routed here by the orchestrator on 2026-08-12. Original entry title: *api client read method for unowned arguments getunownedarguments shared*.

**Target node:** `proposit-shared` (api-client factory). No server work required
— the routes already exist.

## Problem

`proposit-mobile` cannot implement "claim an argument built from my external
post" (shared capability
`proposit-shared/arguments/claim-my-external-post-argument`, currently `Missing`).
The write path is reachable; the read path is not, so mobile has no way to show a
user which arguments are claimable.

## Root cause

`@proposit/shared` 0.54.0 exposes `claimUnownedArgument` (`claimUnownedArgumentImpl`
→ `POST /api/v1/argument/unowned/{argumentId}/{version}/take`) and declares
`UnownedArgumentSchema`, but there is **no** `getUnownedArguments` (or
`getUnownedArgument`) read method anywhere in the package.

The server side is already complete:

- `GET /api/v1/argument/unowned` — auth-scoped, `getVerifiedUserId` →
  `getUnownedArgumentsByUserId({ userId })`
- `GET` / `DELETE /api/v1/argument/unowned/[argumentId]/[version]`
- `POST /api/v1/argument/unowned/[argumentId]/[version]/take`

backed by `proposit-server/src/model/argument/unowned.ts` and the
`unownedArguments` table.

The web app already consumes the list route
(`proposit-server/src/app/profile/unowned-args-list.tsx`), so the shape is proven
— note it renders `TArgument[]`, i.e. the list route returns full arguments, not
`UnownedArgument` rows.

## Proposed fix

Add `getUnownedArguments` to the argument api-client (and the single-argument
read if it is cheap to include alongside), matching the response shape the web
component already relies on.

## Consumer impact

Unblocks mobile item
`2026-07-12-claim-an-argument-built-from-my-external-post`, which is now recorded
as blocked on this request. It would also let web drop any bespoke fetch it
currently does in favor of the shared client.

## Test cases

- Returns the signed-in user's claimable arguments; returns empty (not an error)
  when there are none.
- An unauthenticated caller is rejected.
- The returned shape matches what `unowned-args-list.tsx` renders today, so
  adopting the client is a no-op for web.

