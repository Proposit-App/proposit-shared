import type { TProjectReactiveSnapshot } from "./engine.js"
import type { TPropositionalExpressionCombined } from "../schemas/logic.js"

/**
 * Pure operator-inference for the skeleton-building authoring UX, over the
 * shared engine snapshot. Consumers (server + mobile) render uncommitted
 * "skeleton" nodes so a premise is built by direct manipulation; these
 * functions decide the operator a skeleton takes and how a "+" commit
 * materializes. They never touch UI/render types and never run mutations — the
 * consumer's executor runs the engine mutations named by the returned plan.
 */

/** Operators a skeleton node can take (wider than committed operator cycling). */
export type TSkeletonOperator = "and" | "or" | "implies" | "iff"

/** The default operator a freshly-spawned skeleton operator takes. */
export function defaultSkeletonOperator(root: boolean): TSkeletonOperator {
    return root ? "implies" : "and"
}

/**
 * Decide how a selected claim should be wrapped. `root` is true when the
 * claim's expression has no non-`not` operator ancestor — i.e. wrapping it
 * makes the skeleton operator the new premise root (lone-claim → inference).
 * Returns null when the expression can't be located.
 */
export function computeWrap(
    expressionId: string,
    premiseId: string,
    snapshot: TProjectReactiveSnapshot
): {
    premiseId: string
    root: boolean
    operator: TSkeletonOperator
    cyclable: boolean
} | null {
    const premiseSnap = snapshot.premises[premiseId]
    if (!premiseSnap) return null
    const expressions = premiseSnap.expressions
    const expr = expressions[expressionId]
    if (!expr) return null

    let root = true
    let cursor: string | null = expr.parentId ?? null
    while (cursor) {
        const parent = expressions[cursor]
        if (!parent) break
        if (parent.type === "operator" && parent.operator !== "not") {
            root = false
            break
        }
        cursor = parent.parentId ?? null
    }

    // The engine's create-expression-with-operator flattens a new sibling into
    // an enclosing `and`/`or` and ignores the requested operator. So when the
    // claim's DIRECT parent is `and`/`or`, the skeleton operator is pinned to
    // that operator (non-cyclable) — anything else would be silently dropped.
    const directParent = expr.parentId ? expressions[expr.parentId] : null
    if (
        directParent?.type === "operator" &&
        (directParent.operator === "and" || directParent.operator === "or")
    ) {
        return {
            premiseId,
            root,
            operator: directParent.operator,
            cyclable: false,
        }
    }

    // Otherwise the wrap creates a fresh operator (engine honors it): root
    // defaults to the inference operator (lone-claim fix); non-root to `and`.
    // The cycle range is driven by `root`.
    return {
        premiseId,
        root,
        operator: defaultSkeletonOperator(root),
        cyclable: true,
    }
}

/** What a skeleton-claim "+" commits, captured when the modal opens. */
export type TSkeletonCommitTarget =
    | { kind: "empty-leg"; premiseId: string; leg: "first" | "second" }
    | {
          kind: "wrap"
          premiseId: string
          wrappedExpressionId: string
          root: boolean
          /** The wrapped real claim is the consequent (consequent leg filled
           *  first) → the new claim binds as the antecedent. */
          existingIsConsequent?: boolean
      }

/**
 * The materialization route for a skeleton commit:
 *  - `lone`: bind the new claim as the premise root (degrade-to-lone-claim —
 *    the lone-conclusion fix). Also the empty-premise leg case.
 *  - `wrap-associative`: the skeleton operator matches the enclosing N-ary
 *    operator, so the new claim binds as a sibling of it (flatten, no new
 *    operator) — associative normalization.
 *  - `wrap-nest`: create a new operator wrapping the real expression + the new
 *    claim's variable.
 */
