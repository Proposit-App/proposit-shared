import type { TProjectReactiveSnapshot } from "../engine.js"
import type { TTextTreeItem } from "../text-tree.js"
import type { TLogicalOperatorType } from "../../schemas/logic.js"

/**
 * An operator item enriched with the source expression's id and the specific
 * sibling pair this label sits between, so a gear menu / cycle handler can
 * target the exact edge the user clicked. Replaces TTextTreeItem's bare
 * `operator` variant in the buildAtvEditableItems output.
 *
 * For n-ary operators (AND/OR with 3+ children), every label between consecutive
 * siblings shares the same `expressionId` (the parent operator's id), so
 * `sourceChildId`/`targetChildId` is what disambiguates them.
 *
 * Convention: `sourceChildId` is the child at the lower storage position;
 * `targetChildId` is at the higher storage position. This matches the
 * change-edge-operator contract regardless of the visual order (which is
 * reversed for IMPLIES/IFF).
 */
export type TAtvOperatorItem = {
    type: "operator"
    operator: Exclude<TLogicalOperatorType, "not">
    label: string
    depth: number
    expressionId: string
    sourceChildId: string
    targetChildId: string
}

/**
 * Edge metadata for a single operator label emitted by the text-tree walk. Each
 * n-ary operator with n children emits n-1 edges (one between each consecutive
 * sibling pair).
 */
export interface TOperatorLabelEdge {
    exprId: string
    sourceChildId: string
    targetChildId: string
}

/**
 * A slot anchor injected by `buildAtvEditableItems` to mark valid positions for
 * `(+)` insertion affordances. The anchor carries enough metadata for the slot
 * component to bind its insertion action without re-walking the tree.
 */
export type TAtvSlotItem =
    | {
          type: "slot"
          kind: "premise-list"
          /** Insert position among premises. Conclusion sorts first; supporting after. */
          beforePremiseId: string | null // null = append at end of supporting premises
      }
    | {
          type: "slot"
          kind: "premise-root"
          /** Empty premise — first child slot; parentId for createExpression is null. */
          premiseId: string
      }
    | {
          type: "slot"
          kind: "sibling"
          premiseId: string
          /** The operator that will be the parent of the new variable expression. */
          operatorExprId: string
          operatorType: Exclude<TLogicalOperatorType, "not" | "implies" | "iff">
          /** 0 = before-first, len = after-last, n = between child[n-1] and child[n] (storage order). */
          insertPosition: number
      }

/**
 * TAtvItem extends TTextTreeItem's union with:
 * - TAtvSlotItem: insertion affordances
 * - TAtvOperatorItem: operator items enriched with expressionId (replaces the
 *   bare `operator` variant from TTextTreeItem in buildAtvEditableItems output)
 */
export type TAtvItem =
    | Exclude<TTextTreeItem, { type: "operator" }>
    | TAtvOperatorItem
    | TAtvSlotItem

/**
 * Augment the flat `buildTextTree` item stream with slot anchors for `(+)`
 * insertion affordances. Slots are emitted at the start, between, and end of
 * each premise list, at the root of empty premises, and at every sibling
 * boundary inside n-ary operators (and/or). IMPLIES/IFF operators are full at
 * arity 2 and emit no slots. NOT operators have no rendered self in
 * `buildTextTree` and therefore emit no slots.
 *
 * The helper walks the underlying expression tree from
 * `snapshot.premises[premiseId].expressions` because the flat item stream
 * collapses formula nodes and reverses IMPLIES/IFF children — neither provides
 * enough context to compute correct `parentId` / `insertPosition` values for
 * slot anchors.
 */
