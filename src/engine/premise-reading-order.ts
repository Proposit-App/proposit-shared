import type { TProjectReactiveSnapshot } from "./engine.js"
import type { TPropositionalExpressionCombined } from "../schemas/logic.js"

/**
 * Order an argument's premises for reading so a reader following the
 * antecedent→consequent structure scrolls up as little as possible.
 *
 * The order is a pre-order depth-first traversal of the proof tree rooted at the
 * conclusion: each premise is followed by the premises that prove its
 * antecedents, recursively. Reading top-to-bottom, a premise's support always
 * sits below it. Premises the traversal never reaches (rebuttals, disconnected
 * fragments) are appended after the chain in lexicographic-id order.
 *
 * Pure and display-only — nothing here is persisted. Returns every premise id in
 * `snapshot.premises` exactly once; `buildTextTree` ranks its rows by this order.
 */
export function orderPremisesForReading(
    snapshot: TProjectReactiveSnapshot
): string[] {
    const { premises, variables } = snapshot

    // Deterministic base order, independent of snapshot iteration order. Matches
    // the engine's own premise enumeration and is the tie-break for siblings and
    // the append order for off-chain premises.
    const baseOrder = Object.keys(premises).sort((a, b) => a.localeCompare(b))

    // A signed claim reference: the same claim asserted positively vs. negatively
    // are distinct nodes, so a rebuttal concluding ¬B does not prove antecedent B.
    const sigKey = (claimId: string, negated: boolean): string =>
        `${negated ? "!" : ""}${claimId}`

    type TLeaves = { sigs: string[]; bound: string[] }

    const collectLeaves = (
        expressions: Record<string, TPropositionalExpressionCombined>,
        exprId: string | null | undefined,
        negated: boolean,
        into: TLeaves
    ): void => {
        if (!exprId) return
        const expr = expressions[exprId]
        if (!expr) return

        if (expr.type === "variable") {
            const variable = expr.variableId
                ? variables[expr.variableId]
                : undefined
            if (!variable) return
            if ("claimId" in variable && variable.claimId) {
                into.sigs.push(sigKey(variable.claimId, negated))
            } else if (
                "boundPremiseId" in variable &&
                variable.boundPremiseId
            ) {
                into.bound.push(variable.boundPremiseId)
            }
            return
        }

        const children = childExpressions(expressions, exprId)
        if (expr.type === "operator" && expr.operator === "not") {
            collectLeaves(expressions, children[0]?.id, !negated, into)
            return
        }
        // operator (and/or/implies/iff) and formula: walk every child in order.
        for (const child of children) {
            collectLeaves(expressions, child.id, negated, into)
        }
    }

    // Consequent signature(s) and support frontier for each premise.
    const consequentOf = new Map<string, string[]>() // premiseId → sigs it proves
    const frontierOf = new Map<string, TLeaves>() // premiseId → what it needs proven

    for (const premiseId of baseOrder) {
        const snap = premises[premiseId]
        const expressions = snap.expressions
        const rootId = snap.rootExpressionId
        const root = rootId ? expressions[rootId] : undefined

        const consequent: TLeaves = { sigs: [], bound: [] }
        const frontier: TLeaves = { sigs: [], bound: [] }

        if (
            root?.type === "operator" &&
            (root.operator === "implies" || root.operator === "iff")
        ) {
            // Highest-position child is the consequent; the rest are antecedents.
            const children = childExpressions(expressions, rootId!)
            const consequentChild = children[children.length - 1]
            const antecedentChildren = children.slice(0, -1)
            collectLeaves(expressions, consequentChild?.id, false, consequent)
            for (const child of antecedentChildren) {
                collectLeaves(expressions, child.id, false, frontier)
            }
        } else {
            // Bare assertion: it proves its own claim, and (for the conclusion)
            // its claim is the frontier from which we search for a deeper proof.
            collectLeaves(expressions, rootId, false, consequent)
            collectLeaves(expressions, rootId, false, frontier)
        }

        consequentOf.set(premiseId, consequent.sigs)
        frontierOf.set(premiseId, frontier)
    }

    // Reverse index: signature → premises that prove it (in base order).
    const provenBy = new Map<string, string[]>()
    for (const premiseId of baseOrder) {
        for (const sig of consequentOf.get(premiseId) ?? []) {
            const list = provenBy.get(sig)
            if (list) list.push(premiseId)
            else provenBy.set(sig, [premiseId])
        }
    }

    const order: string[] = []
    const visited = new Set<string>()

    const visit = (premiseId: string): void => {
        if (!premises[premiseId]) return // dangling id (e.g. stale conclusion role)
        if (visited.has(premiseId)) return
        visited.add(premiseId)
        order.push(premiseId)

        const frontier = frontierOf.get(premiseId) ?? { sigs: [], bound: [] }
        for (const sig of frontier.sigs) {
            for (const prover of provenBy.get(sig) ?? []) {
                if (!visited.has(prover)) visit(prover)
            }
        }
        for (const boundPremiseId of frontier.bound) {
            if (!visited.has(boundPremiseId)) visit(boundPremiseId)
        }
    }

    const conclusionPremiseId = snapshot.roles.conclusionPremiseId
    if (conclusionPremiseId) visit(conclusionPremiseId)

    // Off-chain premises: appended flat in base order, not DFS-expanded.
    for (const premiseId of baseOrder) {
        if (!visited.has(premiseId)) {
            visited.add(premiseId)
            order.push(premiseId)
        }
    }

    return order
}

function childExpressions(
    expressions: Record<string, TPropositionalExpressionCombined>,
    parentId: string
): TPropositionalExpressionCombined[] {
    return Object.values(expressions)
        .filter((e) => e.parentId === parentId)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
}
