// Platform-neutral overlay / render-map item model. Shared owns the item model
// and the pure overlay transforms; each client supplies only presentational
// leaves. The diff-driven ghost *builders* stay per-client (they consume that
// client's own diff/graph layer); only the ghost item model lifts here.

export {
    buildAtvEditableItems,
    collectOperatorLabelEdges,
} from "./atv-items.js"
export type {
    TAtvItem,
    TAtvSlotItem,
    TAtvOperatorItem,
    TOperatorLabelEdge,
} from "./atv-items.js"

export type { TAtvGhostItem } from "./ghosts.js"

export {
    applySkeletonOverlay,
    nextSkeletonOperator,
    computeWrap,
    defaultSkeletonOperator,
    planSkeletonCommit,
    rootNegationUnitId,
} from "./skeleton-overlay.js"
export type {
    TAtvSkeletonItem,
    TAtvOverlayItem,
    TSkeletonOverlayContext,
    TSkeletonOperator,
    TSkeletonCommitTarget,
    TSkeletonCommitPlan,
} from "./skeleton-overlay.js"
