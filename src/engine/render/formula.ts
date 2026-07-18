import type { TProjectReactiveSnapshot } from "../engine.js"
import type {
    TPropositionalExpressionCombined,
    TPropositionalVariable,
} from "../../schemas/logic.js"

// Logical-operator glyphs for the symbolic formula view. `not` is a unary
// prefix; the binary operators join their operands infix.
const OPERATOR_GLYPH: Record<"and" | "or" | "implies" | "iff", string> = {
    and: "∧",
    or: "∨",
    implies: "→",
    iff: "↔",
}

export type TPremiseFormula = {
    premiseId: string
    role: "conclusion" | "supporting"
    title: string | null
    formula: string
}

export type TArgumentFormula = {
    premises: TPremiseFormula[]
    // Symbol → claim title, so a reader can map glyphs back to prose. Only
    // symbols that appear in a rendered formula and resolve to a titled claim
    // are listed.
    legend: { symbol: string; label: string }[]
}

// Build a symbolic infix formula for every non-derivation premise, plus a
// legend mapping each variable symbol to its claim title. Derivation premises
// are engine-managed wiring rather than authored inference steps, so they are
// skipped (mirrors buildTextTree).
export function buildArgumentFormula(
    snapshot: TProjectReactiveSnapshot
): TArgumentFormula {
    const conclusionPremiseId = snapshot.roles.conclusionPremiseId
    const premises: TPremiseFormula[] = []
    const usedSymbols = new Set<string>()

    for (const [premiseId, premiseSnap] of Object.entries(snapshot.premises)) {
        if (premiseSnap.premise.type === "derivation") continue
        const rootId = premiseSnap.rootExpressionId
        const formula =
            rootId === undefined
                ? ""
                : renderExpression(
                      rootId,
                      premiseSnap.expressions,
                      snapshot.variables,
                      usedSymbols,
                      true
                  )
        premises.push({
            premiseId,
            role:
                premiseId === conclusionPremiseId ? "conclusion" : "supporting",
            title: premiseSnap.premise.title ?? null,
            formula,
        })
    }

    const legend: { symbol: string; label: string }[] = []
    const seen = new Set<string>()
    for (const variable of Object.values(snapshot.variables)) {
        if (!usedSymbols.has(variable.symbol) || seen.has(variable.symbol))
            continue
        const claimId = "claimId" in variable ? variable.claimId : null
        const claim = claimId ? snapshot.claims[claimId] : undefined
        const label = claim?.type === "normal" ? (claim.title ?? "") : ""
        if (label.length > 0) {
            legend.push({ symbol: variable.symbol, label })
            seen.add(variable.symbol)
        }
    }

    return { premises, legend }
}

function childExpressions(
    parentId: string,
    expressions: Record<string, TPropositionalExpressionCombined>
): TPropositionalExpressionCombined[] {
    return Object.values(expressions)
        .filter((e) => e.parentId === parentId)
        .sort((a, b) => a.position - b.position)
}

// Render an expression subtree to an infix string. `isRoot` suppresses the
// outermost parentheses so a whole-premise formula isn't needlessly wrapped.
function renderExpression(
    exprId: string,
    expressions: Record<string, TPropositionalExpressionCombined>,
    variables: Record<string, TPropositionalVariable>,
    usedSymbols: Set<string>,
    isRoot: boolean
): string {
    const expr = expressions[exprId]
    if (expr === undefined) return ""

    if (expr.type === "variable") {
        const variable = variables[expr.variableId]
        if (variable === undefined) return "?"
        usedSymbols.add(variable.symbol)
        return variable.symbol
    }

    if (expr.type === "formula") {
        // A formula node groups a subtree; render its children (usually one).
        const parts = childExpressions(exprId, expressions).map((child) =>
            renderExpression(
                child.id,
                expressions,
                variables,
                usedSymbols,
                false
            )
        )
        return parts.join(" ")
    }

    // Operator node.
    if (expr.operator === "not") {
        const first = childExpressions(exprId, expressions)[0]
        const inner =
            first === undefined
                ? ""
                : renderExpression(
                      first.id,
                      expressions,
                      variables,
                      usedSymbols,
                      false
                  )
        return `¬${inner}`
    }

    const glyph = OPERATOR_GLYPH[expr.operator]
    const parts = childExpressions(exprId, expressions).map((child) =>
        renderExpression(child.id, expressions, variables, usedSymbols, false)
    )
    const joined = parts.join(` ${glyph} `)
    return isRoot ? joined : `(${joined})`
}
