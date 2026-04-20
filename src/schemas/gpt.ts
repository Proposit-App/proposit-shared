import { Type, type Static } from "typebox"
import { Nullable } from "./common.js"

export const ArgumentReviewResponseSchema = Type.Object(
    {
        responses: Nullable(
            Type.Array(
                Type.Object(
                    {
                        claimId: Type.String({
                            description:
                                "The unique identifier for the main conclusion claim",
                            $comment: "Should be a valid claim ID",
                        }),
                        responseText: Type.String({
                            description: "The generated response for the claim",
                            $comment:
                                "Should contain one to two sentences or questions",
                        }),
                    },
                    {
                        additionalProperties: false,
                    }
                ),
                {
                    description: "An array of claim responses",
                }
            )
        ),
        failureText: Nullable(
            Type.String({
                description:
                    "The reason why an argument review could not be completed",
                $comment:
                    "If an argument review could not be completed, this field will contain an explanation as to why",
                maxLength: 1000,
            })
        ),
    },
    {
        additionalProperties: false,
        description:
            "Response schema for the argument analysis, containing an array of responses to claims",
    }
)
export type TArgumentReviewResponse = Static<
    typeof ArgumentReviewResponseSchema
>
