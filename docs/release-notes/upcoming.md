# Release notes — upcoming

## Natural-key claim-reaction delete (breaking api-client change)

`deleteClaimReaction` no longer takes a `reactionId`. Because claim reactions are
single-select — a user has at most one reaction per claim-in-an-argument — the
row is fully identified by the path coordinates plus the session user. The
api-client method is now `deleteClaimReaction(argumentId, version, claimId)` and
targets the collection route
(`…/claim/{claimId}/reactions`, DELETE) instead of an id-keyed member route.
This removes the need for consumers to fetch the reaction id before clearing a
stance, eliminating an SSR loader hop and an optimistic-clear race. Pre-1.0, this
ships in a minor bump.
