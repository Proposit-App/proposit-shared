import { Type, type Static } from "typebox"
import { Nullable } from "../../common.js"
import { ClaimReactionSchema } from "../../model.js"
import { TrivalentValueSchema, ClaimReasonCodeSchema } from "../../review.js"

// The argument/version/claim ids come from the route path, not the body.
// Single-select, so there is no `reactionsToRemove`: changing stance/reason is
// an upsert of the one row, clearing it is a DELETE.
export const ClaimReactionCreateRequest = Type.Object({
    value: TrivalentValueSchema,
    reasonCode: ClaimReasonCodeSchema,
})

// The caller's own current selection on a claim (identity-free).
export const ClaimReactionSelectionSchema = Type.Object({
    value: TrivalentValueSchema,
    reasonCode: ClaimReasonCodeSchema,
})

// Public aggregate: one count per stance (value true / false / null).
export const ClaimReactionStanceCountsSchema = Type.Object({
    affirm: Type.Number(),
    disagree: Type.Number(),
    neutral: Type.Number(),
})

export const ClaimReactionCreateResponse = Type.Object({
    addedReaction: ClaimReactionSchema,
})

export const ClaimReactionGetResponse = Type.Object({
    counts: ClaimReactionStanceCountsSchema,
    own: Nullable(ClaimReactionSelectionSchema),
})

export const ClaimReactionDeleteResponse = Type.Object({
    removedReaction: ClaimReactionSchema,
})

// Bulk read for one argument version: every claim's public counts plus the
// caller's own selection, keyed by `claimId`. Reuses the single-claim GET shape
// as the map value.
export const ClaimReactionMapResponse = Type.Record(
    Type.String(),
    ClaimReactionGetResponse
)

export type TClaimReactionCreateRequest = Static<
    typeof ClaimReactionCreateRequest
>
export type TClaimReactionSelection = Static<
    typeof ClaimReactionSelectionSchema
>
export type TClaimReactionStanceCounts = Static<
    typeof ClaimReactionStanceCountsSchema
>
export type TClaimReactionCreateResponse = Static<
    typeof ClaimReactionCreateResponse
>
export type TClaimReactionGetResponse = Static<typeof ClaimReactionGetResponse>
export type TClaimReactionDeleteResponse = Static<
    typeof ClaimReactionDeleteResponse
>
export type TClaimReactionMapResponse = Static<typeof ClaimReactionMapResponse>
