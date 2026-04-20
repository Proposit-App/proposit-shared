import Type, { type Static } from "typebox"
import { CoreArgumentSchema } from "@proposit/proposit-core"
import { ArgumentImportOrigin, ArgumentPlatformData } from "../integrations/index.js"
import { EncodableDate, Nullable, UUID } from "../common.js"
import { UserPublicFieldsSchema } from "./users.js"
import { ClaimSchema } from "./claims.js"
import { SourceSchemaNotStrict, ClaimSourceSchema } from "./sources.js"
import {
    PropositionalVariableSchema,
    PropositionalExpressionSchema,
    PropositionalPremiseSchema,
} from "../logic.js"
export { ArgumentForkSchema, type TArgumentFork } from "./forks.js"

export const MutableArgumentFieldsSchema = Type.Object({
    title: Type.String(),
})
export type TMutableArgumentFields = Static<typeof MutableArgumentFieldsSchema>

export const ArgumentSchema = Type.Intersect([
    CoreArgumentSchema,
    Type.Object({
        title: Type.String(),
        published: Type.Boolean(),
        creatorId: UUID,
        createdOn: EncodableDate,
        publishedOn: Nullable(EncodableDate),
        forkId: Nullable(UUID),
        digest: Type.String(),
        popularity: Type.Number(),
        platform: ArgumentImportOrigin,
        platformData: Nullable(ArgumentPlatformData),
        platformUsername: Nullable(Type.String()),
        titleContentHash: Nullable(Type.String()),
        description: Nullable(Type.String()),
    }),
])
export type TArgument = Static<typeof ArgumentSchema>

export const ArgumentWithMetadataSchema = Type.Intersect([
    ArgumentSchema,
    Type.Object({
        upvotes: Type.Number(),
        downvotes: Type.Number(),
    }),
])
export type TArgumentWithMetadata = Static<typeof ArgumentWithMetadataSchema>

export const Reaction = Type.Union([
    Type.Literal("upvote"),
    Type.Literal("downvote"),
])
export type TReactionTypes = Static<typeof Reaction>

export const ReactionSchema = Type.Object({
    id: UUID,
    argumentId: UUID,
    version: Type.Number(),
    reaction: Reaction,
    userId: UUID,
    createdOn: EncodableDate,
})
export type TReaction = Static<typeof ReactionSchema>
export type TReactionSafe = Omit<TReaction, "userId" | "createdOn">

export const ArgumentDiffSchema = Type.Object({
    claims: Type.Object({
        added: Type.Array(ClaimSchema),
        removed: Type.Array(ClaimSchema),
        updated: Type.Array(ClaimSchema),
    }),
    propositionalLogic: Type.Object({
        variables: Type.Object({
            added: Type.Array(PropositionalVariableSchema),
            removed: Type.Array(PropositionalVariableSchema),
            updated: Type.Array(PropositionalVariableSchema, {
                description:
                    "Variables can have the symbol changed which is the only type of update allowed",
            }),
        }),
        expressions: Type.Object({
            added: Type.Array(PropositionalExpressionSchema),
            removed: Type.Array(PropositionalExpressionSchema),
        }),
        premises: Type.Object({
            added: Type.Array(PropositionalPremiseSchema),
            removed: Type.Array(PropositionalPremiseSchema),
        }),
    }),
    claimSources: Type.Object({
        added: Type.Array(ClaimSourceSchema),
        removed: Type.Array(ClaimSourceSchema),
    }),
    sources: Type.Object({
        added: Type.Array(SourceSchemaNotStrict),
        removed: Type.Array(SourceSchemaNotStrict),
    }),
})
export type TArgumentDiff = Static<typeof ArgumentDiffSchema>

export const UnownedArgumentSchema = Type.Object({
    argumentId: UUID,
    version: Type.Number(),
    platform: Type.String(),
    platformUsername: Type.String(),
    userId: Nullable(UUID),
})
export type TUnownedArgument = Static<typeof UnownedArgumentSchema>

export const ParticipantSchema = Type.Object({
    argumentId: UUID,
    version: Type.Number(),
    userId: UUID,
    createdOn: EncodableDate,
    role: Type.String(),
})
export type TParticipant = Static<typeof ParticipantSchema>

export const ParticipantWithUserSchema = Type.Intersect([
    ParticipantSchema,
    UserPublicFieldsSchema,
])
export type TParticipantWithUser = Static<typeof ParticipantWithUserSchema>
