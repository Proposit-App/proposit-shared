import { Type, type Static } from "typebox"
import { EncodableDate } from "../../common.js"
import { OperatorReasonCodeSchema } from "../../review.js"

/**
 * Wire bodies for premise (operator) reactions — how a reader decided a premise
 * while reading, as opposed to how a reviewer assigned it in a review draft.
 *
 * The premise-level peer of `../claim-reaction/index.js`, and shaped like it on
 * purpose: aggregate counts everybody can see, plus the caller's own selection,
 * with a per-argument bulk read that reuses the single-premise response as its
 * map value.
 */

export const OperatorDecisionSchema = Type.Union([
    Type.Literal("accepted"),
    Type.Literal("rejected"),
])

export const OperatorReactionCreateRequest = Type.Object({
    decision: OperatorDecisionSchema,
    reasonCode: OperatorReasonCodeSchema,
    /**
     * The premise's outermost decidable operator. Optional: a client that
     * cannot resolve it still records a decision, and the column is nullable
     * for the same reason.
     */
    expressionId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
})

/**
 * The caller's own selection. `reasonCode` widens to a plain string on the way
 * out so a stored code that has since been renamed still round-trips and
 * renders raw rather than failing validation.
 */
export const OperatorReactionSelectionSchema = Type.Object({
    decision: OperatorDecisionSchema,
    reasonCode: Type.Union([OperatorReasonCodeSchema, Type.String()]),
    expressionId: Type.Union([Type.String(), Type.Null()]),
})

/**
 * Rolled up to the premise, not split per operator. A premise offers exactly one
 * decision, so a per-operator tally would report the same numbers while implying
 * the decision were scoped to a subtree — which it is not: rejecting takes the
 * whole premise out of the reckoning.
 */
export const OperatorDecisionCountsSchema = Type.Object({
    accept: Type.Number(),
    reject: Type.Number(),
})

export const OperatorReactionSchema = Type.Object({
    id: Type.String(),
    argumentId: Type.String(),
    argumentVersion: Type.Number(),
    premiseId: Type.String(),
    expressionId: Type.Union([Type.String(), Type.Null()]),
    decision: OperatorDecisionSchema,
    reasonCode: Type.Union([OperatorReasonCodeSchema, Type.String()]),
    userId: Type.String(),
    createdOn: EncodableDate,
})

export const OperatorReactionCreateResponse = Type.Object({
    addedReaction: OperatorReactionSchema,
})

export const OperatorReactionDeleteResponse = Type.Object({
    removedReaction: OperatorReactionSchema,
})

/** Counts everyone can see, plus the caller's own selection when signed in. */
export const OperatorReactionGetResponse = Type.Object({
    counts: OperatorDecisionCountsSchema,
    own: Type.Union([OperatorReactionSelectionSchema, Type.Null()]),
})

/**
 * Every premise's reaction state for one argument version, keyed by premiseId.
 *
 * A premise nobody has decided is **absent**, not present with zeroed counts —
 * the reading surface supplies its own empty default, and answering here as well
 * would put the same rule in two places.
 */
export const OperatorReactionMapResponse = Type.Record(
    Type.String(),
    OperatorReactionGetResponse
)

export type TOperatorDecision = Static<typeof OperatorDecisionSchema>
export type TOperatorReactionCreateRequest = Static<
    typeof OperatorReactionCreateRequest
>
export type TOperatorReactionSelection = Static<
    typeof OperatorReactionSelectionSchema
>
export type TOperatorDecisionCounts = Static<
    typeof OperatorDecisionCountsSchema
>
export type TOperatorReaction = Static<typeof OperatorReactionSchema>
export type TOperatorReactionCreateResponse = Static<
    typeof OperatorReactionCreateResponse
>
export type TOperatorReactionDeleteResponse = Static<
    typeof OperatorReactionDeleteResponse
>
export type TOperatorReactionGetResponse = Static<
    typeof OperatorReactionGetResponse
>
export type TOperatorReactionMapResponse = Static<
    typeof OperatorReactionMapResponse
>
