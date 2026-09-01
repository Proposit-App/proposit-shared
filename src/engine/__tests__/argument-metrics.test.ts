import { describe, test, expect } from "vitest"
import { getClaimProofState, consequentClaimIds } from "../argument-metrics.js"
import type { TProjectReactiveSnapshot } from "../engine.js"
import type { TPropositionalExpressionCombined } from "../../schemas/logic.js"
import type { TClaim } from "../../schemas/model/claims.js"
import type { TClaimCitation } from "../../schemas/model/citations.js"

type TExpr = TPropositionalExpressionCombined
type TVar = TProjectReactiveSnapshot["variables"][string]
type TPremiseSnap = TProjectReactiveSnapshot["premises"][string]

const EXPR_BASE = {
    checksum: "c",
    descendantChecksum: null,
    combinedChecksum: "c",
    createdOn: new Date(),
    creatorId: "u",
    argumentId: "a",
    argumentVersion: 1,
}

const CLAIM_BASE = {
    originArgumentId: "a",
    version: 1,
    published: false,
    publishedOn: null,
    claimForkId: null,
    creatorId: "u",
    createdOn: new Date(),
    parentId: null,
    digest: "d",
}

function normalClaim(id: string): TClaim {
    return {
        ...CLAIM_BASE,
        id,
        type: "normal",
        kind: "claim",
        title: `title-${id}`,
        body: `body-${id}`,
        titleContentHash: "h",
        url: null,
        citation: null,
        citationContentHash: null,
        axiom: null,
    } as unknown as TClaim
}

function axiomaticClaim(id: string): TClaim {
    return {
        ...CLAIM_BASE,
        id,
        type: "axiomatic",
        kind: null,
        title: null,
        body: null,
        titleContentHash: null,
        url: null,
        citation: null,
        citationContentHash: null,
        axiom: "definition",
    } as unknown as TClaim
}

function citationEdge(claimId: string): TClaimCitation {
    return {
        id: `edge-${claimId}`,
        claimId,
        claimVersion: 1,
        supportingClaimId: "citation-claim",
        supportingClaimVersion: 1,
        checksum: "c",
        argumentId: "a",
        createdOn: new Date(),
    } as unknown as TClaimCitation
}

function claimVar(id: string, claimId: string): TVar {
    return {
        id,
        symbol: claimId,
        claimId,
        claimVersion: 1,
        premiseId: null,
        argumentId: "a",
        argumentVersion: 1,
        checksum: "c",
        descendantChecksum: null,
        combinedChecksum: "c",
        createdOn: new Date(),
        creatorId: "u",
    } as unknown as TVar
}

/**
 * A structural spec for building an expression subtree by hand, so premise
 * fixtures can pin down the exact wire shape (including a `formula` buffer
 * layer) rather than relying on any inference of it.
 */
type TExprSpec =
    | { v: string } // variable expression referencing a variableId
    | { op: "not" | "and" | "or" | "implies" | "iff"; children: TExprSpec[] }
    | { formula: TExprSpec }

function buildExprTree(
    premiseId: string,
    spec: TExprSpec,
    exprs: Record<string, TExpr>,
    parentId: string | null,
    position: number
): string {
    const id = `${premiseId}#e${Object.keys(exprs).length}`
    if ("v" in spec) {
        exprs[id] = {
            ...EXPR_BASE,
            id,
            type: "variable",
            variableId: spec.v,
            operator: null,
            premiseId,
            parentId,
            position,
        } as unknown as TExpr
        return id
    }
    if ("formula" in spec) {
        exprs[id] = {
            ...EXPR_BASE,
            id,
            type: "formula",
            variableId: null,
            operator: null,
            premiseId,
            parentId,
            position,
        } as unknown as TExpr
        buildExprTree(premiseId, spec.formula, exprs, id, 0)
        return id
    }
    exprs[id] = {
        ...EXPR_BASE,
        id,
        type: "operator",
        variableId: null,
        operator: spec.op,
        premiseId,
        parentId,
        position,
    } as unknown as TExpr
    spec.children.forEach((child, i) =>
        buildExprTree(premiseId, child, exprs, id, i)
    )
    return id
}

function makeFreeformPremise(
    id: string,
    rootSpec: TExprSpec | undefined
): TPremiseSnap {
    const exprs: Record<string, TExpr> = {}
    const rootExpressionId = rootSpec
        ? buildExprTree(id, rootSpec, exprs, null, 0)
        : undefined
    return {
        premise: { id, type: "freeform" } as TPremiseSnap["premise"],
        rootExpressionId,
        expressions: exprs,
    }
}

