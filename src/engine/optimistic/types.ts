// Inherited from proposit-server. Legacy type-alias names (PendingOpType,
// PendingEntityKind, PendingOp, SyncStatus, DivergenceScope) predate the
// brain-style T-prefix convention; renaming cascades through every consumer.
// Tracked as tech debt for a dedicated follow-up.
/* eslint-disable @typescript-eslint/naming-convention */

export class ReconciliationError extends Error {
    constructor(message: string, options?: ErrorOptions) {
        super(message, options)
        this.name = "ReconciliationError"
    }
}

export type PendingOpType = "create" | "update" | "delete"
export type PendingEntityKind =
    | "premise"
    | "expression"
    | "variable"
    | "claim"
    | "argument"

export type PendingOp = {
    type: PendingOpType
    entityKind: PendingEntityKind
    entityId: string
    timestamp: number
}

export type SyncStatus = "synced" | "saving" | "error" | "resyncing"

export type DivergenceScope =
    | { level: "none" }
    | { level: "entity"; entityKind: PendingEntityKind; entityId: string }
    | { level: "premise"; premiseId: string }
    | { level: "full" }
