import Type, { type Static } from "typebox"
import { EncodableDate, Nullable, UUID } from "../common.js"

// ---------------------------------------------------------------------------
// Base fork record — shared fields for all entity fork record types.
// DB columns are nullable because the source entity may be deleted after fork.
// ---------------------------------------------------------------------------

const EntityForkRecordBase = Type.Object({
    entityId: UUID,
    forkedFromEntityId: Nullable(UUID),
    forkedFromArgumentId: Nullable(UUID),
    forkedFromArgumentVersion: Nullable(Type.Number()),
    forkId: UUID,
})

// ---------------------------------------------------------------------------
// Argument fork record — tracks which argument was forked, by whom, and when.
// ---------------------------------------------------------------------------

export const ArgumentForkSchema = Type.Intersect([
    EntityForkRecordBase,
    Type.Object({
        id: UUID,
        sourceUserId: UUID,
        forkedByUserId: UUID,
        createdOn: EncodableDate,
    }),
])
export type TArgumentFork = Static<typeof ArgumentForkSchema>

// ---------------------------------------------------------------------------
// Premise fork record — no extra fields beyond base.
// ---------------------------------------------------------------------------

export const PremiseForkSchema = EntityForkRecordBase
export type TPremiseFork = Static<typeof PremiseForkSchema>

// ---------------------------------------------------------------------------
// Expression fork record — adds source premise reference.
// ---------------------------------------------------------------------------

export const ExpressionForkSchema = Type.Intersect([
    EntityForkRecordBase,
    Type.Object({
        forkedFromPremiseId: Nullable(UUID),
    }),
])
export type TExpressionFork = Static<typeof ExpressionForkSchema>

// ---------------------------------------------------------------------------
// Variable fork record — no extra fields beyond base.
// ---------------------------------------------------------------------------

export const VariableForkSchema = EntityForkRecordBase
export type TVariableFork = Static<typeof VariableForkSchema>

// ---------------------------------------------------------------------------
// Claim fork record — tracks claim version and user attribution.
// ---------------------------------------------------------------------------

export const ClaimForkSchema = Type.Intersect([
    EntityForkRecordBase,
    Type.Object({
        forkedFromEntityVersion: Nullable(Type.Number()),
        sourceUserId: UUID,
        forkedByUserId: UUID,
    }),
])
export type TClaimFork = Static<typeof ClaimForkSchema>

// ---------------------------------------------------------------------------
// Source fork record — tracks source version.
// ---------------------------------------------------------------------------

export const SourceForkSchema = Type.Intersect([
    EntityForkRecordBase,
    Type.Object({
        forkedFromEntityVersion: Nullable(Type.Number()),
    }),
])
export type TSourceFork = Static<typeof SourceForkSchema>
