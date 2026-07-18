import type { TTextTreeItem } from "../text-tree.js"

export type TLoneConclusion = {
    premiseId: string
    // The claim expression to wrap with an operator to form the inference.
    targetExpressionId: string
}

type TClaimItem = Extract<TTextTreeItem, { type: "claim" }>

// A "lone conclusion" is the conclusion premise whose body is a single claim
// with no operator — a standalone consequent with nothing implying it. Turning
// it into an inference wraps that claim's expression with an operator + a second
// operand. Returns the premise and the wrap-target expression, or null when the
// conclusion already has an inference (an operator row), holds more than one
// claim, or isn't a plain freeform premise.
export function findLoneConclusion(
    items: TTextTreeItem[]
): TLoneConclusion | null {
    for (let i = 0; i < items.length; i++) {
        const header = items[i]
        if (header?.type !== "premise-header") continue
        if (header.role !== "conclusion" || header.premiseType !== "freeform") {
            continue
        }
        // The premise's body: rows until the next premise-header.
        const claims: TClaimItem[] = []
        let hasOperator = false
        for (
            let j = i + 1;
            j < items.length && items[j]?.type !== "premise-header";
            j++
        ) {
            const row = items[j]
            if (row === undefined) continue
            if (row.type === "claim") claims.push(row)
            else if (row.type === "operator") hasOperator = true
        }
        const only = claims[0]
        if (!hasOperator && claims.length === 1 && only !== undefined) {
            return {
                premiseId: header.premiseId,
                targetExpressionId: only.expressionId,
            }
        }
        // Conclusion premise found but not lone — no further conclusion exists.
        return null
    }
    return null
}
