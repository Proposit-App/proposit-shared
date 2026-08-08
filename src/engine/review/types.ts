import type {
    TCoreQuadrivalentValue,
    TCoreResolvedVariableValues,
} from "@proposit/proposit-core"
import type { TReviewAssessment } from "./assessment.js"

/**
 * Three-valued assignment pill, surfaced on claim nodes. This is what a reader
 * can set, so it stays three-valued: a claim held both ways is a resolved
 * value, never an assignment, and shows up on
 * {@link TReviewOverlay.claimPropagatedValues}.
 */
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
    propagatedValues: TCoreResolvedVariableValues
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
     *
     * `"contested"` here means the claim is held both true and false — whether
     * because two granted steps drive it apart or because two of its bound
     * variables disagree. There is no separate list of such claims to consult:
     * filter this map when a client wants them.
     */
    claimPropagatedValues?: Record<string, TCoreQuadrivalentValue>
    /**
     * The two axes composed from the evaluation, shown at the conclusion
     * premise. Absent when there is nothing evaluated yet.
     */
    assessment?: TReviewAssessment
}
