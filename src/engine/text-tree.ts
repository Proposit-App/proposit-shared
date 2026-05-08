import type { TProjectReactiveSnapshot } from "./engine.js"
import type {
    TPropositionalExpressionCombined,
    TLogicalOperatorType,
} from "../schemas/logic.js"

/** Operator display labels for the text view. */
export const OPERATOR_LABELS: Record<
    Exclude<TLogicalOperatorType, "not">,
    string
> = {
    and: "and",
    or: "or",
    implies: "is true if",
    iff: "is true if and only if",
}

export type TTextTreeItem =
    | {
          type: "premise-header"
          premiseId: string
          role: "conclusion" | "supporting"
          title: string | null
          premiseType: "freeform" | "derivation"
      }
    | {
          type: "claim"
          expressionId: string
          variableId: string
          claimId: string | null
          claimTitle: string
          claimBody: string
          claimType: "normal" | "citation"
          negated: boolean
          isConclusion: boolean
          depth: number
      }
    | {
          type: "operator"
          operator: Exclude<TLogicalOperatorType, "not">
          label: string
          depth: number
      }
    | {
          type: "empty-premise"
          premiseId: string
      }

/**
 * Build a text-tree for a single premise. Emits walk items only (no
 * premise-header). Use when rendering a standalone premise preview.
 */
export function buildPremiseTextTree(
    snapshot: TProjectReactiveSnapshot,
    premiseId: string
): TTextTreeItem[] {
    const premiseSnap = snapshot.premises[premiseId]
    if (!premiseSnap) return []
    const isConclusion = snapshot.roles.conclusionPremiseId === premiseId
    const rootExprId = premiseSnap.rootExpressionId
    if (!rootExprId) return [{ type: "empty-premise", premiseId }]

    const items: TTextTreeItem[] = []
    walkPremiseExpression({
        exprId: rootExprId,
        premiseExpressions: premiseSnap.expressions,
        variables: snapshot.variables,
        claims: snapshot.claims,
        negated: false,
        depth: 0,
        isConclusion,
        items,
    })
    return items
}

function getChildExpressions(
    parentId: string,
    premiseExpressions: Record<string, TPropositionalExpressionCombined>
): TPropositionalExpressionCombined[] {
    return Object.values(premiseExpressions)
        .filter((e) => e.parentId === parentId)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
}

function walkPremiseExpression(args: {
    exprId: string
    premiseExpressions: Record<string, TPropositionalExpressionCombined>
    variables: TProjectReactiveSnapshot["variables"]
    claims: TProjectReactiveSnapshot["claims"]
    negated: boolean
    depth: number
    isConclusion: boolean
    items: TTextTreeItem[]
}): void {
    const {
        exprId,
        premiseExpressions,
        variables,
        claims,
        negated,
        depth,
        isConclusion,
        items,
    } = args
    const expr = premiseExpressions[exprId]
    if (!expr) return

    if (expr.type === "variable") {
        const variable = variables[expr.variableId]
        let claimId: string | null = null
        let claimTitle = ""
        let claimBody = ""
        let claimType: "normal" | "citation" = "normal"
        if (variable && "claimId" in variable) {
            claimId = variable.claimId
            const claim = claims[variable.claimId]
            if (claim) {
                claimTitle = claim.title
                claimBody = claim.body
                claimType = claim.type ?? "normal"
            }
        }
        items.push({
            type: "claim",
            expressionId: expr.id,
            variableId: expr.variableId,
            claimId,
            claimTitle,
            claimBody,
            claimType,
            negated,
            isConclusion,
            depth,
        })
        return
    }

    if (expr.type === "formula") {
        const children = getChildExpressions(exprId, premiseExpressions)
        for (const child of children) {
            walkPremiseExpression({
                ...args,
                exprId: child.id,
                depth: depth + 1,
            })
        }
        return
    }

    if (expr.type === "operator") {
        if (expr.operator === "not") {
            const children = getChildExpressions(exprId, premiseExpressions)
            if (children.length > 0) {
                walkPremiseExpression({
                    ...args,
                    exprId: children[0].id,
                    negated: !negated,
                })
            }
            return
        }
        const children = getChildExpressions(exprId, premiseExpressions)
        const isInference =
            expr.operator === "implies" || expr.operator === "iff"
        const orderedChildren = isInference ? [...children].reverse() : children

        for (let i = 0; i < orderedChildren.length; i++) {
            walkPremiseExpression({
                ...args,
                exprId: orderedChildren[i].id,
                negated: false,
            })
            if (i < orderedChildren.length - 1) {
                items.push({
                    type: "operator",
                    operator: expr.operator,
                    label: OPERATOR_LABELS[expr.operator],
                    depth,
                })
            }
        }
    }
}

export function buildTextTree(
    snapshot: TProjectReactiveSnapshot
): TTextTreeItem[] {
    const items: TTextTreeItem[] = []
    const conclusionPremiseId = snapshot.roles.conclusionPremiseId

    // Sort premises: conclusion first, then supporting
    const premiseEntries = Object.entries(snapshot.premises)
    const sortedPremises = premiseEntries.sort(([idA], [idB]) => {
        const aIsConclusion = idA === conclusionPremiseId
        const bIsConclusion = idB === conclusionPremiseId
        if (aIsConclusion && !bIsConclusion) return -1
        if (!aIsConclusion && bIsConclusion) return 1
        return 0
    })

    for (const [premiseId, premiseSnap] of sortedPremises) {
        // Derivation premises render via citation badges + naked-Q indicator on
        // claim cards, computed from snapshot helpers — they should not produce
        // premise-header → operator → claim items in the flat text walk.
        if (premiseSnap.premise.type === "derivation") continue
        items.push({
            type: "premise-header",
            premiseId,
            role:
                premiseId === conclusionPremiseId ? "conclusion" : "supporting",
            title: premiseSnap.premise.title ?? null,
            premiseType: premiseSnap.premise.type ?? "freeform",
        })
        items.push(...buildPremiseTextTree(snapshot, premiseId))
    }

    return items
}
