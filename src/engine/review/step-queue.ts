import type { ProjectEngine } from "../mutations/types.js"
import type { UUID } from "../../schemas/common.js"
import { collectArgumentReferencedClaims } from "@proposit/proposit-core"
import { toEvaluationContext } from "./evaluation.js"

export interface TOperatorQueueEntry {
    premiseId: UUID
    scope: "premise"
}
export type TStepQueue =
    | { kind: "claim"; items: UUID[] }
    | { kind: "operator"; items: TOperatorQueueEntry[] }

export function buildClaimQueue(argEngine: ProjectEngine): UUID[] {
    const ctx = toEvaluationContext(argEngine)
    return collectArgumentReferencedClaims(ctx).claimIds
}

/**
 * The premises a reviewer is asked to render an operator verdict on, in
 * proof order (supporting first, conclusion last).
 *
 * Two gates, and both are narrowing:
 *
 * 1. `type === "derivation"` premises are excluded. They are engine-managed
 *    single-antecedent wiring, not user-authored inference steps — a claim
 *    carrying at least one citation mints one shaped `implies(citation_var, Q)`,
 *    which is an inference with a decidable operator and would otherwise pass
 *    every other gate and be rendered as a numbered premise. A reviewer cannot
 *    meaningfully accept or reject wiring the engine generated on their behalf.
 *    (Naked-Q derivation premises self-exclude via gate 2 only incidentally.)
 * 2. A premise with no decidable operator expression is excluded, because there
 *    is nothing on it to decide. This routinely drops the conclusion premise:
 *    the common authored shape asserts a single claim as a bare variable and
 *    leaves the inferring to the supporting premises.
 *
 * Consequence for callers: the length of this queue is **not** the argument's
 * premise count and must not be labelled as one. It is a subset of the
 * user-authored premises in both directions relative to any "N premises"
 * header — smaller by every operator-free premise.
 */
export function buildOperatorQueue(
    argEngine: ProjectEngine
): TOperatorQueueEntry[] {
    const out: TOperatorQueueEntry[] = []
    const premises = [
        ...argEngine.listSupportingPremises(),
        ...(argEngine.getConclusionPremise()
            ? [argEngine.getConclusionPremise()!]
            : []),
    ]
    for (const p of premises) {
        if (p.toPremiseData().type === "derivation") continue
        if (p.getDecidableOperatorExpressions().length > 0) {
            out.push({ premiseId: p.getId(), scope: "premise" })
        }
    }
    return out
}

export function advanceQueue(params: {
    queue: TStepQueue
    currentIndex: number
    skippedKeys: Set<string>
    decidedKeys: Set<string>
}): { nextIndex: number; insertRequeueNotice: boolean } | { done: true } {
    const items =
        params.queue.kind === "claim"
            ? params.queue.items
            : params.queue.items.map((i) => i.premiseId)
    const next = params.currentIndex + 1
    if (next < items.length)
        return { nextIndex: next, insertRequeueNotice: false }
    const remaining = items.findIndex(
        (k) => params.skippedKeys.has(k) && !params.decidedKeys.has(k)
    )
    if (remaining < 0) return { done: true }
    return { nextIndex: remaining, insertRequeueNotice: true }
}
