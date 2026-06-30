// Reconstruct the AUTHORED curated argument from the persisted shared-schema
// pieces of a stored argument. This is the inverse of the server seed recipe's
// `materializeExprTree` (proposit-server `database/seeds/lib/build-argument.ts`):
// it walks the flat persisted variables / premises / expressions back into the
// `{symbol,title,body}` claims and `ExprNode` premise trees a human authored,
// while dropping everything the engine synthesized.
//
// Two classes of synthesized structure are excluded:
//   - Derivation premises — the per-claim hidden premises `addClaim` mints. They
//     carry `type: "derivation"` (vs `"freeform"` for authored premises); we keep
//     only freeform premises.
//   - Premise-bound / auto variables — only CLAIM-bound variables (those that
//     reference a claim) become curated claims; premise-bound variables (which
//     have no `claimId`) are skipped.
// AN-normalization expression nodes (formula buffers, etc.) are NOT stripped:
// the curated form mirrors the persisted, normalized tree, so reconstructing the
// stored expression tree verbatim reproduces the authored structure.

import { isNormalClaim, type TClaim } from "../../schemas/model/claims.js"
import type { TArgument } from "../../schemas/model/arguments.js"
import type {
    TClaimBoundVariable,
    TPropositionalExpressionCombined,
    TPropositionalPremise,
    TPropositionalVariable,
} from "../../schemas/logic.js"
import type {
    CuratedArgument,
    CuratedClaim,
    CuratedPremise,
    ExprNode,
} from "../curated-argument/index.js"

// The persisted shared-schema pieces of one argument version. The P2 server CLI
// assembles this from `loadArgumentData(...)`. Array order is preserved into the
// curated output, so callers should pass arrays in a stable (authored) order.
export interface TArgumentLoweringInput {
    argument: TArgument
    claims: TClaim[]
    variables: TPropositionalVariable[]
    premises: TPropositionalPremise[]
    expressions: TPropositionalExpressionCombined[]
}

function isClaimBoundVariable(
    variable: TPropositionalVariable
): variable is TClaimBoundVariable {
    return "claimId" in variable
}

function buildExprNode(
    expression: TPropositionalExpressionCombined,
    childrenByParentId: Map<string, TPropositionalExpressionCombined[]>,
    variablesById: Map<string, TPropositionalVariable>
): ExprNode {
    if (expression.type === "variable") {
        const variable = variablesById.get(expression.variableId)
        if (!variable) {
            throw new Error(
                `Variable expression ${expression.id} references missing variable ${expression.variableId}`
            )
        }
        return { type: "variable", symbol: variable.symbol }
    }

    const children = (childrenByParentId.get(expression.id) ?? [])
        .slice()
        .sort((left, right) => left.position - right.position)
        .map((child) => buildExprNode(child, childrenByParentId, variablesById))

    if (expression.type === "operator") {
        return { type: "operator", operator: expression.operator, children }
    }
    return { type: "formula", children }
}

function buildPremiseTree(
    premiseId: string,
    expressionsByPremiseId: Map<string, TPropositionalExpressionCombined[]>,
    variablesById: Map<string, TPropositionalVariable>
): ExprNode {
    const expressions = expressionsByPremiseId.get(premiseId) ?? []
    const childrenByParentId = new Map<
        string,
        TPropositionalExpressionCombined[]
    >()
    let root: TPropositionalExpressionCombined | undefined
    for (const expression of expressions) {
        if (expression.parentId === null) {
            root = expression
            continue
        }
        const siblings = childrenByParentId.get(expression.parentId) ?? []
        siblings.push(expression)
        childrenByParentId.set(expression.parentId, siblings)
    }
    if (!root) {
        throw new Error(
            `Premise ${premiseId} has no root expression (parentId === null)`
        )
    }
    return buildExprNode(root, childrenByParentId, variablesById)
}

export function lowerArgumentToCurated(
    input: TArgumentLoweringInput
): CuratedArgument {
    const { argument, claims, variables, premises, expressions } = input

    const claimsById = new Map(claims.map((claim) => [claim.id, claim]))
    const variablesById = new Map(
        variables.map((variable) => [variable.id, variable])
    )

    // One curated claim per claim-bound variable, in input order.
    const curatedClaims: CuratedClaim[] = []
    for (const variable of variables) {
        if (!isClaimBoundVariable(variable)) {
            continue
        }
        const claim = claimsById.get(variable.claimId)
        if (!claim) {
            throw new Error(
                `Claim-bound variable "${variable.symbol}" references missing claim ${variable.claimId}`
            )
        }
        if (!isNormalClaim(claim)) {
            throw new Error(
                `Claim-bound variable "${variable.symbol}" references a non-normal claim ${claim.id}; curated arguments only represent normal claims`
            )
        }
        curatedClaims.push({
            symbol: variable.symbol,
            title: claim.title,
            body: claim.body,
        })
    }

    // Group expressions by their owning premise once.
    const expressionsByPremiseId = new Map<
        string,
        TPropositionalExpressionCombined[]
    >()
    for (const expression of expressions) {
        const list = expressionsByPremiseId.get(expression.premiseId) ?? []
        list.push(expression)
        expressionsByPremiseId.set(expression.premiseId, list)
    }

    // One curated premise per AUTHORED freeform premise, in input order.
    // Derivation premises (`type === "derivation"`) are engine-synthesized and
    // excluded.
    const curatedPremises: CuratedPremise[] = []
    for (const premise of premises) {
        if (premise.type === "derivation") {
            continue
        }
        curatedPremises.push({
            title: premise.title ?? null,
            role: premise.role,
            tree: buildPremiseTree(
                premise.id,
                expressionsByPremiseId,
                variablesById
            ),
        })
    }

    return {
        title: argument.title,
        description: argument.description ?? "",
        claims: curatedClaims,
        premises: curatedPremises,
    }
}
