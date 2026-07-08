# X variant on TMobileSessionRequest

Slice 1 of the cross-node epic "Sign in with X (Twitter) on mobile". This is the
schema slice — it unblocks the server and mobile slices.

## Problem

`TMobileSessionRequest` (`src/schemas/api/auth/index.ts`) is currently a flat
`{ provider: "google" | "apple", idToken: string }`. Mobile X sign-in uses X
OAuth 2.0 (PKCE), which yields an **access token, not an ID token** — so the X
request cannot reuse the `idToken` field.

## Change

Convert `TMobileSessionRequest` into a discriminated union on `provider`:

- `{ provider: "google" | "apple", idToken: string }` — unchanged.
- `{ provider: "x", accessToken: string }` — new member (no `idToken`).

Do **not** overload `idToken` for X. Use TypeBox `Type.Union` of the two object
shapes so the derived TS type discriminates on `provider`.

## Tests (`src/schemas/api/auth/__tests__/index.test.ts`)

- Accepts `{ provider: "x", accessToken: "..." }`.
- Rejects an X request missing `accessToken`.
- The existing `provider: "twitter"` reject case: note the wire literal is `"x"`,
  not `"twitter"` (the stored provider identity is `twitter`, but the mobile
  request discriminator is `"x"` — keep them distinct). Adjust/replace that test
  accordingly.
- Still accepts google/apple with `idToken`.

## Consumer impact

Additive union member — non-breaking for existing google/apple callers. Ship as a
**minor** bump (`@proposit/shared`), update changelog + release notes. Do **not**
publish (publish is orchestrator-gated on consumer-side validation).

Full epic context: root node `docs/work/active/2026-07-08-sign-in-with-x-twitter-on-mobile/`
(`spec.md`, `plan.md`).
