import type { TServerReview } from "../../schemas/model/review.js"
import type {
    TReviewDraft,
    TClaimAssignment,
    TOperatorAssignment,
    TTrivalentValue,
} from "../../schemas/review.js"
import type { TReviewUpdateRequest } from "../../schemas/api/review/index.js"
import type { UUID } from "../../schemas/common.js"

function serverValueToDraft(
    value: "true" | "false" | "unknown" | null
): TTrivalentValue {
    if (value === "true") return true
    if (value === "false") return false
    return null
}

function draftValueToServer(
    value: TTrivalentValue
): "true" | "false" | "unknown" | null {
    if (value === true) return "true"
    if (value === false) return "false"
    if (value === null) return "unknown"
    return null
}

export function serverReviewToDraft(review: TServerReview): TReviewDraft {
    const claimAssignments: Record<UUID, TClaimAssignment> = {}
    for (const a of review.claimAssignments) {
        const isUndecided = a.value === null && !a.skipped && !a.decidedAt
        if (isUndecided) continue
        claimAssignments[a.claimId] = {
            assignmentId: a.claimId,
            claimId: a.claimId,
            value: serverValueToDraft(a.value),
            skipped: a.skipped,
            reasonCode: (a.reasonCode ??
                undefined) as TClaimAssignment["reasonCode"],
            decidedAt: a.decidedAt ?? new Date(),
        }
    }

    const operatorAssignments: TOperatorAssignment[] = []
    for (const o of review.operatorAssignments) {
        if (!o.decision) continue
        operatorAssignments.push({
            assignmentId: `${o.premiseId}:${o.scope}:${o.expressionId ?? ""}`,
            premiseId: o.premiseId,
            expressionId: o.expressionId ?? undefined,
            scope: o.scope,
            decision: o.decision,
            reasonCode: (o.reasonCode ??
                undefined) as TOperatorAssignment["reasonCode"],
            decidedAt: o.decidedAt ?? new Date(),
        })
    }

    return {
        schemaVersion: 1,
        reviewId: review.id,
        argumentId: review.argumentId,
        argumentVersion: review.argumentVersion,
        userId: review.userId,
        createdAt: review.createdOn,
        updatedAt: review.updatedOn,
        phase: review.phase,
        currentStepIndex: review.currentStepIndex,
        claimAssignments,
        operatorAssignments,
    }
}

export function draftToUpdatePayload(
    draft: TReviewDraft
): TReviewUpdateRequest {
    return {
        phase: draft.phase,
        currentStepIndex: draft.currentStepIndex,
        claimAssignments: Object.values(draft.claimAssignments).map((a) => ({
            claimId: a.claimId,
            value: draftValueToServer(a.value),
            skipped: a.skipped,
            reasonCode: a.reasonCode ?? null,
            decidedAt: a.decidedAt ?? null,
        })),
        operatorAssignments: draft.operatorAssignments.map((o) => ({
            premiseId: o.premiseId,
            expressionId: o.expressionId ?? null,
            scope: o.scope,
            decision: o.decision,
            reasonCode: o.reasonCode ?? null,
            decidedAt: o.decidedAt ?? null,
        })),
    }
}

export function hasAnyDecisions(draft: TReviewDraft): boolean {
    if (Object.keys(draft.claimAssignments).length > 0) return true
    if (draft.operatorAssignments.length > 0) return true
    return false
}

/**
 * Finished means *reached the results step and coherent*. `phase === "done"` is
 * the persisted signal hydration reads, and a review the coherence gate
 * stopped carries `blocked` instead — so it can never reach a tally.
 */
export function isReviewComplete(draft: TReviewDraft): boolean {
    return draft.phase === "done"
}

export function isFullyDecided(draft: TReviewDraft): boolean {
    for (const a of Object.values(draft.claimAssignments)) {
        if (a.value === null && !a.skipped) return false
    }
    return true
}
