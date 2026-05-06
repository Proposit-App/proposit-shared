import Type, { type Static } from "typebox"
import {
    PropositionalExpressionSchema,
    ClaimBoundVariableSchema,
    PremiseBoundVariableSchema,
    PropositionalPremiseSchema,
} from "./logic.js"
import { ArgumentSchema } from "./model/arguments.js"
import { Nullable } from "./common.js"

// ---------- ArgumentEngine snapshot schemas ----------

// Snapshot sub-schemas
const ExpressionManagerSnapshotSchema = Type.Object({
    expressions: Type.Array(PropositionalExpressionSchema),
    config: Type.Optional(Type.Unknown()),
})

// Apply optional checksum transformation to each variable union member
// separately — Type.Omit on a Type.Union would collapse the union.
const OptionalChecksumFields = Type.Object({
    checksum: Type.Optional(Type.String()),
    descendantChecksum: Type.Optional(Nullable(Type.String())),
    combinedChecksum: Type.Optional(Type.String()),
})
const checksumKeys = [
    "checksum",
    "descendantChecksum",
    "combinedChecksum",
] as const

const OptionalChecksumVariable = Type.Union([
    Type.Intersect([
        Type.Omit(ClaimBoundVariableSchema, checksumKeys),
        OptionalChecksumFields,
    ]),
    Type.Intersect([
        Type.Omit(PremiseBoundVariableSchema, checksumKeys),
        OptionalChecksumFields,
    ]),
])

const VariableManagerSnapshotSchema = Type.Object({
    variables: Type.Array(OptionalChecksumVariable),
    config: Type.Optional(Type.Unknown()),
})

// Helper: make checksum fields optional on a schema
const OptionalChecksumArgument = Type.Intersect([
    Type.Omit(ArgumentSchema, [
        "checksum",
        "descendantChecksum",
        "combinedChecksum",
    ]),
    Type.Object({
        checksum: Type.Optional(Type.String()),
        descendantChecksum: Type.Optional(Nullable(Type.String())),
        combinedChecksum: Type.Optional(Type.String()),
    }),
])

const OptionalChecksumPremise = Type.Intersect([
    Type.Omit(PropositionalPremiseSchema, [
        "checksum",
        "descendantChecksum",
        "combinedChecksum",
    ]),
    Type.Object({
        checksum: Type.Optional(Type.String()),
        descendantChecksum: Type.Optional(Nullable(Type.String())),
        combinedChecksum: Type.Optional(Type.String()),
    }),
])

const PremiseEngineSnapshotSchema = Type.Object({
    premise: OptionalChecksumPremise,
    rootExpressionId: Type.Optional(Type.String()),
    expressions: ExpressionManagerSnapshotSchema,
    config: Type.Optional(Type.Unknown()),
})

export const ArgumentEngineSnapshotSchema = Type.Object({
    argument: OptionalChecksumArgument,
    variables: VariableManagerSnapshotSchema,
    premises: Type.Array(PremiseEngineSnapshotSchema),
    conclusionPremiseId: Type.Optional(Type.String()),
    config: Type.Optional(Type.Unknown()),
})
export type TArgumentEngineSnapshot = Static<
    typeof ArgumentEngineSnapshotSchema
>
