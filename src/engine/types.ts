import type {
    TPropositionalExpressionTypes,
    TLogicalOperatorType,
} from "../schemas/logic.js"

// ── Internal tree-building types (not exposed in flow node data) ────

interface TCommonNodeData {
    childIds: Set<string>
}

export interface TVariableNodeData extends TCommonNodeData {
    premiseId: string
    variableId: string
    parentId: string | null
}

export interface TOperatorNodeData extends TCommonNodeData {
    premiseId: string
    parentId: string | null
    operator: TLogicalOperatorType
}

interface TCommonFormulaData {
    varDescendantIds: Set<string>
}

export interface TFormulaNodeData extends TCommonFormulaData, TCommonNodeData {
    premiseId: string
    parentId: string | null
}

export interface TNodeDataMap {
    variable: TVariableNodeData
    operator: TOperatorNodeData
    formula: TFormulaNodeData
}

export type TArgumentNodeTypes = TPropositionalExpressionTypes

export interface TBaseNode<T extends TArgumentNodeTypes> {
    id: string
    parentId?: string | undefined
    type: T
    data: TNodeDataMap[T]
}

type TVariableNode = TBaseNode<"variable">
type TOperatorNode = TBaseNode<"operator">
type TFormulaNode = TBaseNode<"formula">
type TAllArgumentNodes = TVariableNode | TOperatorNode | TFormulaNode
export type TArgumentNode<T extends TArgumentNodeTypes = TArgumentNodeTypes> =
    Extract<TAllArgumentNodes, { type: T }>
