# Expose profile image + getReaction on the api surface

Slice A of the cross-node epic **Mobile UI/UX polish (pre-next-feature)**. Unblocks
mobile #1 (avatar) and #2 (reaction hydration). Two independent phases:

## Phase 1 — `image` field on `GetCurrentUserResponse`

Add `image: Nullable(Type.String())` to `GetCurrentUserResponse`
(`src/schemas/model/users.ts:148-154`). The column + domain field already exist
(`UserSchema.image` at `:50`; `UserPublicFieldsSchema` already picks `image`) —
this only surfaces it on the `/me` response schema. `proposit-server`'s `/me`
handler type-checks against this new field (server slice consumes it).

## Phase 2 — `getReaction` client method

Add `getReactionImpl` to `src/api-client/argument/reactions.ts` and register
`getReaction` in `src/api-client/factory.ts`. Mirror the existing claim-reaction
sibling: `getClaimReactionImpl` + its `factory.ts:132-134` registration.
Response type is `ReactionGetResponse` from `src/schemas/api/reaction/index.ts`.
The server route already exists
(`GET /api/v1/argument/[argumentId]/[version]/reactions`) — this only adds the
client-side method. Today `reactions.ts` exports only `createReactionImpl`/
`deleteReactionImpl`, and `factory.ts:129-130` registers only create/delete.

## Verify / done

- `pnpm run check`.
- Add/extend a client-factory test asserting `getReaction` is wired.
- Doc-sync: changelog + release notes (upcoming/).
- **Do NOT self-publish** `@proposit/shared` — publish is the orchestrator's
  consumer-gated step (see workspace-root ORCHESTRATOR-AGENTS.md). Leave the
  version bump / publish to the root.
