import Type, { type Static } from "typebox"
import { ClaimSchema } from "../model/claims.js"
import {
    PropositionalVariableSchema,
    PropositionalExpressionSchema,
    PropositionalPremiseSchema,
} from "../logic.js"
import { SourceSchemaNotStrict } from "../model/sources.js"
import { UUID } from "../common.js"

export const ClaimWithContextSchema = Type.Object({
    claim: ClaimSchema,
    argument: Type.Object({
        id: UUID,
        title: Type.String(),
        published: Type.Boolean(),
    }),
    version: Type.Number(),
    variable: Type.Optional(PropositionalVariableSchema),
    sources: Type.Optional(Type.Array(SourceSchemaNotStrict)),
    expressions: Type.Optional(Type.Array(PropositionalExpressionSchema)),
    premises: Type.Optional(Type.Array(PropositionalPremiseSchema)),
})
export type TClaimWithContext = Static<typeof ClaimWithContextSchema>

export const UserClaimsResponseSchema = Type.Array(ClaimWithContextSchema)
export type TUserClaimsResponse = Static<typeof UserClaimsResponseSchema>
