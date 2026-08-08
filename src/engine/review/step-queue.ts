import type { ProjectEngine } from "../mutations/types.js"
import type { UUID } from "../../schemas/common.js"
import { collectArgumentReferencedClaims } from "@proposit/proposit-core"
import { outermostDecidableOperator } from "./decision-target.js"
import { toEvaluationContext } from "./evaluation.js"

export { outermostDecidableOperator }

export interface TOperatorQueueEntry {
    premiseId: UUID
    scope: "premise"
    /**
     * The premise's outermost decidable operator — what the decision is
     * recorded against, and what explains to the reader *what specifically* is
     * under judgment. The decision is nonetheless about the premise: rejecting
     * strikes the whole premise, never a subtree.
     */
    expressionId: UUID
    /**
     * Whether a *reject* verdict may be offered on this entry. False for the
     * conclusion premise: core exempts it from striking, so a rejection
     * recorded against it is ignored — the premise is still evaluated, still
     * derives the conclusion's value, and never appears in `struckPremiseIds`.
     * Offering the control would record a decision that changes nothing the
     * reader was told it changes. Accepting is unaffected and still meaningful:
     * it grants the inference for propagation.
     */
    rejectable: boolean
}
export type TStepQueue =
    | { kind: "claim"; items: UUID[] }
    | { kind: "operator"; items: TOperatorQueueEntry[] }

/**
 * The claims a reviewer is asked to render a True/False/Unknown verdict on, in
 * the order their premises are listed (supporting first, conclusion last), each
 * claim appearing once at its first reference.
 *
 * One gate, and it is narrowing: only claims whose bound claim is
 * `type === "normal"` survive. Citation and axiomatic claims are claim-bound
 * like any other — a claim carrying at least one citation mints a derivation
 * premise shaped `implies(citation_var, Q)`, and an axiom-backed claim mints
 * `implies(axiom_var, Q)` — so both antecedents would otherwise be collected
 * and offered as their own steps. Neither is a proposition the reviewer
 * authored or can judge:
 *
 *   - Both are titleless by schema (`CitationClaimSchema` and
 *     `AxiomaticClaimSchema` declare `title: null` / `body: null`; identity
 *     lives in `citation` / `axiom`), so any consumer rendering a queued
 *     claim's title renders an empty card.
 *   - An axiom's answer is discarded regardless: the engine forces
 *     axiom-bound variables to `true` before evaluating, and
 *     `buildExpressionAssignment` keeps them out of the assignment map because
 *     `evaluate()` rejects any caller-supplied key for one.
 *
 * This is the claim-side half of the gate `buildOperatorQueue` applies to
 * premises below, and it is narrowing for the same reason: engine-generated
 * wiring is not something a reviewer can meaningfully accept or reject.
 *
 * **Reachability is already expression-level.** Core's
 * `collectArgumentReferencedClaims` walks each premise's expression *tree* from
 * its root and records a claim only when it meets a variable expression bound to
 * one, so a claim-bound variable that no expression references is invisible
 * here — nothing extra is needed to keep it out, and a variable-level narrowing
 * would be a no-op.
 *
 * **A claim reachable only through a derivation premise is still offered**, and
 * that is the case behind a queue longer than the argument's rendered claim
 * count: the text tree skips derivation premises, so the reader is asked about a
 * proposition they cannot see anywhere in the argument. Dropping it here is not
 * safe today. Such a claim sits inside `implies(source_var, Q)`, which is
 * counted among the surviving supporting premises — measured on
 * `buildEngineWithDerivationOnlyClaim`, answering the step `true` yields
 * `survivingSupportingPremisesTrue: true` while leaving it unanswered yields
 * `null`. Removing the step would therefore degrade the argument assessment for
 * every reader who answered it. The narrowing belongs with whatever stops
 * counting an unreferenced claim's wiring as a supporting premise.
 *
 * Consequence for callers: the length of this queue is **not** the argument's
 * claim count and must not be labelled as one. Every source and every axiom the
 * argument cites is missing from it, and a claim reachable only through engine
 * wiring is present in it.
 */
export function buildClaimQueue(argEngine: ProjectEngine): UUID[] {
    const ctx = toEvaluationContext(argEngine)
    const { claimIds, byId } = collectArgumentReferencedClaims(ctx)
    return claimIds.filter((claimId) => {
        const boundClaim = argEngine.getClaim(
            claimId,
            byId[claimId].claimVersion
        )
        return boundClaim?.type === "normal"
    })
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
 * 2. A premise with no outermost decidable operator is excluded, because there
 *    is nothing on it to decide. This routinely drops the conclusion premise:
 *    the common authored shape asserts a single claim as a bare variable and
 *    leaves the inferring to the supporting premises. It also drops a premise
 *    whose whole content is a negated atom (`¬Q`), which has no decidable
 *    operator at any depth.
 *
 * The conclusion premise, when it does carry an operator, is offered
 * **accept-only** — see `rejectable` on {@link TOperatorQueueEntry}.
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
    const conclusionPremiseId = argEngine.getConclusionPremise()?.getId()
    const premises = [
        ...argEngine.listSupportingPremises(),
        ...(argEngine.getConclusionPremise()
            ? [argEngine.getConclusionPremise()!]
            : []),
    ]
    for (const p of premises) {
        if (p.toPremiseData().type === "derivation") continue
        const target = outermostDecidableOperator(p)
        if (target) {
            out.push({
                premiseId: p.getId(),
                scope: "premise",
                expressionId: target.id,
                rejectable: p.getId() !== conclusionPremiseId,
            })
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
