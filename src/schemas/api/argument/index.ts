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

export const GetAllArgumentsRequestSchema = Type.Object({
    userId: Type.Optional(UUID),
    username: Type.Optional(Type.String()),
    owned: Type.Optional(Type.Boolean()),
    limit: Type.Optional(Type.Number({ default: 50 })),
    offset: Type.Optional(Type.Number()),
    showUnpublished: Type.Optional(Type.Boolean()),
    orderByPopularity: Type.Optional(Type.Boolean()),
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
