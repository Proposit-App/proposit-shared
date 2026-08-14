import type { TProjectReactiveSnapshot } from "./engine.js"
import { isAxiomaticClaim } from "../schemas/model/claims.js"
import type { TPropositionalExpressionCombined } from "../schemas/logic.js"

// ── Claim proof state ─────────────────────────────────────────────────────

/**
 * Three-state proof posture for a claim, derived from its citation edges
 * and (if uncited) the shape of its derivation premise's antecedent.
 *
 * - `"citation-backed"`: the claim has at least one entry in
 *   `snapshot.citations`. Citation antecedents and axiom antecedents are
 *   mutually exclusive, so citation-edge presence is the load-bearing
 *   signal.
 * - `"axiom-backed"`: no citations AND the derivation premise's root is
 *   `implies(antecedent, Q)` whose antecedent variable resolves to a claim
 *   where `claim.type === "axiomatic"`.
 * - `"empty"`: neither of the above. Covers the naked-Q form (no
 *   antecedent yet), the absence of a derivation premise entirely (a
 *   conclusion claim, or a citation/axiomatic-typed claim), and defensive
 *   fallbacks for snapshot inconsistencies.
 */
export type TClaimProofState = "empty" | "axiom-backed" | "citation-backed"

/**
 * Compute a claim's three-state proof posture from the engine's reactive
 * snapshot.
 *
 * Algorithm:
 * 1. If `snapshot.citations[claimId]` is non-empty -> `"citation-backed"`.
 * 2. Else, locate the derivation premise where `premise.type ===
 *    "derivation"` and `derivedClaimId === claimId`. None found ->
 *    `"empty"`.
 * 3. Walk the premise's root expression: a bare-variable root -> `"empty"`
 *    (naked-Q form); an `implies` root -> continue to step 4; anything
 *    else -> `"empty"`.
 * 4. The antecedent (position-0 child of `implies`) is either a single
 *    variable expression or an `or` operator. The axiom path is only the
 *    single-variable form: resolve the antecedent variable's bound claim
 *    and check `isAxiomaticClaim`. True -> `"axiom-backed"`; otherwise
 *    -> `"empty"` (citation antecedents are already caught by step 1).
 */
export function getClaimProofState(
    claimId: string,
    snapshot: TProjectReactiveSnapshot
): TClaimProofState {
    const citationEdges = snapshot.citations[claimId]
    if (citationEdges && citationEdges.length > 0) {
        return "citation-backed"
    }

    const derivationPremiseSnap = Object.values(snapshot.premises).find(
        (premiseSnap) =>
            premiseSnap.premise.type === "derivation" &&
            "derivedClaimId" in premiseSnap.premise &&
            (premiseSnap.premise as { derivedClaimId: string | null })
                .derivedClaimId === claimId
    )
    if (!derivationPremiseSnap) {
        return "empty"
    }

    const rootExprId = derivationPremiseSnap.rootExpressionId
    if (!rootExprId) {
        return "empty"
    }
    const rootExpr = derivationPremiseSnap.expressions[rootExprId]
    if (!rootExpr) {
        return "empty"
    }
    // Naked-Q form — bare variable at the root.
    if (rootExpr.type === "variable") {
        return "empty"
    }
    if (rootExpr.type !== "operator" || rootExpr.operator !== "implies") {
        return "empty"
    }

    const exprs = Object.values(derivationPremiseSnap.expressions)
    // Relies on proposit-core's populate-from.ts writing a literal
    // `position: 0` for the antecedent slot of engine-synthesized derivation
    // premises (never the sparse/midpoint scheme freeform premises use). If
    // that writer ever changes, see the same fragility warning documented at
    // proposit-core's src/lib/grammar/repair.ts (~line 276).
    const antecedent = exprs.find(
        (expr) => expr.parentId === rootExpr.id && expr.position === 0
    )
    if (antecedent?.type !== "variable") {
        // Antecedent missing, or an OR/formula tree (citation n>=2 shape).
        // Citation backing was already caught above; this reads as "empty".
        return "empty"
    }
    const antecedentVar = snapshot.variables[antecedent.variableId]
    if (!antecedentVar || !("claimId" in antecedentVar)) {
        return "empty"
    }
    const antecedentClaim = snapshot.claims[antecedentVar.claimId]
    if (!antecedentClaim) {
        return "empty"
    }
    if (isAxiomaticClaim(antecedentClaim)) {
        return "axiom-backed"
    }
    return "empty"
}

/**
 * Unwrap a single `formula` layer: if `expr` is a `formula` with exactly
 * one child, return that child; if it is not a formula, return it
 * unchanged; if it is a malformed formula (zero or several children),
 * return `null`.
 */
function unwrapFormulaLayer(
    expr: TPropositionalExpressionCombined,
    exprList: TPropositionalExpressionCombined[]
): TPropositionalExpressionCombined | null {
    if (expr.type !== "formula") return expr
    const children = exprList.filter((e) => e.parentId === expr.id)
    if (children.length !== 1) return null
    return children[0] ?? null
}

/** Direct children of `parentId`, ordered by ascending (sparse) `position`. */
function childrenByPosition(
    parentId: string,
    exprList: TPropositionalExpressionCombined[]
): TPropositionalExpressionCombined[] {
    return exprList
        .filter((e) => e.parentId === parentId)
        .sort((a, b) => a.position - b.position)
}

/**
 * Build the set of claim ids that appear as the consequent (the
 * highest-position child) of any `implies` or `iff` operator in any
 * FREEFORM premise's expression tree. Resolves a single layer of `formula`
 * wrapping at the consequent slot; derivation premises are engine-managed
 * wiring, not user-authored inference steps, and are excluded.
 *
 * Sibling order is by ascending `position`, a sparse fractional index (a
 * binary operator's children land at e.g. 0 and 1073741823), so the
 * consequent is the highest-positioned child, not literally `position ===
 * 1`.
 */
export function consequentClaimIds(
    snapshot: TProjectReactiveSnapshot
): Set<string> {
    const set = new Set<string>()
    for (const premiseSnap of Object.values(snapshot.premises)) {
        if (premiseSnap.premise.type !== "freeform") continue
        const exprList = Object.values(premiseSnap.expressions)
        for (const expr of exprList) {
            if (
                expr.type !== "operator" ||
                (expr.operator !== "implies" && expr.operator !== "iff")
            ) {
                continue
            }
            const children = childrenByPosition(expr.id, exprList)
            const consequentChild = children[children.length - 1]
            if (!consequentChild) continue
            const candidate = unwrapFormulaLayer(consequentChild, exprList)
            if (candidate?.type !== "variable") continue
            const variable = snapshot.variables[candidate.variableId]
            if (variable && "claimId" in variable) {
                set.add(variable.claimId)
            }
        }
    }
    return set
}