export function buildAtvEditableItems(
    items: TTextTreeItem[],
    snapshot: TProjectReactiveSnapshot
): TAtvItem[] {
    const result: TAtvItem[] = []

    let currentPremiseId: string | null = null
    const slotIndex = buildTSlotIndex(snapshot)

    // Pre-compute per-premise in-order lists of operator-label edges. Each edge
    // carries the operator expression id PLUS the specific sibling pair this
    // label sits between — required so n-ary operators (3+ children) can route a
    // click on a specific between-sibling label to that exact edge instead of a
    // fixed first-and-last fallback.
    const labelEdgesByPremise = new Map<string, TOperatorLabelEdge[]>()
    const labelCursorByPremise = new Map<string, number>()
    for (const premiseId of Object.keys(snapshot.premises)) {
        labelEdgesByPremise.set(
            premiseId,
            collectOperatorLabelEdges(snapshot, premiseId)
        )
        labelCursorByPremise.set(premiseId, 0)
    }

    for (const item of items) {
        if (item.type === "premise-header") {
            result.push({
                type: "slot",
                kind: "premise-list",
                beforePremiseId: item.premiseId,
            })
            result.push(item)
            currentPremiseId = item.premiseId

            if (currentPremiseId !== null) {
                const beforeFirst =
                    slotIndex.beforeFirstByPremise.get(currentPremiseId)
                if (beforeFirst) result.push(beforeFirst)
            }
            continue
        }
        if (item.type === "empty-premise") {
            result.push({
                type: "slot",
                kind: "premise-root",
                premiseId: item.premiseId,
            })
            currentPremiseId = item.premiseId
            continue
        }
        if (item.type === "claim") {
            result.push(item)
            const afterSlot = slotIndex.afterByExpressionId.get(
                item.expressionId
            )
            if (afterSlot) result.push(afterSlot)
            continue
        }
        if (item.type === "operator" && currentPremiseId !== null) {
            const edges = labelEdgesByPremise.get(currentPremiseId) ?? []
            const cursor = labelCursorByPremise.get(currentPremiseId) ?? 0
            const edge = edges[cursor]
            labelCursorByPremise.set(currentPremiseId, cursor + 1)
            result.push({
                type: "operator",
                operator: item.operator,
                label: item.label,
                depth: item.depth,
                expressionId: edge?.exprId ?? "",
                sourceChildId: edge?.sourceChildId ?? "",
                targetChildId: edge?.targetChildId ?? "",
            })
            continue
        }
        if (item.type === "operator") {
            // currentPremiseId is null — emit without enrichment (shouldn't happen in practice)
            result.push({
                type: "operator",
                operator: item.operator,
                label: item.label,
                depth: item.depth,
                expressionId: "",
                sourceChildId: "",
                targetChildId: "",
            })
            continue
        }
    }

    result.push({ type: "slot", kind: "premise-list", beforePremiseId: null })
    return result
}

interface TSlotIndex {
    /** premise-id → before-first sibling slot for the premise's root n-ary operator. */
    beforeFirstByPremise: Map<string, TAtvSlotItem>
    /** expressionId → slot that should appear AFTER that expression in the rendered stream. */
    afterByExpressionId: Map<string, TAtvSlotItem>
}

function buildTSlotIndex(snapshot: TProjectReactiveSnapshot): TSlotIndex {
    const beforeFirstByPremise = new Map<string, TAtvSlotItem>()
    const afterByExpressionId = new Map<string, TAtvSlotItem>()

    for (const [premiseId, premiseSnap] of Object.entries(snapshot.premises)) {
        const expressions = premiseSnap.expressions

        for (const expr of Object.values(expressions)) {
            if (expr.type !== "operator") continue
            if (expr.operator !== "and" && expr.operator !== "or") continue

            const children = Object.values(expressions)
                .filter((e) => e.parentId === expr.id)
                .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))

            const parentExpr =
                expr.parentId !== null ? expressions[expr.parentId] : undefined
            const isRoot =
                expr.parentId === null ||
                (parentExpr?.type === "formula" && parentExpr.parentId === null)
            if (isRoot && children.length > 0) {
                beforeFirstByPremise.set(premiseId, {
                    type: "slot",
                    kind: "sibling",
                    premiseId,
                    operatorExprId: expr.id,
                    operatorType: expr.operator,
                    insertPosition: 0,
                })
            }

            for (let i = 0; i < children.length; i++) {
                afterByExpressionId.set(children[i].id, {
                    type: "slot",
                    kind: "sibling",
                    premiseId,
                    operatorExprId: expr.id,
                    operatorType: expr.operator,
                    insertPosition: i + 1,
                })
            }
        }
    }

    return { beforeFirstByPremise, afterByExpressionId }
}

