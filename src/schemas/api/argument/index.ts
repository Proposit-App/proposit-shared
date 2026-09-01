import {
    ArgumentSchema,
    MutableArgumentFieldsSchema,
    ParticipantWithUserSchema,
    ClaimSchema,
} from "../../model.js"
import { ClaimCitationSchema } from "../../model/citations.js"
import { Nullable, UUID } from "../../common.js"
import { TaskSchema } from "../../tasks.js"
import {
    ArgumentEngineSnapshotSchema,
    type TArgumentEngineSnapshot,
} from "../../snapshot.js"
import {
    ArgumentImportOrigin,
    ArgumentPlatformDataMap,
} from "../../integrations/index.js"
import Type, { type Static } from "typebox"

export * from "./build.js"
export * from "./versioning.js"
export * from "./origin.js"
export * from "./version-history.js"
export * from "./saved.js"

export const FullArgumentSchema = Type.Object({
    argument: ArgumentSchema,
    claims: Type.Array(ClaimSchema),
    propositionalLogic: ArgumentEngineSnapshotSchema,
    citations: Type.Array(ClaimCitationSchema),
    argumentHistory: Type.Array(ArgumentSchema),
    originalArgument: Nullable(ArgumentSchema),
    participants: Type.Array(ParticipantWithUserSchema),
    tasks: Type.Array(TaskSchema),
    needsNormalization: Type.Boolean(),
})
export type TFullArgument = Static<typeof FullArgumentSchema>
export type TFullArgumentDataOnly = Omit<
    TFullArgument,
    "argument" | "argumentHistory" | "originalArgument" | "propositionalLogic"
> & {
    argument: Static<typeof ArgumentSchema> | null
    propositionalLogic: TArgumentEngineSnapshot | null
}

/** Sort key for the argument list. */
export const ArgumentOrderBy = Type.Union([
    Type.Literal("popularity"),
    Type.Literal("createdOn"),
    Type.Literal("title"),
])
export type TArgumentOrderBy = Static<typeof ArgumentOrderBy>

/** Sort direction for the argument list. */
export const ArgumentOrderDirection = Type.Union([
    Type.Literal("asc"),
    Type.Literal("desc"),
])
export type TArgumentOrderDirection = Static<typeof ArgumentOrderDirection>

export const GetAllArgumentsRequestSchema = Type.Object({
    userId: Type.Optional(UUID),
    username: Type.Optional(Type.String()),
    owned: Type.Optional(Type.Boolean()),
    limit: Type.Optional(Type.Number({ default: 50 })),
    offset: Type.Optional(Type.Number()),
    showUnpublished: Type.Optional(Type.Boolean()),
    /**
     * Legacy popularity switch. Still honored on its own; superseded by
     * `orderBy` when both are present.
     */
    orderByPopularity: Type.Optional(Type.Boolean()),
    /**
     * Explicit sort key. Takes precedence over `orderByPopularity` when both
     * arrive. Omitting it leaves ordering exactly as `orderByPopularity`
     * (or its absence) has always determined it.
     */
    orderBy: Type.Optional(ArgumentOrderBy),
    /** Sort direction for `orderBy`; ignored when `orderBy` is absent. */
    orderDirection: Type.Optional(ArgumentOrderDirection),
    getUserIdFromSession: Type.Optional(Type.Boolean()),
    titlePattern: Type.Optional(Type.String()),
})
export type TGetAllArgumentsRequest = Static<
    typeof GetAllArgumentsRequestSchema
>

export const UpdateArgumentRequestSchema = Type.Object({
    newData: MutableArgumentFieldsSchema,
    currentDigest: Type.String(),
})
export type TUpdateArgumentRequest = Static<typeof UpdateArgumentRequestSchema>

// Body for adding an editor to an argument version: the user to grant the
// editor role. The owner is inferred server-side; only the target userId travels.
export const AddParticipantRequestSchema = Type.Object({
    userId: UUID,
})
export type TAddParticipantRequest = Static<typeof AddParticipantRequestSchema>

const ArgumentWithForkIdSchema = Type.Intersect([
    ArgumentSchema,
    Type.Object({
        forkId: UUID,
    }),
])

export const GetForksOfArgumentResponseSchema = Type.Object({
    arguments: Type.Array(ArgumentWithForkIdSchema),
})
export type TGetForksOfArgumentResponse = Static<
    typeof GetForksOfArgumentResponseSchema
>

export const CreateArgumentSchema = Type.Object(
    {
        origin: ArgumentImportOrigin,
        data: Type.Index(
            ArgumentPlatformDataMap,
            Type.KeyOf(ArgumentPlatformDataMap)
        ),
        mode: Type.Optional(
            Type.Union([Type.Literal("fast"), Type.Literal("thorough")])
        ),
    },
    { additionalProperties: false }
)
export type TCreateArgument = Static<typeof CreateArgumentSchema>

export const PublishResponseSchema = Type.Object({
    published: ArgumentSchema,
    draft: ArgumentSchema,
})
export type TPublishResponse = Static<typeof PublishResponseSchema>

export const SetArgumentHiddenResponseSchema = Type.Object({
    hidden: Type.Boolean(),
})
export type TSetArgumentHiddenResponse = Static<
    typeof SetArgumentHiddenResponseSchema
>

export const PurgeArgumentResponseSchema = Type.Object({
    deletedArgumentIds: Type.Array(UUID),
})
export type TPurgeArgumentResponse = Static<typeof PurgeArgumentResponseSchema>
