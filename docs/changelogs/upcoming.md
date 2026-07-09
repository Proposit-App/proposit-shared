# Changelog — upcoming

## Added

- `image` field on `GetCurrentUserResponse` (`src/schemas/model/users.ts`):
  `Nullable(Type.String())` — surfaces the caller's profile image URL on the
  `GET /api/v1/user/me` read. Domain field `UserSchema.image` already existed;
  this exposes it on the `/me` response.
- `getReaction(argumentId, version)` on the api-client factory:
  `GET /api/v1/argument/{argumentId}/{version}/reactions`, validated against
  `ReactionGetResponse` (array of `ReactionSchema`). Mirrors the existing
  claim-reaction read.

Purely additive. `image` requires the server `GET /api/v1/user/me` handler to
populate it (proposit-server change lands in lockstep).
