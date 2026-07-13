import { Type, type Static } from "typebox"
import { UUID } from "../../common.js"

// Closed set of report reasons so consumers can render a fixed reason picker.
export const ReportReasonCodeSchema = Type.Union([
    Type.Literal("spam"),
    Type.Literal("harassment"),
    Type.Literal("hate"),
    Type.Literal("sexual-content"),
    Type.Literal("violence"),
    Type.Literal("misinformation"),
    Type.Literal("other"),
])

// A report always targets one piece of user-generated content — an argument or
// one of its claims — identified by `targetType` + `targetId`.
export const ReportContentRequest = Type.Object({
    targetType: Type.Union([Type.Literal("argument"), Type.Literal("claim")]),
    targetId: UUID,
    reasonCode: ReportReasonCodeSchema,
    note: Type.Optional(Type.String()),
})

// Ack for a filed report. `duplicate` lets the client tell the reporter they
// had already reported this target rather than implying a second review.
export const ReportContentResponse = Type.Object({
    reportId: UUID,
    status: Type.Union([Type.Literal("received"), Type.Literal("duplicate")]),
})

// Shared body for block + unblock — both name the other user by id.
export const BlockUserRequest = Type.Object({
    blockedUserId: UUID,
})

// Shared ack for block + unblock. `blocked` reflects the resulting state
// (`true` after a block, `false` after an unblock) so one shape serves both.
export const BlockUserResponse = Type.Object({
    blockedUserId: UUID,
    blocked: Type.Boolean(),
})

// Minimal user ref for rendering the caller's block list.
export const BlockedUserSchema = Type.Object({
    userId: UUID,
    username: Type.String(),
})

export const GetBlocksResponse = Type.Array(BlockedUserSchema)

export type TReportReasonCode = Static<typeof ReportReasonCodeSchema>
export type TReportContentRequest = Static<typeof ReportContentRequest>
export type TReportContentResponse = Static<typeof ReportContentResponse>
export type TBlockUserRequest = Static<typeof BlockUserRequest>
export type TBlockUserResponse = Static<typeof BlockUserResponse>
export type TBlockedUser = Static<typeof BlockedUserSchema>
export type TGetBlocksResponse = Static<typeof GetBlocksResponse>
