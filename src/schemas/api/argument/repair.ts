// src/schemas/api/argument/repair.ts
import { UUID } from "../../common.js"
import { ArgumentEngineSnapshotSchema } from "../../snapshot.js"
import { Type, type Static } from "typebox"

// ── Repairable validation codes ─────────────────────────────────────────────

export const RepairableCodeSchema = Type.Union([
    Type.Literal("EXPR_CHILD_COUNT_INVALID"),
    Type.Literal("PREMISE_ROOT_MISMATCH"),
    Type.Literal("CHECKSUM_STALE"),
    Type.Literal("GRAMMAR_DENORMALIZED"),
])
export type TRepairableCode = Static<typeof RepairableCodeSchema>

// ── Request ─────────────────────────────────────────────────────────────────

export const RepairItemSchema = Type.Object({
    code: RepairableCodeSchema,
    premiseId: Type.Optional(UUID),
    expressionId: Type.Optional(UUID),
})
export type TRepairItem = Static<typeof RepairItemSchema>

export const RepairRequestSchema = Type.Object({
    repairs: Type.Array(RepairItemSchema),
})
export type TRepairRequest = Static<typeof RepairRequestSchema>

// ── Response ────────────────────────────────────────────────────────────────

const RepairResultItemSchema = Type.Object({
    code: Type.String(),
    premiseId: Type.Optional(Type.String()),
    expressionId: Type.Optional(Type.String()),
})

export const RepairResponseSchema = Type.Object({
    snapshot: ArgumentEngineSnapshotSchema,
    repaired: Type.Array(RepairResultItemSchema),
    failed: Type.Array(
        Type.Intersect([
            RepairResultItemSchema,
            Type.Object({ reason: Type.String() }),
        ])
    ),
})
export type TRepairResponse = Static<typeof RepairResponseSchema>
