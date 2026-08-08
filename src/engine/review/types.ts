import type { TCoreTrivalentValue } from "@proposit/proposit-core"
import type { TReviewAssessment } from "./assessment.js"

/** Three-valued assignment pill, surfaced on claim nodes. */
export type TAssignmentPill = "true" | "false" | "unknown" | "skipped"

/**
 * Where a claim's effective assignment came from. `"user"` means the value was
 * set by the reviewer (an in-review override or a claim reaction); `"default"`
 * means it fell through to the usage-based default core derived.
 */
export type TAssignmentProvenance = "user" | "default"

/** Review-phase data merged into the graph when rendering with review overlay. */
export interface TReviewOverlay {
    /** User's assignment per claimId. */
    claimValues: Record<string, TAssignmentPill>
    /** Evaluator-propagated value per variableId. */
    propagatedValues: Record<string, boolean | null>
    /** Operator accept/reject decision per expressionId. */
    operatorDecisions: Record<string, "accepted" | "rejected">
    /**
     * Provenance of each claim's effective value, per `claimId`. Populated by
     * the inline-review overlay (`buildInlineReviewOverlay`); left undefined by
     * the multi-step review-wizard overlay, which has no default layer.
     */
    claimProvenance?: Record<string, TAssignmentProvenance>
    /**
     * Propagated (`unknown → true`) evaluated value per `claimId` — the value
     * the inline chip renders after transitive grounding. Populated by
     * `buildInlineReviewOverlay`. Keyed by `claimId` (unlike the variable-keyed
     * {@link propagatedValues}).
     */
    claimPropagatedValues?: Record<string, TCoreTrivalentValue>
    /**
     * The two axes composed from the evaluation, shown at the conclusion
     * premise. Absent when there is nothing evaluated yet.
     */
    assessment?: TReviewAssessment
}
