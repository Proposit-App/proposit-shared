import Type, { type Static } from "typebox"
import { ClaimSchema } from "../model/claims.js"
import { UUID } from "../common.js"

export const CitationUsageExpressionSchema = Type.Object({
    id: UUID,
    premiseId: UUID,
})
export type TCitationUsageExpression = Static<
    typeof CitationUsageExpressionSchema
>

export const CitationUsageSchema = Type.Object({
    argument: Type.Object({
        id: UUID,
        title: Type.String(),
        published: Type.Boolean(),
    }),
    version: Type.Number(),
    claim: ClaimSchema,
    // Every variable-type expression in this (argumentId, version) whose
    // variableId matches the claim's propositional variable. Each entry is
    // a ReactFlow node that surfaces this claim in the graph and is
    // individually navigable via the `selectedNode` query param.
    expressions: Type.Array(CitationUsageExpressionSchema),
})
export type TCitationUsage = Static<typeof CitationUsageSchema>

export const CitationWithContextSchema = Type.Object({
    citation: ClaimSchema,
    usages: Type.Array(CitationUsageSchema),
})
export type TCitationWithContext = Static<typeof CitationWithContextSchema>

export const UserCitationsResponseSchema = Type.Array(CitationWithContextSchema)
export type TUserCitationsResponse = Static<typeof UserCitationsResponseSchema>
