import Type, { type Static } from "typebox"
import { Nullable } from "../../common.js"
import { ClaimSchema, MutableClaimFieldsSchema } from "../../model.js"
import { ClaimCitationSchema } from "../../model/citations.js"
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

export const CitationCreationSchema = Type.Object({
    citation: ClaimSchema,
    citationEdge: ClaimCitationSchema,
})
export type TCitationCreation = Static<typeof CitationCreationSchema>

export const ClaimCitationDeleteResponseSchema = Type.Object({
    deletedCitations: Type.Array(ClaimCitationSchema),
})
export type TClaimCitationDeleteResponse = Static<
    typeof ClaimCitationDeleteResponseSchema
>
