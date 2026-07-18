import type { TProjectReactiveSnapshot } from "../engine.js"
import type { TTextTreeItem } from "../text-tree.js"
import type { TClaimCitation } from "../../schemas/model/citations.js"
import type { TPropositionalExpressionCombined } from "../../schemas/logic.js"
import type { TLoneConclusion } from "./lone-conclusion.js"

// Which tab of the argument view a premise belongs to. A rebuttal (consequent
// exactly `NOT(single claim)`) lands on the Counterargument tab; everything else
// on the Original argument tab.
export type TArgumentTab = "original" | "counterargument"

/**
 * Unwrap a single `formula` layer: if `expr` is a `formula` with exactly one
 * child, return that child; if it is not a formula, return it unchanged; if it
 * is a malformed formula (zero or several children), return null.
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

// The consequent slot of a premise's root expression: the highest-positioned
// child of an `implies`/`iff` root (engine operand positions are sparse, so it
// is not literally `position === 1`), or the root itself for any other root (so
// a lone `NOT(A)` premise whose antecedent is not filled in yet also qualifies).
function consequentSlot(
    root: TPropositionalExpressionCombined,
    exprList: TPropositionalExpressionCombined[]
): TPropositionalExpressionCombined | undefined {
    if (
        root.type === "operator" &&
        (root.operator === "implies" || root.operator === "iff")
    ) {
        const children = exprList
            .filter((e) => e.parentId === root.id)
            .sort((a, b) => a.position - b.position)
        return children[children.length - 1]
    }
    return root
}

// The claim-bound variable expression a `not(...)` slot wraps, or null when the
// slot is not exactly `not(<single claim-bound variable>)` (a positive
// consequent, a negated compound, a double negation, or `not(implies(...))`).
function negatedClaimVariable(
    slot: TPropositionalExpressionCombined,
    exprList: TPropositionalExpressionCombined[],
    snapshot: TProjectReactiveSnapshot
): Extract<TPropositionalExpressionCombined, { type: "variable" }> | null {
    if (slot.type !== "operator" || slot.operator !== "not") return null
    const notChildren = exprList.filter((e) => e.parentId === slot.id)
    if (notChildren.length !== 1) return null
    const firstChild = notChildren[0]
    if (!firstChild) return null
    const inner = unwrapFormulaLayer(firstChild, exprList)
    if (inner?.type !== "variable") return null
    const variable = snapshot.variables[inner.variableId]
    return variable && "claimId" in variable ? inner : null
}

/**
 * Build the set of FREEFORM premise ids whose CONSEQUENT is exactly a negated
 * single claim — `not(<claim-bound variable>)`. These are the argument's
 * rebuttals; the text view routes them to the Counterargument tab and every
 * other premise to the Original tab. Partition is by consequent polarity only —
 * premise role is not consulted (a hand-built negated-consequent conclusion
 * would land here too).
 *
 * Excluded by construction: a positive consequent (`implies(P, Q)`), a negated
 * compound (`not(and(Q, R))`), a double negation (`not(not(A))`),
 * `not(implies(P, Q))`, and non-freeform (derivation) premises.
 */
export function counterargumentPremiseIds(
    snapshot: TProjectReactiveSnapshot
): Set<string> {
    const set = new Set<string>()
    for (const [premiseId, premiseSnap] of Object.entries(snapshot.premises)) {
        if (premiseSnap.premise.type !== "freeform") continue
        const exprList: TPropositionalExpressionCombined[] = Object.values(
            premiseSnap.expressions
        )
        const root = exprList.find((e) => e.parentId === null)
        if (!root) continue
        const slot = consequentSlot(root, exprList)
        if (!slot) continue
        const unwrapped = unwrapFormulaLayer(slot, exprList)
        if (!unwrapped) continue
        if (negatedClaimVariable(unwrapped, exprList, snapshot) !== null) {
            set.add(premiseId)
        }
    }
    return set
}

/**
 * A rebuttal's identity for the "go to" navigation affordance: which premise
 * carries the attack, and which rendered expression (the negated variable
 * inside the NOT, matching a claim card's expression id) to select when jumping
 * there.
 */
export type TAttackTarget = {
    premiseId: string
    consequentExpressionId: string
}

/**
 * Map from an attacked claim's id to the rebuttal that attacks it. Mirrors
 * `counterargumentPremiseIds`'s walk to the same `not(<claim-bound variable>)`
 * consequent shape, but keeps the resolved claim id and expression id instead of
 * discarding them — the caller needs both to render the attacked-claim's
 * surface and to drive the symmetric "go to" control.
 *
 * `consequentExpressionId` is the NOT-wrapped variable expression's own id (not
 * the NOT operator's id), so selecting it scrolls straight to that claim
 * instance. When a claim is (unusually) rebutted by more than one premise, the
 * first-encountered one wins — `snapshot.premises` iterates in a stable
 * created-order, so this is deterministic across reloads.
 */
