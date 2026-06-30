// Authoring DSL for curated propositional arguments.
//
// This is a pure data module — no DOM, Node, or runtime dependencies. It defines
// the shape of a hand-authorable argument (claims + premises whose logical form
// is an `ExprNode` abstract syntax tree) plus the shorthand constructors used to
// build those trees by hand. Datasets such as `../historical-figures` store
// arguments as already-built `ExprNode` trees, so the constructors are not
// required to express the data — they are the documented vocabulary for anyone
// hand-editing or contributing a revised argument.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// These names intentionally match the curated-argument authoring vocabulary
// shared with the seed consumer, so they are not `T`-prefixed.
/* eslint-disable @typescript-eslint/naming-convention */
export type ExprNode =
    | { type: "variable"; symbol: string }
    | {
          type: "operator"
          operator: "and" | "or" | "not" | "implies" | "iff"
          children: ExprNode[]
      }
    | { type: "formula"; children: ExprNode[] }

export interface CuratedClaim {
    symbol: string
    title: string
    body: string
}

export interface CuratedPremise {
    title: string | null
    role: "conclusion" | "supporting"
    tree: ExprNode
}

export interface CuratedArgument {
    title: string
    description: string
    claims: CuratedClaim[]
    premises: CuratedPremise[]
}
/* eslint-enable @typescript-eslint/naming-convention */

// ---------------------------------------------------------------------------
// Shorthand constructors
// ---------------------------------------------------------------------------

export const v = (symbol: string): ExprNode => ({ type: "variable", symbol })

// A `formula` node must sit between non-NOT operators (e.g. `and(or(...), x)` is
// invalid; it must be `and(formula(or(...)), x)`). Auto-wrap non-NOT operator
// children below so call sites stay readable without manual `formula(...)`
// wrappers everywhere.
const wrapForFormula = (n: ExprNode): ExprNode =>
    n.type === "operator" && n.operator !== "not"
        ? { type: "formula", children: [n] }
        : n

export const formula = (child: ExprNode): ExprNode => ({
    type: "formula",
    children: [child],
})

export const and = (...children: ExprNode[]): ExprNode => ({
    type: "operator",
    operator: "and",
    children: children.map(wrapForFormula),
})

export const or = (...children: ExprNode[]): ExprNode => ({
    type: "operator",
    operator: "or",
    children: children.map(wrapForFormula),
})

export const not = (child: ExprNode): ExprNode => ({
    type: "operator",
    operator: "not",
    children: [child],
})

export const implies = (
    antecedent: ExprNode,
    consequent: ExprNode
): ExprNode => ({
    type: "operator",
    operator: "implies",
    children: [wrapForFormula(antecedent), wrapForFormula(consequent)],
})

export const iff = (left: ExprNode, right: ExprNode): ExprNode => ({
    type: "operator",
    operator: "iff",
    children: [wrapForFormula(left), wrapForFormula(right)],
})
