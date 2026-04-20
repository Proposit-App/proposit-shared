import Type, { type Static } from "typebox"
import { UUID, Nullable, EncodableDate } from "./common.js"
import {
    CoreLogicalOperatorType,
    CorePropositionalExpressionTypes,
    CorePropositionalVariableExpressionSchema,
    CoreOperatorExpressionSchema,
    CoreFormulaExpressionSchema,
    CoreClaimBoundVariableSchema,
    CorePremiseBoundVariableSchema,
    CorePremiseSchema,
} from "@proposit/proposit-core"

// PROPOSITIONAL LOGIC SCHEMAS

// Logical operator type — re-exported from proposit-core
export const LogicalOperatorType = CoreLogicalOperatorType
export type TLogicalOperatorType = Static<typeof LogicalOperatorType>

// Expression type discriminant — re-exported from proposit-core
export const PropositionalExpressionTypes = CorePropositionalExpressionTypes
export type TPropositionalExpressionTypes = Static<
    typeof PropositionalExpressionTypes
>

// Local expression extensions shared across all expression sub-types.
const ExpressionLocalExtensions = Type.Object({
    createdOn: EncodableDate,
    creatorId: UUID,
})

// Variable expression: core + local extensions + operator discriminant null
export const PropositionalVariableExpressionSchema = Type.Intersect([
    CorePropositionalVariableExpressionSchema,
    ExpressionLocalExtensions,
    Type.Object({ operator: Type.Null() }),
])
export type TPropositionalVariableExpression = Static<
    typeof PropositionalVariableExpressionSchema
>

// Operator expression: core + local extensions + variableId discriminant null
export const OperatorExpressionSchema = Type.Intersect([
    CoreOperatorExpressionSchema,
    ExpressionLocalExtensions,
    Type.Object({ variableId: Type.Null() }),
])
export type TOperatorExpression = Static<typeof OperatorExpressionSchema>

// Formula expression: core + local extensions + both discriminants null
export const FormulaExpressionSchema = Type.Intersect([
    CoreFormulaExpressionSchema,
    ExpressionLocalExtensions,
    Type.Object({ variableId: Type.Null(), operator: Type.Null() }),
])
export type TFormulaExpression = Static<typeof FormulaExpressionSchema>

// Union of all expression types
export const PropositionalExpressionSchema = Type.Union([
    PropositionalVariableExpressionSchema,
    OperatorExpressionSchema,
    FormulaExpressionSchema,
])
export type TPropositionalExpressionCombined = Static<
    typeof PropositionalExpressionSchema
>

// Extract helper: narrow the union by type discriminant
export type TPropositionalExpression<
    T extends TPropositionalExpressionTypes = TPropositionalExpressionTypes,
> = Extract<TPropositionalExpressionCombined, { type: T }>

// Local extensions shared by all propositional variable sub-types.
const VariableLocalExtensions = Type.Object({
    createdOn: EncodableDate,
    creatorId: UUID,
    descendantChecksum: Nullable(Type.String()),
    combinedChecksum: Type.String(),
})

// Claim-bound variable: core claim-bound schema + local extensions.
export const ClaimBoundVariableSchema = Type.Intersect([
    CoreClaimBoundVariableSchema,
    VariableLocalExtensions,
])
export type TClaimBoundVariable = Static<typeof ClaimBoundVariableSchema>

// Premise-bound variable: core premise-bound schema + local extensions.
export const PremiseBoundVariableSchema = Type.Intersect([
    CorePremiseBoundVariableSchema,
    VariableLocalExtensions,
])
export type TPremiseBoundVariable = Static<typeof PremiseBoundVariableSchema>

// Propositional variable — union of claim-bound and premise-bound, each with
// app-level extensions. This matches the core union and satisfies the engine's
// type parameter constraint.
export const PropositionalVariableSchema = Type.Union([
    ClaimBoundVariableSchema,
    PremiseBoundVariableSchema,
])
export type TPropositionalVariable = Static<typeof PropositionalVariableSchema>

// Premise role type (local-only; core manages roles via ArgumentRoleState)
export const PremiseRoleType = Type.Union([
    Type.Literal("conclusion"),
    Type.Literal("supporting"),
])
export type TPremiseRoleType = Static<typeof PremiseRoleType>

// Propositional premise — full core schema + local extensions
export const PropositionalPremiseSchema = Type.Intersect([
    CorePremiseSchema,
    Type.Object({
        title: Type.Optional(Nullable(Type.String())),
        role: PremiseRoleType,
        createdOn: Type.Optional(EncodableDate),
        creatorId: Type.Optional(UUID),
    }),
])
export type TPropositionalPremise = Static<typeof PropositionalPremiseSchema>