// ── Operator-label expressionId walker ────────────────────────────────────────

type TExprEntry = {
    id: string
    type: string
    operator?: string | null
    parentId: string | null
    position?: number | null
}

/**
 * Return the in-order list of operator-label edges that correspond to the
 * `operator` items emitted by `buildTextTree` for a given premise. The walk
 * replicates buildTextTree's DFS order:
 *
 * - variable → leaf (no label)
 * - formula  → recurse children in ascending position order (no label for formula itself)
 * - not      → recurse single child unchanged (no label for NOT itself)
 * - n-ary op → walk children (REVERSED for implies/iff); emit one edge entry
 *              (operator id + adjacent sibling pair) BETWEEN each consecutive
 *              pair of children
 *
 * Each edge's `sourceChildId` is the child at the lower storage position;
 * `targetChildId` is at the higher position. For IMPLIES/IFF, the *display*
 * order is reversed (consequent shown first), but storage order — and thus
 * source/target — match the change-edge-operator contract regardless.
 */
export function collectOperatorLabelEdges(
    snapshot: TProjectReactiveSnapshot,
    premiseId: string
): TOperatorLabelEdge[] {
    const ps = snapshot.premises[premiseId]
    if (!ps) return []
    const expressions = ps.expressions as Record<string, TExprEntry>
    const rootExprId = ps.rootExpressionId
    if (!rootExprId) return []
    const out: TOperatorLabelEdge[] = []
    walkForLabels(rootExprId, expressions, out)
    return out
}

function walkForLabels(
    exprId: string,
    expressions: Record<string, TExprEntry>,
    out: TOperatorLabelEdge[]
): void {
    const expr = expressions[exprId]
    if (!expr) return

    if (expr.type === "variable") return

    if (expr.type === "formula") {
        const children = childrenOf(exprId, expressions)
        for (const child of children) walkForLabels(child.id, expressions, out)
        return
    }

    if (expr.type === "operator") {
        if (expr.operator === "not") {
            const children = childrenOf(exprId, expressions)
            if (children.length > 0 && children[0]) {
                walkForLabels(children[0].id, expressions, out)
            }
            return
        }

        // n-ary operator: implies/iff reverse their children for display.
        // childrenOf returns position-ascending; orderedChildren is the display
        // order (reversed for inference operators).
        const children = childrenOf(exprId, expressions)
        const isInference =
            expr.operator === "implies" || expr.operator === "iff"
        const orderedChildren = isInference ? [...children].reverse() : children

        for (let i = 0; i < orderedChildren.length; i++) {
            const child = orderedChildren[i]
            if (child) walkForLabels(child.id, expressions, out)
            if (i < orderedChildren.length - 1) {
                // Emit one edge BETWEEN consecutive children (not after the
                // last). The pair is the two display-adjacent children;
                // sourceChildId / targetChildId are sorted by storage position
                // so the change-edge-operator call gets a (lower, higher) pair
                // regardless of display order.
                const left = orderedChildren[i]
                const right = orderedChildren[i + 1]
                if (!left || !right) continue
                const leftPos = left.position ?? 0
                const rightPos = right.position ?? 0
                const sourceChildId = leftPos <= rightPos ? left.id : right.id
                const targetChildId = leftPos <= rightPos ? right.id : left.id
                out.push({
                    exprId: expr.id,
                    sourceChildId,
                    targetChildId,
                })
            }
        }
    }
}

function childrenOf(
    parentId: string,
    expressions: Record<string, TExprEntry>
): TExprEntry[] {
    return Object.values(expressions)
        .filter((e) => e.parentId === parentId)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
}
