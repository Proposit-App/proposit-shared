import type { TReviewDraft } from "../../schemas/review.js"

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
    const ops = [...draft.operatorAssignments].sort((a, b) => {
        const ak =
            a.scope === "premise"
                ? a.premiseId
                : `${a.premiseId}:${a.expressionId ?? ""}`
        const bk =
            b.scope === "premise"
                ? b.premiseId
                : `${b.premiseId}:${b.expressionId ?? ""}`
        return ak.localeCompare(bk)
    })
    for (const o of ops) {
        parts.push(
            `o:${o.premiseId}:${o.expressionId ?? ""}:${o.scope}:${o.decision}`
        )
    }
    return parts.join("|")
}
