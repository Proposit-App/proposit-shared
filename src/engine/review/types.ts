/** Three-valued assignment pill, surfaced on claim nodes. */
export type TAssignmentPill = "true" | "false" | "unknown" | "skipped"

/** Verdict rendered on the conclusion premise node after evaluation. */
export type TConclusionVerdict =
    | "Valid and Sound"
    | "Failing"
    | "Logically Invalid"
    | "Vacuous"
    | "Indeterminate"

/** Review-phase data merged into the graph when rendering with review overlay. */
export interface TReviewOverlay {
    /** User's assignment per claimId. */
    claimValues: Record<string, TAssignmentPill>
    /** Evaluator-propagated value per variableId. */
    propagatedValues: Record<string, boolean | null>
    /** Operator accept/reject decision per expressionId. */
    operatorDecisions: Record<string, "accepted" | "rejected">
    /** Verdict for the conclusion premise node. */
    conclusionVerdict?: TConclusionVerdict
}