export function attackTargetsByClaimId(
    snapshot: TProjectReactiveSnapshot
): Map<string, TAttackTarget> {
    const map = new Map<string, TAttackTarget>()
    for (const [premiseId, premiseSnap] of Object.entries(snapshot.premises)) {
        if (premiseSnap.premise.type !== "freeform") continue
        const exprList: TPropositionalExpressionCombined[] = Object.values(
            premiseSnap.expressions
        )
        const root = exprList.find((e) => e.parentId === null)
        if (!root) continue
        const slot = consequentSlot(root, exprList)
        if (!slot) continue
        const unwrapped = unwrapFormulaLayer(slot, exprList)
        if (!unwrapped) continue
        const inner = negatedClaimVariable(unwrapped, exprList, snapshot)
        if (inner === null) continue
        const variable = snapshot.variables[inner.variableId]
        if (variable && "claimId" in variable && !map.has(variable.claimId)) {
            map.set(variable.claimId, {
                premiseId,
                consequentExpressionId: inner.id,
            })
        }
    }
    return map
}

/**
 * Set of expressionIds whose direct parent (or formula-wrapped parent) is a NOT
 * operator. Used by the text view to render the ¬ badge and route the "is this
 * operator wrapped in NOT?" flag to the operator menu.
 */
export function wrappedOperatorExpressionIds(
    snapshot: TProjectReactiveSnapshot
): Set<string> {
    const set = new Set<string>()
    for (const ps of Object.values(snapshot.premises)) {
        const exprs: Record<string, TPropositionalExpressionCombined> =
            ps.expressions
        const exprList = Object.values(exprs)
        for (const e of exprList) {
            if (e.type !== "operator" || e.operator !== "not") continue
            const child = exprList.find((c) => c.parentId === e.id)
            if (!child) continue
            if (child.type === "formula") {
                const fmChild = exprList.find((c) => c.parentId === child.id)
                if (fmChild?.type === "operator") set.add(fmChild.id)
                continue
            }
            if (child.type === "operator") set.add(child.id)
        }
    }
    return set
}

/**
 * Build a Map keyed by citing claim id, value = the list of TClaimCitation edges
 * pointing into that claim, sorted by `createdOn` ascending.
 */
export function citationsByClaimId(
    snapshot: TProjectReactiveSnapshot
): Map<string, TClaimCitation[]> {
    const map = new Map<string, TClaimCitation[]>()
    for (const edges of Object.values(snapshot.citations)) {
        for (const edge of edges) {
            const list = map.get(edge.claimId) ?? []
            list.push(edge)
            map.set(edge.claimId, list)
        }
    }
    for (const list of map.values()) {
        list.sort(
            (a, b) =>
                new Date(a.createdOn).getTime() -
                new Date(b.createdOn).getTime()
        )
    }
    return map
}

// Rebuttals whose root IS the `not` operator — i.e. a lone `NOT(A)` premise with
// no antecedent (reason) yet. Each entry carries the wrap target for adding the
// antecedent: the NOT-root expression id. Wrapping the NOT-unit with `implies`
// (`direction: "before"`) yields `implies(reason, NOT(A))`, keeping the negation
// as the consequent; wrapping the bare variable would wrongly negate the whole
// inference.
export function loneRebuttalTargets(
    snapshot: TProjectReactiveSnapshot
): TLoneConclusion[] {
    const targets: TLoneConclusion[] = []
    for (const [premiseId, premiseSnap] of Object.entries(snapshot.premises)) {
        if (premiseSnap.premise.type !== "freeform") continue
        const exprList: TPropositionalExpressionCombined[] = Object.values(
            premiseSnap.expressions
        )
        const root = exprList.find((e) => e.parentId === null)
        if (!root) continue
        // Lone = the root itself is the negation (no implies/iff wrapping it).
        if (negatedClaimVariable(root, exprList, snapshot) !== null) {
            targets.push({ premiseId, targetExpressionId: root.id })
        }
    }
    return targets
}

// Split the flat text tree into just the rows belonging to `tab`. Walks
// `premise-header` items to track the current premise; a premise's rows go to
// the Counterargument tab when its id is in `counterSet`, else to Original. Rows
// before the first premise-header default to Original.
export function partitionItemsByTab(
    items: TTextTreeItem[],
    counterSet: ReadonlySet<string>,
    tab: TArgumentTab
): TTextTreeItem[] {
    const out: TTextTreeItem[] = []
    let currentTab: TArgumentTab = "original"
    for (const item of items) {
        if (item.type === "premise-header") {
            currentTab = counterSet.has(item.premiseId)
                ? "counterargument"
                : "original"
        }
        if (currentTab === tab) out.push(item)
    }
    return out
}