function makeDerivationPremise(
    id: string,
    derivedClaimId: string,
    rootSpec: TExprSpec
): TPremiseSnap {
    const exprs: Record<string, TExpr> = {}
    const rootExpressionId = buildExprTree(id, rootSpec, exprs, null, 0)
    return {
        premise: {
            id,
            type: "derivation",
            derivedClaimId,
        } as TPremiseSnap["premise"],
        rootExpressionId,
        expressions: exprs,
    }
}

function makeSnapshot(overrides: {
    claims?: Record<string, TClaim>
    citations?: Record<string, TClaimCitation[]>
    variables?: Record<string, TVar>
    premises?: Record<string, TPremiseSnap>
}): TProjectReactiveSnapshot {
    return {
        argument: {
            id: "a",
            version: 1,
        } as TProjectReactiveSnapshot["argument"],
        variables: overrides.variables ?? {},
        premises: overrides.premises ?? {},
        roles: { conclusionPremiseId: undefined },
        claims: overrides.claims ?? {},
        citations: overrides.citations ?? {},
        validationIssues: [],
    } as unknown as TProjectReactiveSnapshot
}

describe("getClaimProofState", () => {
    test("citation-backed: claim has a citation edge", () => {
        const snapshot = makeSnapshot({
            claims: { c1: normalClaim("c1") },
            citations: { c1: [citationEdge("c1")] },
        })
        expect(getClaimProofState("c1", snapshot)).toBe("citation-backed")
    })

    test("axiom-backed: derivation premise antecedent resolves to an axiomatic claim, no citation", () => {
        const variables: Record<string, TVar> = {
            vAxiom: claimVar("vAxiom", "axiom1"),
            vQ: claimVar("vQ", "c1"),
        }
        const premises: Record<string, TPremiseSnap> = {
            deriv1: makeDerivationPremise("deriv1", "c1", {
                op: "implies",
                children: [{ v: "vAxiom" }, { v: "vQ" }],
            }),
        }
        const snapshot = makeSnapshot({
            claims: { c1: normalClaim("c1"), axiom1: axiomaticClaim("axiom1") },
            variables,
            premises,
        })
        expect(getClaimProofState("c1", snapshot)).toBe("axiom-backed")
    })

    test("empty: no citation and no derivation premise at all", () => {
        const snapshot = makeSnapshot({ claims: { c1: normalClaim("c1") } })
        expect(getClaimProofState("c1", snapshot)).toBe("empty")
    })

    test("empty: naked-Q derivation premise (bare variable root, no antecedent yet)", () => {
        const variables: Record<string, TVar> = { vQ: claimVar("vQ", "c1") }
        const premises: Record<string, TPremiseSnap> = {
            deriv1: makeDerivationPremise("deriv1", "c1", { v: "vQ" }),
        }
        const snapshot = makeSnapshot({
            claims: { c1: normalClaim("c1") },
            variables,
            premises,
        })
        expect(getClaimProofState("c1", snapshot)).toBe("empty")
    })
})

describe("consequentClaimIds", () => {
    test("includes a claim that is the consequent of a freeform implies premise", () => {
        const variables: Record<string, TVar> = {
            vP: claimVar("vP", "p"),
            vQ: claimVar("vQ", "q"),
        }
        const premises: Record<string, TPremiseSnap> = {
            p1: makeFreeformPremise("p1", {
                op: "implies",
                children: [{ v: "vP" }, { v: "vQ" }],
            }),
        }
        const snapshot = makeSnapshot({ variables, premises })
        expect(consequentClaimIds(snapshot)).toEqual(new Set(["q"]))
    })

    test("includes a claim that is the consequent of a freeform iff premise", () => {
        const variables: Record<string, TVar> = {
            vP: claimVar("vP", "p"),
            vQ: claimVar("vQ", "q"),
        }
        const premises: Record<string, TPremiseSnap> = {
            p1: makeFreeformPremise("p1", {
                op: "iff",
                children: [{ v: "vP" }, { v: "vQ" }],
            }),
        }
        const snapshot = makeSnapshot({ variables, premises })
        expect(consequentClaimIds(snapshot)).toEqual(new Set(["q"]))
    })

    test("excludes a claim referenced only inside a derivation premise (freeform-only scan)", () => {
        const variables: Record<string, TVar> = {
            vAxiom: claimVar("vAxiom", "axiom1"),
            vQ: claimVar("vQ", "c1"),
        }
        const premises: Record<string, TPremiseSnap> = {
            deriv1: makeDerivationPremise("deriv1", "c1", {
                op: "implies",
                children: [{ v: "vAxiom" }, { v: "vQ" }],
            }),
        }
        const snapshot = makeSnapshot({ variables, premises })
        expect(consequentClaimIds(snapshot)).toEqual(new Set())
    })
})
