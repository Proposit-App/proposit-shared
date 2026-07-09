# Plan

Small, purely-additive API-surface change. Two independent phases. No product
capability delta (library contract only), so no tcw-capabilities gate.

## Phase 1 — `image` on `GetCurrentUserResponse`

- `src/schemas/model/users.ts`: add `image: Nullable(Type.String())` to the
  `GetCurrentUserResponse` object (`Nullable`/`Type` already imported). Domain
  field `UserSchema.image` already exists; this only surfaces it on `/me`.

## Phase 2 — `getReaction` client method

- `src/api-client/argument/reactions.ts`: add `getReactionImpl(config,
  argumentId, version)` mirroring `getClaimReactionImpl` — GET
  `/api/v1/argument/{argumentId}/{version}/reactions`, parse against
  `ReactionGetResponse`.
- `src/api-client/factory.ts`: import `getReactionImpl`, register
  `getReaction` in the `impls` registry next to create/deleteReaction.

## Verify

- New test in `src/api-client/argument/__tests__/reactions.test.ts` asserting
  `getReaction` GETs the argument-level collection route and parses the array.
- `pnpm run check` green.
- Doc-sync: append to `docs/changelogs/upcoming.md` + `docs/release-notes/upcoming.md`.
- Do NOT publish / version-bump (orchestrator's consumer-gated step).
