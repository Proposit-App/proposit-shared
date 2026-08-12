---
from: proposit-app
initiative: 2026-08-12-close-the-remaining-mobile-gaps-vs-the-web-app
---

> Escalated by `proposit-mobile`; routed by the orchestrator on 2026-08-12.

# Add a username lookup read method to the api-client factory

Route to: `proposit-shared`.

## Problem

Mobile cannot build a public (other-user) profile screen, because there is no
way to turn a `username` from a `proposit.app/profile/{username}` deep link into
a user. `@proposit/shared` 0.67.0 ships the schemas —
`UsernameSearchRequest` / `UsernameSearchResponse`
(`schemas/api/user/index.ts`) — but the api-client factory has no method that
calls `GET /api/v1/user/search`. Verified against mobile's installed copy:
`grep -rn "user/search\|UsernameSearch" node_modules/@proposit/shared/dist`
matches only the two schema declarations, never an `*Impl`.

## Root cause

The web app never needed the client method: `proposit-server`'s
`src/app/profile/[username]/page.tsx` calls the route directly from a Server
Component with `createUrlWithParameters` + `fetchServer` + `parseResponse`. Only
a client consumer needs it on the factory, and mobile is the first one.

## Proposed fix

Add `searchUsername(username: string)` to the api-client factory — a
`user/search.ts` `*Impl` registered in `factory.ts`, calling
`GET /api/v1/user/search?username=…` through `strictFetch` with the existing
`UsernameSearchRequest` / `UsernameSearchResponse` schemas. No new schema is
needed; this is an api-client-only gap.

The route already 404s an unresolvable handle
(`proposit-server/src/app/api/v1/user/search/route.ts`), so the coded-error path
needs no change either.

## Consumer impact

- `proposit-mobile`: unblocks the public profile screen and the
  `proposit.app/profile/{username}` deep link, i.e. the `deep-links/
  open-links-to-fork-relationships-individual-claims-or-user-profiles`
  capability. Tracked as `2026-08-12-build-the-public-profile-screen-and-route-
  its-deep-link` on the mobile node, blocked on this.
- `proposit-server`: none. Adopting the method on the web profile page is
  optional and behaviour-preserving.

The mobile consumer needs this in the **same publish window** as the epic's
other `@proposit/shared` slice (`getUnownedArguments`) — batching them costs one
window instead of two.

## Why not a local workaround

Mobile cannot substitute `getAllArguments({ username })`. When the handle does
not resolve, `proposit-server/src/app/api/v1/argument/route.ts:89-103` passes
`userId: undefined` into `getAllArguments`, which then returns the **whole**
public argument list rather than an empty one — so an unknown handle would
render every argument on the platform as that person's work. The list call
cannot distinguish "no such account" from "account with no published arguments"
either.

## Test cases

- `searchUsername("<known handle>")` resolves `{ userId, username, imageURI }`.
- An unknown handle surfaces the route's 404 as a non-`ok` result, not a throw.
- A handle needing URL encoding (curated personas contain spaces and a slash) is
  encoded once on the way out and matches the same account.
