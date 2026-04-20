import { Nullable, UUID } from "../../common.js"
import {
    LogicalOperatorType,
    PremiseRoleType,
    PropositionalExpressionSchema,
    PropositionalExpressionTypes,
    PropositionalPremiseSchema,
    PropositionalVariableSchema,
} from "../../logic.js"
import { Type, type Static } from "typebox"
import Value from "typebox/value"

// ── Premise API schemas ─────────────────────────────────────────────────────

export const PremiseCreationSchema = Type.Object({
    title: Type.Optional(Nullable(Type.String())),
    role: Type.Optional(PremiseRoleType),
})
export type TPremiseCreation = Static<typeof PremiseCreationSchema>

export const CreatePremiseResponseSchema = Type.Object({
    premise: PropositionalPremiseSchema,
    variable: Type.Union([PropositionalVariableSchema, Type.Null()]),
})
export type TCreatePremiseResponse = Static<typeof CreatePremiseResponseSchema>

export const PremiseUpdateSchema = Type.Intersect([
    Type.Object({ checksum: Type.String() }),
    Type.Partial(
        Type.Object({
            title: Nullable(Type.String()),
            role: PremiseRoleType,
        })
    ),
])
export type TPremiseUpdate = Static<typeof PremiseUpdateSchema>

// ── Expression API schemas (within a premise) ───────────────────────────────

const InsertDirectionType = Type.Union([
    Type.Literal("before"),
    Type.Literal("after"),
])

const RelativeToSchema = Type.Object({
    expressionId: UUID,
    direction: InsertDirectionType,
})

export const ExpressionCreationSchema = Type.Object({
    premiseId: UUID,
    parentId: Type.Optional(Nullable(UUID)),
    position: Type.Optional(Type.Integer()),
    type: PropositionalExpressionTypes,
    variableId: Type.Optional(Nullable(UUID)),
    operator: Type.Optional(Nullable(LogicalOperatorType)),
    relativeTo: Type.Optional(RelativeToSchema),
})
export type TExpressionCreation = Static<typeof ExpressionCreationSchema>

export const ExpressionUpdateSchema = Type.Intersect([
    Type.Object({ checksum: Type.String() }),
    Type.Partial(
        Type.Object({
            parentId: Nullable(UUID),
            position: Type.Integer(),
            type: PropositionalExpressionTypes,
            variableId: Nullable(UUID),
            operator: Nullable(LogicalOperatorType),
        })
    ),
])
export type TExpressionUpdate = Static<typeof ExpressionUpdateSchema>

export const CreateExpressionResponseSchema = Type.Object({
    created: PropositionalExpressionSchema,
    shifted: Type.Array(PropositionalExpressionSchema),
})
export type TCreateExpressionResponse = Static<
    typeof CreateExpressionResponseSchema
>

// ── Variable API schemas (claim-linked) ──────────────────────────────────────

export const VariableCreationSchema = Type.Object({
    claimId: UUID,
    claimVersion: Type.Number(),
    symbol: Type.String({ minLength: 1 }),
})
export type TVariableCreation = Static<typeof VariableCreationSchema>

export const VariableUpdateSchema = Type.Intersect([
    Type.Object({ checksum: Type.String() }),
    Type.Partial(
        Type.Object({
            claimId: UUID,
            claimVersion: Type.Number(),
            symbol: Type.String({ minLength: 1 }),
        })
    ),
])
export type TVariableUpdate = Static<typeof VariableUpdateSchema>

// ── Type guards ─────────────────────────────────────────────────────────────

export function isPremiseCreation(obj: unknown): obj is TPremiseCreation {
    return Value.Check(PremiseCreationSchema, obj)
}

export function isExpressionCreation(obj: unknown): obj is TExpressionCreation {
    return Value.Check(ExpressionCreationSchema, obj)
}

export function isVariableCreation(obj: unknown): obj is TVariableCreation {
    return Value.Check(VariableCreationSchema, obj)
}
