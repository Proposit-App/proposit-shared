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
// Read-path only: `reasonCode` tolerates an unknown raw string so a stored code
// that has fallen out of the closed union (after a code removal) is carried for
// display rather than failing strict response validation. Writes stay strict via
// `ClaimReactionCreateRequest`.
export const ClaimReactionSelectionSchema = Type.Object({
    value: TrivalentValueSchema,
    reasonCode: Type.Union([ClaimReasonCodeSchema, Type.String()]),
})

// Public aggregate: one count per stance (value true / false / null).
export const ClaimReactionStanceCountsSchema = Type.Object({
    affirm: Type.Number(),
    disagree: Type.Number(),
    neutral: Type.Number(),
})

// The added reaction always echoes the row just upserted from the strict
// `ClaimReactionCreateRequest`, so its code is current-valid by construction —
// this response stays on the strict model.
export const ClaimReactionCreateResponse = Type.Object({
    addedReaction: ClaimReactionSchema,
})

export const ClaimReactionGetResponse = Type.Object({
    counts: ClaimReactionStanceCountsSchema,
    own: Nullable(ClaimReactionSelectionSchema),
})

// The removed reaction echoes a pre-existing persisted row that may reference a
// `reasonCode` since retired from the closed union. Loosen `reasonCode` to
// tolerate an unknown raw string so a delete of such a row is carried through
// for display rather than failing strict response validation — matching the
// read-path loosening on `ClaimReactionSelectionSchema`. The strict model
// `ClaimReactionSchema` is left intact elsewhere.
const RemovedReactionSchema = Type.Intersect([
    Type.Omit(ClaimReactionSchema, ["reasonCode"]),
    Type.Object({
        reasonCode: Type.Union([ClaimReasonCodeSchema, Type.String()]),
    }),
])

export const ClaimReactionDeleteResponse = Type.Object({
    removedReaction: RemovedReactionSchema,
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
