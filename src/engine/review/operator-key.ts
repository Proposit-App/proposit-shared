import type { TOperatorAssignment } from "../../schemas/review.js"

/**
 * The identity of an operator decision — the single rule every lookup, dedupe,
 * and skip must use.
 *
 * A premise-scope decision is keyed by the bare `premiseId`: there is one
 * decision per premise, and the `expressionId` it carries is provenance for the
 * objection (which operator the reader was judging), never a second scope.
 * Including it would let one premise hold several conflicting decisions and
 * would make a key derived from the premise alone — which is all a caller
 * holding a queue entry or a contradiction has — fail to resolve.
 *
 * An expression-scope decision is about one operator, so both ids are identity.
 */
export function operatorAssignmentKey(
    o: Pick<TOperatorAssignment, "scope" | "premiseId" | "expressionId">
): string {
    return o.scope === "premise"
        ? o.premiseId
        : `${o.premiseId}:${o.expressionId ?? ""}`
}
