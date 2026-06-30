import { Type, type Static } from "typebox"
import { UUID, EncodableDate } from "../common.js"
import { TrivalentValueSchema, ClaimReasonCodeSchema } from "../review.js"

// A quick-reaction on a single claim of a published argument version: a stance
// (`value`, reusing the review TrivalentValue) plus a required named reason
// (`reasonCode`, reusing the review claim reason vocabulary). Single-select per
// user, scoped to (argumentId, argumentVersion, claimId).
export const ClaimReactionSchema = Type.Object({
    id: UUID,
    argumentId: UUID,
    argumentVersion: Type.Number(),
    claimId: UUID,
    claimVersion: Type.Number(),
    value: TrivalentValueSchema,
    reasonCode: ClaimReasonCodeSchema,
    userId: UUID,
    createdOn: EncodableDate,
})
export type TClaimReaction = Static<typeof ClaimReactionSchema>
// Identity-stripped shape exposed to other users (aggregates strip userId /
// createdOn before leaving the server).
export type TClaimReactionSafe = Omit<TClaimReaction, "userId" | "createdOn">
