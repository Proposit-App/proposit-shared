import Type, { type Static } from "typebox"
import { ClaimSchema } from "../model/claims.js"
import { SourceSchemaNotStrict } from "../model/sources.js"
import { UUID } from "../common.js"

export const SourceUsageExpressionSchema = Type.Object({
    id: UUID,
    premiseId: UUID,
})
export type TSourceUsageExpression = Static<typeof SourceUsageExpressionSchema>

export const SourceUsageSchema = Type.Object({
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
    expressions: Type.Array(SourceUsageExpressionSchema),
})
export type TSourceUsage = Static<typeof SourceUsageSchema>

export const SourceWithContextSchema = Type.Object({
    source: SourceSchemaNotStrict,
    usages: Type.Array(SourceUsageSchema),
})
export type TSourceWithContext = Static<typeof SourceWithContextSchema>

export const UserSourcesResponseSchema = Type.Array(SourceWithContextSchema)
export type TUserSourcesResponse = Static<typeof UserSourcesResponseSchema>
