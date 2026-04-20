import { Type, type Static } from "typebox"
import { UUID, EncodableDate } from "../common.js"
import { UserPublicFieldsSchema } from "./users.js"

export const ServerClaimAssignment = Type.Object({
    claimId: UUID,
    value: Type.Union([
        Type.Literal("true"),
        Type.Literal("false"),
        Type.Literal("unknown"),
        Type.Null(),
    ]),
    skipped: Type.Boolean(),
    reasonCode: Type.Union([Type.String(), Type.Null()]),
    decidedAt: Type.Union([EncodableDate, Type.Null()]),
})
export type TServerClaimAssignment = Static<typeof ServerClaimAssignment>

export const ServerOperatorAssignment = Type.Object({
    premiseId: UUID,
    expressionId: Type.Union([UUID, Type.Null()]),
    scope: Type.Union([Type.Literal("premise"), Type.Literal("expression")]),
    decision: Type.Union([
        Type.Literal("accepted"),
        Type.Literal("rejected"),
        Type.Null(),
    ]),
    reasonCode: Type.Union([Type.String(), Type.Null()]),
    decidedAt: Type.Union([EncodableDate, Type.Null()]),
})
export type TServerOperatorAssignment = Static<typeof ServerOperatorAssignment>

export const ServerReviewPhase = Type.Union([
    Type.Literal("claims"),
    Type.Literal("operators"),
    Type.Literal("done"),
])
export type TServerReviewPhase = Static<typeof ServerReviewPhase>

export const ServerReview = Type.Object({
    id: UUID,
    argumentId: UUID,
    argumentVersion: Type.Integer(),
    userId: UUID,
    phase: ServerReviewPhase,
    currentStepIndex: Type.Integer(),
    public: Type.Boolean(),
    createdOn: EncodableDate,
    updatedOn: EncodableDate,
    claimAssignments: Type.Array(ServerClaimAssignment),
    operatorAssignments: Type.Array(ServerOperatorAssignment),
})
export type TServerReview = Static<typeof ServerReview>

export const ReviewerInfo = Type.Intersect([
    Type.Object({ id: UUID }),
    UserPublicFieldsSchema,
])
export type TReviewerInfo = Static<typeof ReviewerInfo>
