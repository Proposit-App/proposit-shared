import { Type, type Static } from "typebox"

export const ArgumentBuilderRequestSchema = Type.Object({
    lastResponseId: Type.Optional(Type.String()),
    newPrompts: Type.Array(Type.String(), {
        description:
            "New prompts entered by the user since the last request (relative to the last response ID).",
    }),
    action: Type.Union(
        [
            Type.Literal("review"),
            Type.Literal("finalize"),
            Type.Literal("simulate_user"),
        ],
        {
            description:
                "Whether to request a review or finalize the argument.",
        }
    ),
})
export type TArgumentBuilderRequest = Static<
    typeof ArgumentBuilderRequestSchema
>

export const ArgumentBuilderReviewResponseSuccessSchema = Type.Object({
    success: Type.Literal(true),
    done: Type.Literal(false),
    responseText: Type.String(),
    responseId: Type.String(),
    refusalMessage: Type.Null(),
})

export const ArgumentBuilderResponseRefusedSchema = Type.Object({
    success: Type.Literal(false),
    done: Type.Literal(false),
    responseText: Type.Null(),
    responseId: Type.String(),
    refusalMessage: Type.String(),
})

export const ArgumentBuilderFinalizeResponseSuccessSchema = Type.Object({
    success: Type.Literal(true),
    done: Type.Literal(true),
    responseText: Type.String(),
    responseId: Type.String(),
    refusalMessage: Type.Null(),
})

export type TArgumentBuilderFinalizeResponseSuccess = Static<
    typeof ArgumentBuilderFinalizeResponseSuccessSchema
>

export const ArgumentBuilderResponseSchema = Type.Union([
    ArgumentBuilderReviewResponseSuccessSchema,
    ArgumentBuilderFinalizeResponseSuccessSchema,
    ArgumentBuilderResponseRefusedSchema,
])

export type TArgumentBuilderRequestResponse = Static<
    typeof ArgumentBuilderResponseSchema
>
