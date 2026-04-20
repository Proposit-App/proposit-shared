import Type, { type Static } from "typebox"
import { Nullable } from "../../common.js"
import { ClaimSchema, MutableClaimFieldsSchema } from "../../model.js"
import {
    SourceSchemaNotStrict,
    ClaimSourceSchema,
} from "../../model/sources.js"
import {
    PropositionalVariableSchema,
    PropositionalExpressionSchema,
} from "../../logic.js"

export const ClaimCreationRequestSchema = Type.Object({
    claimData: MutableClaimFieldsSchema,
})
export type TClaimCreationRequestSchema = Static<
    typeof ClaimCreationRequestSchema
>

export const ClaimCreationResponseSchema = Type.Object({
    newClaim: ClaimSchema,
    newPropositionalVariable: Nullable(PropositionalVariableSchema),
    newPropositionalExpressions: Type.Array(PropositionalExpressionSchema),
})
export type TClaimCreationResponse = Static<typeof ClaimCreationResponseSchema>

export const ClaimDeletionResponseSchema = Type.Object({
    deletedClaims: Type.Array(ClaimSchema),
})
export type TClaimDeletionResponse = Static<typeof ClaimDeletionResponseSchema>

export const SourceCreationSchema = Type.Object({
    source: SourceSchemaNotStrict,
    sourceRelation: ClaimSourceSchema,
})
export type TSourceCreation = Static<typeof SourceCreationSchema>

export const ClaimSourceDeleteResponseSchema = Type.Object({
    deletedSources: Type.Array(ClaimSourceSchema),
})
export type TClaimSourceDeleteResponse = Static<
    typeof ClaimSourceDeleteResponseSchema
>
