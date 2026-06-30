# Changelog — upcoming

## Added

- `ClaimReactionSchema` (+ `TClaimReaction`, `TClaimReactionSafe`) exported from
  `@proposit/shared/schemas` — the wire shape of a per-claim quick-reaction:
  `{ id, argumentId, argumentVersion, claimId, claimVersion, value, reasonCode, userId, createdOn }`.
  Both `value` (`TrivalentValue`) and `reasonCode` (`ClaimReasonCode`) are required and reuse the
  review vocabulary; `TClaimReactionSafe` is the identity-stripped (`userId`/`createdOn` omitted) shape.
- New `@proposit/shared/schemas/api/claim-reaction` subpath with the claim-reaction request/response
  bodies: `ClaimReactionCreateRequest` (`{ value, reasonCode }`), `ClaimReactionCreateResponse`
  (`{ addedReaction }`), `ClaimReactionGetResponse` (per-stance counts `{ affirm, disagree, neutral }`
  plus the caller's own `{ value, reasonCode } | null`), and `ClaimReactionDeleteResponse`
  (`{ removedReaction }`), each with its `T…` type. Single-select: no `reactionsToRemove`.
- `apiClient.createClaimReaction(argumentId, version, claimId, { value, reasonCode })` and
  `apiClient.deleteClaimReaction(argumentId, version, claimId, reactionId)` on the api-client factory —
  POST/DELETE the nested `/api/v1/argument/[id]/[version]/claim/[claimId]/reactions` route.
- `getStanceForClaimReason(code): TTrivalentValue` in `@proposit/shared/engine/review/reasons` — the
  reverse of `getClaimReasonsForValue` (true-bucket → true, false-bucket → false, otherwise null), for
  validating that a submitted reason matches its stance.
