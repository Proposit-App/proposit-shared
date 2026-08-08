import type { TCorePropositionalExpression } from "@proposit/proposit-core"

/** The narrow premise view both queues and the decision-target rule need. */
interface TDecidablePremise {
    getDecidableOperatorExpressions(): TCorePropositionalExpression[]
}

/**
 * The one operator a reviewer decides on for this premise: its outermost
 * operator that isn't `not`, recursing through `not` — so `¬(A → B)` presents
 * the `→`, and a bare `¬Q` has none and is not offered at all.
 *
 * Every other operator in the premise is left unassigned and evaluates
 * normally. That is what stops an accepted `(A ∧ B) → C` from also marking the
 * `∧` accepted, which the evaluator would read as an assertion that each
 * conjunct holds — inventing values for `A` and `B` nobody supplied.
 *
 * Core's `getDecidableOperatorExpressions()` is a rooted pre-order walk that
 * skips `not` operators and non-operator nodes, so its first element is exactly
 * the outermost decidable operator and the list is empty exactly when there is
 * none.
 */
export function outermostDecidableOperator(
    premise: TDecidablePremise
): TCorePropositionalExpression | undefined {
    return premise.getDecidableOperatorExpressions()[0]
}
