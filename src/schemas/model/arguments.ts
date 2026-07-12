import Type, { type Static, type TSchema } from "typebox"
import { CoreArgumentSchema } from "@proposit/proposit-core"
import {
    ArgumentPlatform,
    ArgumentPlatformData,
    CuratedArgumentPlatformData,
} from "../integrations/index.js"
import { EncodableDate, Nullable, UUID } from "../common.js"
import { UserPublicFieldsSchema } from "./users.js"
import { ClaimSchema } from "./claims.js"
import { ClaimCitationSchema } from "./citations.js"
import {
    PropositionalVariableSchema,
    PropositionalExpressionSchema,
    PropositionalPremiseSchema,
} from "../logic.js"
export { ArgumentForkSchema, type TArgumentFork } from "./forks.js"

export const MutableArgumentFieldsSchema = Type.Object({
    title: Type.String(),
    description: Type.Optional(Type.String()),
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
        platform: ArgumentPlatform,
        platformData: Nullable(
            Type.Union([ArgumentPlatformData, CuratedArgumentPlatformData])
        ),
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

// The two states a matched (non-added, non-removed) entity can occupy. Mirrors
// core's `TCoreEntityFieldDiff.state`: `modified-own` — the entity's own fields
// changed; `modified-within` — own fields unchanged, but a contained child or a
// referenced entity changed. `added`/`removed` are carried by array membership,
// never stored on a record.
export const DiffStateSchema = Type.Union([
    Type.Literal("modified-own"),
    Type.Literal("modified-within"),
])
export type TDiffState = Static<typeof DiffStateSchema>

// A single field-level change on a matched entity.
export const FieldChangeSchema = Type.Object({
    field: Type.String(),
    before: Type.Unknown(),
    after: Type.Unknown(),
})

// Field-level diff for one matched entity: both sides, the field changes, and
// which of the two matched states it is in.
export const entityFieldDiff = <T extends TSchema>(schema: T) =>
    Type.Object({
        before: schema,
        after: schema,
        changes: Type.Array(FieldChangeSchema),
        state: DiffStateSchema,
    })

// Set-level diff for a collection of id-keyed entities.
export const entitySetDiff = <T extends TSchema>(schema: T) =>
    Type.Object({
        added: Type.Array(schema),
        removed: Type.Array(schema),
        modified: Type.Array(entityFieldDiff(schema)),
    })

export const ArgumentDiffSchema = Type.Object({
    claims: entitySetDiff(ClaimSchema),
    variables: entitySetDiff(PropositionalVariableSchema),
    premises: Type.Object({
        added: Type.Array(PropositionalPremiseSchema),
        removed: Type.Array(PropositionalPremiseSchema),
        modified: Type.Array(
            Type.Intersect([
                entityFieldDiff(PropositionalPremiseSchema),
                Type.Object({
                    expressions: entitySetDiff(PropositionalExpressionSchema),
                }),
            ])
        ),
    }),
    citations: entitySetDiff(ClaimCitationSchema),
    roles: Type.Object({
        conclusion: Type.Object({
            before: Nullable(UUID),
            after: Nullable(UUID),
        }),
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