export type TSkeletonCommitPlan =
    | { route: "lone"; premiseId: string }
    | {
          route: "wrap-associative"
          premiseId: string
          parentId: string
          afterExpressionId: string
      }
    | {
          route: "wrap-nest"
          premiseId: string
          targetExpressionId: string
          operator: TSkeletonOperator
          /**
           * Operand side of the wrapped (existing) expression. Default "after"
           * → it becomes the antecedent (position 0). "before" → it becomes the
           * consequent (position 1) — used when extending a lone negated claim
           * so the negation stays the conclusion: `implies(newLeg, NOT(A))`.
           */
          direction?: "before" | "after"
      }

/**
 * If `expressionId`'s ancestor chain up to the premise root consists solely of
 * `not` operators (a lone negated claim), return the outermost (root) NOT
 * operator's id — the wrappable unit. Otherwise null: a positive lone claim
 * (no NOT ancestor) or a negation nested inside another operator.
 */
export function rootNegationUnitId(
    expressions: Record<string, TPropositionalExpressionCombined>,
    expressionId: string
): string | null {
    const expr = expressions[expressionId]
    if (!expr) return null
    let outermostNot: string | null = null
    let cursor = expr.parentId ? expressions[expr.parentId] : null
    while (cursor) {
        if (cursor.type !== "operator" || cursor.operator !== "not") {
            return null
        }
        outermostNot = cursor.id
        cursor = cursor.parentId ? expressions[cursor.parentId] : null
    }
    return outermostNot
}

/**
 * Decide how a skeleton "+" commit materializes, given the target, the current
 * (possibly cycled) skeleton operator, and the snapshot. Pure — the executor
 * runs the chosen engine mutations.
 *
 * The route mirrors what the engine's create-expression-with-operator actually
 * does: when the wrapped expression's DIRECT parent is `and`/`or`, the engine
 * adds the new claim as a sibling of that operator and ignores the requested
 * operator — so we route `wrap-associative` regardless of `operator` (the UI
 * pins the skeleton operator to the parent's in this case, so they agree).
 * Otherwise the engine wraps the target in a fresh operator that honors
 * `operator`, so we route `wrap-nest`. (A formula wrapper between the claim and
 * its operator falls through to nest — correct, just not maximally flat.)
 */
export function planSkeletonCommit(args: {
    target: TSkeletonCommitTarget
    operator: TSkeletonOperator
    snapshot: TProjectReactiveSnapshot
}): TSkeletonCommitPlan {
    const { target, operator, snapshot } = args
    if (target.kind === "empty-leg") {
        return { route: "lone", premiseId: target.premiseId }
    }

    const premiseSnap = snapshot.premises[target.premiseId]
    const expressions: Record<string, TPropositionalExpressionCombined> =
        premiseSnap?.expressions ?? {}

    // Extending a lone negated claim into an inference keeps the negation as
    // the conclusion: wrap the whole NOT-unit, with the existing claim on the
    // consequent side (direction "before") → implies(newLeg, NOT(A)).
    const negationUnitId = rootNegationUnitId(
        expressions,
        target.wrappedExpressionId
    )
    if (negationUnitId) {
        return {
            route: "wrap-nest",
            premiseId: target.premiseId,
            targetExpressionId: negationUnitId,
            operator,
            direction: "before",
        }
    }

    const expr = expressions[target.wrappedExpressionId]
    const parentId = expr?.parentId ?? null
    const parent = parentId ? expressions[parentId] : null

    if (
        parentId &&
        parent?.type === "operator" &&
        (parent.operator === "and" || parent.operator === "or")
    ) {
        return {
            route: "wrap-associative",
            premiseId: target.premiseId,
            parentId,
            afterExpressionId: target.wrappedExpressionId,
        }
    }

    return {
        route: "wrap-nest",
        premiseId: target.premiseId,
        targetExpressionId: target.wrappedExpressionId,
        operator,
        // Existing claim is the consequent (consequent leg filled first) →
        // wrap with the new claim as the antecedent: implies(newLeg, existing).
        ...(target.existingIsConsequent
            ? { direction: "before" as const }
            : {}),
    }
}
