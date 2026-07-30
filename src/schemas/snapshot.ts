import Type, { type Static } from "typebox"
import {
    PropositionalExpressionSchema,
    ClaimBoundVariableSchema,
    PremiseBoundVariableSchema,
    PropositionalPremiseSchema,
} from "./logic.js"
import { ArgumentSchema } from "./model/arguments.js"
import { Nullable, UUID } from "./common.js"

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
        // In proposit-core@0.11+, premise role is tracked at the ArgumentEngine
        // level (via conclusionPremiseId in the snapshot root), not in the
        // per-premise data. Make role optional here so snapshot validation
        // succeeds for engines that don't embed role in premise data.
        "role",
    ]),
    Type.Object({
        checksum: Type.Optional(Type.String()),
        descendantChecksum: Type.Optional(Nullable(Type.String())),
        combinedChecksum: Type.Optional(Type.String()),
        role: Type.Optional(
            Type.Union([Type.Literal("conclusion"), Type.Literal("supporting")])
        ),
        // Re-declared, not redundant. `PropositionalPremiseSchema` intersects a
        // *union* (freeform | derivation) with its local extensions, and
        // `Type.Omit` flattens that union away: the result declares `type` as
        // `freeform | derivation` but keeps only the properties the two members
        // share, so `derivedClaimId` — which lives on the derivation member
        // alone — disappears from the snapshot schema entirely.
        //
        // A schema that does not declare a property still *validates* a value
        // carrying it, which is why this stayed invisible: the snapshot checked
        // fine on the way out. But `Value.Encode` projects onto the declared
        // shape, so the field was silently stripped from every derivation
        // premise crossing the API. It then failed `CorePremiseSchema` on load
        // — `derivedClaimId` is required there — and the argument view 500'd.
        // Optional because freeform premises legitimately have none.
        derivedClaimId: Type.Optional(UUID),
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
