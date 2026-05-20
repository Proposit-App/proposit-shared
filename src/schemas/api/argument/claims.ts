import Type, { type Static } from "typebox"
import { Nullable } from "../../common.js"
import { ClaimSchema, MutableClaimFieldsSchema } from "../../model.js"
import {
    AxiomaticClaimSchema,
    AxiomKindSchema,
} from "../../model/claims.js"
import { ClaimCitationSchema } from "../../model/citations.js"
import {
    PropositionalVariableSchema,
    PropositionalExpressionSchema,
    PropositionalPremiseSchema,
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

// ──── Axiom assignment (POST /claims/[claimId]/axiom) ──────────────────────

/**
 * Request body for `POST /api/v1/argument/[argumentId]/[version]/claims/[claimId]/axiom`.
 * The citing claim's identity is in the URL path; the body carries only the
 * axiomatic kind the server uses to mint the axiomatic-claim row.
 */
export const AxiomAssignmentRequestSchema = Type.Object({
    axiom: AxiomKindSchema,
})
export type TAxiomAssignmentRequest = Static<typeof AxiomAssignmentRequestSchema>

/**
 * Response body for the assign-axiom POST. Mirrors the citation-creation
 * response shape: the newly-minted entity (`axiomClaim`) plus the relational
 * context the client needs to wire it into its snapshot without a full resync
 * (`derivationPremise`, the citing claim's derivation premise now carrying
 * the axiomatic-claim variable as its antecedent).
 */
export const AxiomAssignmentResponseSchema = Type.Object({
    axiomClaim: AxiomaticClaimSchema,
    derivationPremise: PropositionalPremiseSchema,
})
export type TAxiomAssignmentResponse = Static<typeof AxiomAssignmentResponseSchema>
