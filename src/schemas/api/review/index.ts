import { Type, type Static } from "typebox"
import { UUID } from "../../common.js"
import {
    ReviewerInfo,
    ServerReview,
    ServerClaimAssignment,
    ServerOperatorAssignment,
    ServerReviewPhase,
} from "../../model/review.js"

export const ReviewGetResponse = Type.Object({
    review: ServerReview,
    reviewer: Type.Optional(ReviewerInfo),
})
export type TReviewGetResponse = Static<typeof ReviewGetResponse>

export const ReviewGetNotFoundResponse = Type.Object({
    error: Type.Literal("not_found"),
})
export type TReviewGetNotFoundResponse = Static<
    typeof ReviewGetNotFoundResponse
>

export const ReviewCreateRequest = Type.Object({})
export type TReviewCreateRequest = Static<typeof ReviewCreateRequest>

export const ReviewCreateResponse = Type.Object({ review: ServerReview })
export type TReviewCreateResponse = Static<typeof ReviewCreateResponse>

export const ReviewCreateConflictResponse = Type.Object({
    error: Type.Literal("already_exists"),
    reviewId: UUID,
})
export type TReviewCreateConflictResponse = Static<
    typeof ReviewCreateConflictResponse
>

export const ReviewUpdateRequest = Type.Object({
    phase: ServerReviewPhase,
    currentStepIndex: Type.Integer(),
    claimAssignments: Type.Array(ServerClaimAssignment),
    operatorAssignments: Type.Array(ServerOperatorAssignment),
})
export type TReviewUpdateRequest = Static<typeof ReviewUpdateRequest>

export const ReviewUpdateResponse = Type.Object({ review: ServerReview })
export type TReviewUpdateResponse = Static<typeof ReviewUpdateResponse>

export const ReviewDeleteResponse = Type.Object({ success: Type.Literal(true) })
export type TReviewDeleteResponse = Static<typeof ReviewDeleteResponse>

export const ReviewVisibilityRequest = Type.Object({
    public: Type.Boolean(),
})
export type TReviewVisibilityRequest = Static<typeof ReviewVisibilityRequest>

export const ReviewVisibilityResponse = Type.Object({ review: ServerReview })
export type TReviewVisibilityResponse = Static<typeof ReviewVisibilityResponse>
