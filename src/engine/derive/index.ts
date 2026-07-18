// Derived-view projections: counterargument/tab partition, lone-conclusion
// detection, client-detectable repair detection, and proof-state posture. Pure
// and runtime-agnostic — every function reads only the engine's reactive
// snapshot (or a built text tree) the clients already hold.

export {
    counterargumentPremiseIds,
    attackTargetsByClaimId,
    wrappedOperatorExpressionIds,
    citationsByClaimId,
    loneRebuttalTargets,
    partitionItemsByTab,
} from "./counterargument.js"
export type { TAttackTarget, TArgumentTab } from "./counterargument.js"

export { findLoneConclusion } from "./lone-conclusion.js"
export type { TLoneConclusion } from "./lone-conclusion.js"

export { REPAIRABLE_CODES, detectRepairs } from "./repairs.js"

// Proof-state posture already lives in argument-metrics; re-exported here so the
// full derived-view surface is reachable from one import path.
export { getClaimProofState } from "../argument-metrics.js"
export type { TClaimProofState } from "../argument-metrics.js"
