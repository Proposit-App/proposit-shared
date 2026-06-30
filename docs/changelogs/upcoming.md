# Changelog — upcoming

## Changed

- **BREAKING (api-client):** `apiClient.deleteClaimReaction` is now natural-key —
  its signature dropped the trailing `reactionId`, so it is
  `deleteClaimReaction(argumentId, version, claimId)` and issues `DELETE` to the
  collection route
  `/api/v1/argument/{argumentId}/{version}/claim/{claimId}/reactions` (no
  `/{reactionId}` segment). Claim reactions are single-select
  (`UNIQUE(argumentId, argumentVersion, claimId, userId)`), so the path
  coordinates plus the session user fully address the row — the id was redundant
  and forced callers into an extra fetch + optimistic-clear race. Pre-1.0, this
  rides a minor bump.
