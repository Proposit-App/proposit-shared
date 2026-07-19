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
export type {
    TStanceBucket,
    TClaimReactionState,
} from "./claim-stance-state.js"
export { bucketOf, applyStance, clearOwn } from "./claim-stance-state.js"
