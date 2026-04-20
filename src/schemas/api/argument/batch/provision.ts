import { Type, type Static } from "typebox"
import { ClaimSchema } from "../../../model/claims.js"
import {
    PropositionalPremiseSchema,
    PropositionalVariableSchema,
    PropositionalExpressionSchema,
} from "../../../logic.js"

export const ProvisionResponseSchema = Type.Object({
    claim: ClaimSchema,
    premise: PropositionalPremiseSchema,
    variable: PropositionalVariableSchema,
    expression: PropositionalExpressionSchema,
})

export type TProvisionResponse = Static<typeof ProvisionResponseSchema>
