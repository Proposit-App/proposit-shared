export type {
    PendingOp,
    SyncStatus,
    DivergenceScope,
    PendingOpType,
    PendingEntityKind,
} from "./types.js"
export { detectDivergence } from "./verification.js"
export {
    reconcileCreatedPremise,
    reconcileCreatedExpression,
    reconcileCreatedVariable,
} from "./reconciliation.js"
