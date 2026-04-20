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
