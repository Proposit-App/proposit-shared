import type { TReviewDraft } from "../../schemas/review.js"
import { operatorAssignmentKey } from "./operator-key.js"

/**
 * Hashes the material assignment fields (value, decision, scope, expressionId).
 *
 * Reason-code changes are NOT material — editing a reason without changing the
 * underlying decision should not invalidate `lastResult`'s fingerprint.
 */
export function materialFingerprint(draft: TReviewDraft): string {
    const parts: string[] = []
    const claims = Object.values(draft.claimAssignments).sort((a, b) =>
        a.claimId.localeCompare(b.claimId)
    )
    for (const c of claims) {
        parts.push(`c:${c.claimId}:${String(c.value)}:${c.skipped ? 1 : 0}`)
    }
    // Ordered by the one identity rule for an operator decision, not a local
    // copy of it: the completion gate now turns on whether two drafts hash the
    // same, so a second definition drifting from the first would decide whether
    // a reader is held at the gate.
    const ops = [...draft.operatorAssignments].sort((a, b) =>
        operatorAssignmentKey(a).localeCompare(operatorAssignmentKey(b))
    )
    for (const o of ops) {
        parts.push(
            `o:${o.premiseId}:${o.expressionId ?? ""}:${o.scope}:${o.decision}`
        )
    }
    return parts.join("|")
}
