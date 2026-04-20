import { Reaction, ReactionSchema } from "../../model.js"
import { Type, type Static } from "typebox"

export const ReactionGetResponse = Type.Array(ReactionSchema)

export const ReactionCreateRequest = Type.Object({
    reaction: Reaction,
    reactionsToRemove: Type.Optional(Type.Array(Reaction)),
})

export const ReactionCreateResponse = Type.Object({
    addedReaction: ReactionSchema,
    removedReactions: Type.Array(ReactionSchema),
})

export const ReactionDeleteResponse = Type.Object({
    removedReactions: Type.Array(ReactionSchema),
})

export type TReactionsGetResponse = Static<typeof ReactionGetResponse>
export type TReactionCreateRequest = Static<typeof ReactionCreateRequest>
export type TReactionCreateResponse = Static<typeof ReactionCreateResponse>
export type TReactionDeleteResponse = Static<typeof ReactionDeleteResponse>
