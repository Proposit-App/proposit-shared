import { Type, type Static } from "typebox"
import { UUID } from "./common.js"
import { Nullable } from "./common.js"
import { EncodableDate } from "./common.js"
import Value from "typebox/value"

export const Roles = {
    User: "user",
    Assistant: "assistant",
    Developer: "developer",
} as const

export const ChatUserRole = Type.Literal(Roles.User)
export const ChatAssistantRole = Type.Literal(Roles.Assistant)
export const ChatDeveloperRole = Type.Literal(Roles.Developer)
export const ChatAnyRole = Type.Union([
    ChatUserRole,
    ChatAssistantRole,
    ChatDeveloperRole,
])

export const ChatEntrySchema = Type.Object({
    role: ChatAnyRole,
    content: Type.String(),
})
export type TChatEntry = Static<typeof ChatEntrySchema>

const BaseTaskSchema = Type.Interface([], {
    id: UUID,
    userId: UUID,
    previousId: Nullable(
        Type.String({
            description:
                "ID of the previous task in the lineage, if any. Typically, this is set if the task is a retry of a previously failed task.",
        })
    ),

    type: Type.String(),
    // This data is set when the task is created
    data: Type.Null(),
    // This data is set when task fails
    errorData: Nullable(Type.Record(Type.String(), Type.Any())),
    // This data is set when task completes successfully
    resultData: Type.Null(),

    createdOn: EncodableDate,
    startedOn: Nullable(EncodableDate),
    completedOn: Nullable(EncodableDate),
    status: Type.Number(),
})

export function isTaskProgressDelta(obj: unknown): obj is TTaskProgressDelta {
    return Value.Check(TaskProgressDeltaSchema, obj)
}

export const ArgumentCreateTask = Type.Interface([BaseTaskSchema], {
    type: Type.Literal("argument_create"),
    data: Type.Object(
        {
            argumentId: Type.String({ format: "uuid" }),
            version: Type.Number(),
            responseId: Type.Optional(Nullable(Type.String())),
        },
        { additionalProperties: false }
    ),
    resultData: Nullable(
        Type.Object(
            {
                tokensUsed: Type.Number(),
            },
            { additionalProperties: false }
        )
    ),
})
export type TArgumentCreateTask = Static<typeof ArgumentCreateTask>

const ArgumentBuilderCommonData = Type.Object(
    {
        argumentId: Type.String({ format: "uuid" }),
        version: Type.Number(),
        conversationResponseId: Type.Optional(Nullable(Type.String())),
        responseId: Type.Optional(Nullable(Type.String())),
        newPrompts: Type.Array(ChatEntrySchema, {
            description:
                "An array of new messages from the user to include in the conversation",
        }),
    },
    { additionalProperties: false }
)

const ArgumentBuilderCommonResultData = Nullable(
    Type.Object(
        {
            tokensUsed: Type.Number(),
            output: ChatEntrySchema,
        },
        { additionalProperties: false }
    )
)

export const ArgumentBuildReviewTask = Type.Interface([BaseTaskSchema], {
    type: Type.Literal("argument_build_review"),
    data: ArgumentBuilderCommonData,
    resultData: ArgumentBuilderCommonResultData,
})
export type TArgumentBuildReviewTask = Static<typeof ArgumentBuildReviewTask>

export const ArgumentBuildFinalizeTask = Type.Interface([BaseTaskSchema], {
    type: Type.Literal("argument_build_finalize"),
    data: ArgumentBuilderCommonData,
    resultData: ArgumentBuilderCommonResultData,
})
export type TArgumentBuildFinalizeTask = Static<
    typeof ArgumentBuildFinalizeTask
>

export const ArgumentBuildSimulateUserTask = Type.Interface([BaseTaskSchema], {
    type: Type.Literal("argument_build_simulate_user"),
    data: ArgumentBuilderCommonData,
    resultData: ArgumentBuilderCommonResultData,
})
export type TArgumentBuildSimulateUserTask = Static<
    typeof ArgumentBuildSimulateUserTask
>

export const TaskSchemaMap = {
    argument_create: ArgumentCreateTask,
    argument_build_review: ArgumentBuildReviewTask,
    argument_build_finalize: ArgumentBuildFinalizeTask,
    argument_build_simulate_user: ArgumentBuildSimulateUserTask,
} as const

const TaskMapSchema = Type.Object({
    ...TaskSchemaMap,
})
type _TTaskMap = Static<typeof TaskMapSchema>

export const TaskSchema = Type.Union([
    ArgumentCreateTask,
    ArgumentBuildReviewTask,
    ArgumentBuildFinalizeTask,
    ArgumentBuildSimulateUserTask,
])

export const TaskTypeSchema = Type.KeyOf(TaskMapSchema)

export const TaskProgressDeltaSchema = Type.Object(
    {
        id: UUID,
        type: TaskTypeSchema,
        delta: Type.String(),
    },
    {
        additionalProperties: false,
    }
)
export type TTaskProgressDelta = Static<typeof TaskProgressDeltaSchema>

export function isTask(obj: unknown): obj is TTask {
    return Value.Check(TaskSchema, obj)
}

export type TTaskType = Static<typeof TaskTypeSchema>
export type TTask<T extends TTaskType = TTaskType> = _TTaskMap[T]

export const TaskOrDeltaSchema = Type.Union([
    TaskSchema,
    TaskProgressDeltaSchema,
])
export type TTaskOrDelta<T extends TTaskType> = TTask<T> | TTaskProgressDelta
