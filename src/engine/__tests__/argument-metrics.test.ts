import { describe, test, expect } from "vitest"
import {
    getClaimProofState,
    consequentClaimIds,
    computeCitationStrength,
    computeArgumentMetrics,
    detectEnthymemeWarnings,
} from "../argument-metrics.js"
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

function citationTypeClaim(id: string): TClaim {
    return {
        ...CLAIM_BASE,
        id,
        type: "citation",
        kind: null,
        title: null,
        body: null,
        titleContentHash: null,
        url: "https://example.com",
        citation: { type: "unparsed", text: "source" },
        citationContentHash: "ch",
        axiom: null,
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

describe("computeCitationStrength", () => {
    test("1. empty snapshot -> eligibleClaimCount 0, citedClaimCount 0, strength 1", () => {
        const snapshot = makeSnapshot({})
        expect(computeCitationStrength(snapshot)).toEqual({
            eligibleClaimCount: 0,
            citedClaimCount: 0,
            strength: 1,
        })
    })

    test("2. consequent claim, no citation -> excluded from eligibleClaimCount", () => {
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
        const snapshot = makeSnapshot({
            claims: { p: normalClaim("p"), q: normalClaim("q") },
            variables,
            premises,
        })
        // "p" is uncited & not a consequent -> eligible; "q" is a consequent -> excluded.
        expect(computeCitationStrength(snapshot)).toEqual({
            eligibleClaimCount: 1,
            citedClaimCount: 0,
            strength: 0,
        })
    })

    test("3. axiom-backed claim, no citation -> excluded from eligibleClaimCount", () => {
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
        expect(computeCitationStrength(snapshot)).toEqual({
            eligibleClaimCount: 0,
            citedClaimCount: 0,
            strength: 1,
        })
    })

    test("4. cited, non-consequent claim -> counted in both eligibleClaimCount and citedClaimCount", () => {
        const snapshot = makeSnapshot({
            claims: { c1: normalClaim("c1") },
            citations: { c1: [citationEdge("c1")] },
        })
        expect(computeCitationStrength(snapshot)).toEqual({
            eligibleClaimCount: 1,
            citedClaimCount: 1,
            strength: 1,
        })
    })

    test("5. uncited, non-consequent, non-axiom-backed claim -> counted in eligibleClaimCount only", () => {
        const snapshot = makeSnapshot({
            claims: { c1: normalClaim("c1") },
        })
        expect(computeCitationStrength(snapshot)).toEqual({
            eligibleClaimCount: 1,
            citedClaimCount: 0,
            strength: 0,
        })
    })

    test("6. axiomatic and citation-typed claims never enter the denominator", () => {
        const snapshot = makeSnapshot({
            claims: {
                axiom1: axiomaticClaim("axiom1"),
                cite1: citationTypeClaim("cite1"),
            },
        })
        expect(computeCitationStrength(snapshot)).toEqual({
            eligibleClaimCount: 0,
            citedClaimCount: 0,
            strength: 1,
        })
    })

    test("7. a claim that is both a consequent AND has its own citation edge -> excluded entirely", () => {
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
        const snapshot = makeSnapshot({
            claims: { p: normalClaim("p"), q: normalClaim("q") },
            variables,
            premises,
            citations: { q: [citationEdge("q")] },
        })
        // "q" is a consequent AND cited -> excluded from both numerator and
        // denominator, not merely from the numerator. Only "p" is eligible.
        expect(computeCitationStrength(snapshot)).toEqual({
            eligibleClaimCount: 1,
            citedClaimCount: 0,
            strength: 0,
        })
    })

    test("8. only axiomatic/citation-typed claims present -> eligibleClaimCount 0 via the type filter", () => {
        const snapshot = makeSnapshot({
            claims: { axiom1: axiomaticClaim("axiom1") },
        })
        const result = computeCitationStrength(snapshot)
        expect(result.eligibleClaimCount).toBe(0)
        expect(result.strength).toBe(1)
    })

    test("9. mixed fixture: 2 cited + 1 uncited eligible + 1 consequent + 1 axiom-backed -> strength 2/3", () => {
        const variables: Record<string, TVar> = {
            vAxiom: claimVar("vAxiom", "axiom1"),
            vAxiomConclusion: claimVar("vAxiomConclusion", "axiomBacked"),
            // References a claim id with no entry in `claims` below — only
            // present to give the freeform premise a structurally valid
            // antecedent slot; it must not itself skew the eligible count.
            vAntecedentOnly: claimVar("vAntecedentOnly", "antecedentOnly"),
            vConsequent: claimVar("vConsequent", "consequentExcluded"),
        }
        const premises: Record<string, TPremiseSnap> = {
            deriv1: makeDerivationPremise("deriv1", "axiomBacked", {
                op: "implies",
                children: [{ v: "vAxiom" }, { v: "vAxiomConclusion" }],
            }),
            p1: makeFreeformPremise("p1", {
                op: "implies",
                children: [{ v: "vAntecedentOnly" }, { v: "vConsequent" }],
            }),
        }
        const snapshot = makeSnapshot({
            claims: {
                axiom1: axiomaticClaim("axiom1"),
                axiomBacked: normalClaim("axiomBacked"),
                consequentExcluded: normalClaim("consequentExcluded"),
                cited1: normalClaim("cited1"),
                cited2: normalClaim("cited2"),
                uncited1: normalClaim("uncited1"),
            },
            citations: {
                cited1: [citationEdge("cited1")],
                cited2: [citationEdge("cited2")],
            },
            variables,
            premises,
        })
        // Eligible: cited1, cited2, uncited1 (axiomBacked excluded via
        // axiom-backed state; consequentExcluded excluded via consequent set).
        const result = computeCitationStrength(snapshot)
        expect(result.eligibleClaimCount).toBe(3)
        expect(result.citedClaimCount).toBe(2)
        expect(result.strength).toBeCloseTo(2 / 3)
    })
})

describe("detectEnthymemeWarnings", () => {
    test("10. compound antecedent stored as implies(formula(and(P,R)), Q) -> no warning", () => {
        const variables: Record<string, TVar> = {
            vP: claimVar("vP", "p"),
            vR: claimVar("vR", "r"),
            vQ: claimVar("vQ", "q"),
        }
        const premises: Record<string, TPremiseSnap> = {
            p1: makeFreeformPremise("p1", {
                op: "implies",
                children: [
                    {
                        formula: {
                            op: "and",
                            children: [{ v: "vP" }, { v: "vR" }],
                        },
                    },
                    { v: "vQ" },
                ],
            }),
        }
        const snapshot = makeSnapshot({ variables, premises })
        expect(detectEnthymemeWarnings(snapshot)).toEqual([])
    })

    test("11. bare antecedent P implies Q -> warning with antecedentConjunctCount 1", () => {
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
        expect(detectEnthymemeWarnings(snapshot)).toEqual([
            { premiseId: "p1", antecedentConjunctCount: 1 },
        ])
    })

    test("12. negated bare antecedent not(P) implies Q (not is AN-1-exempt, no formula wrap) -> warning, count 1", () => {
        const variables: Record<string, TVar> = {
            vP: claimVar("vP", "p"),
            vQ: claimVar("vQ", "q"),
        }
        const premises: Record<string, TPremiseSnap> = {
            p1: makeFreeformPremise("p1", {
                op: "implies",
                children: [{ op: "not", children: [{ v: "vP" }] }, { v: "vQ" }],
            }),
        }
        const snapshot = makeSnapshot({ variables, premises })
        expect(detectEnthymemeWarnings(snapshot)).toEqual([
            { premiseId: "p1", antecedentConjunctCount: 1 },
        ])
    })

    test("13. (P or R) implies Q, stored as implies(formula(or(P,R)), Q) -> warning (or does not exempt)", () => {
        const variables: Record<string, TVar> = {
            vP: claimVar("vP", "p"),
            vR: claimVar("vR", "r"),
            vQ: claimVar("vQ", "q"),
        }
        const premises: Record<string, TPremiseSnap> = {
            p1: makeFreeformPremise("p1", {
                op: "implies",
                children: [
                    {
                        formula: {
                            op: "or",
                            children: [{ v: "vP" }, { v: "vR" }],
                        },
                    },
                    { v: "vQ" },
                ],
            }),
        }
        const snapshot = makeSnapshot({ variables, premises })
        expect(detectEnthymemeWarnings(snapshot)).toEqual([
            { premiseId: "p1", antecedentConjunctCount: 1 },
        ])
    })

    test("14. implies with antecedent slot entirely absent (mid-edit premise) -> warning, count 0", () => {
        const variables: Record<string, TVar> = { vQ: claimVar("vQ", "q") }
        const exprs: Record<string, TExpr> = {}
        // Build only the consequent child of an `implies` root by hand — the
        // antecedent slot (position 0) is never created.
        const rootId = "p1#e0"
        exprs[rootId] = {
            ...EXPR_BASE,
            id: rootId,
            type: "operator",
            variableId: null,
            operator: "implies",
            premiseId: "p1",
            parentId: null,
            position: 0,
        } as unknown as TExpr
        const consequentId = "p1#e1"
        exprs[consequentId] = {
            ...EXPR_BASE,
            id: consequentId,
            type: "variable",
            variableId: "vQ",
            operator: null,
            premiseId: "p1",
            parentId: rootId,
            position: 1,
        } as unknown as TExpr
        const premises: Record<string, TPremiseSnap> = {
            p1: {
                premise: {
                    id: "p1",
                    type: "freeform",
                } as TPremiseSnap["premise"],
                rootExpressionId: rootId,
                expressions: exprs,
            },
        }
        const snapshot = makeSnapshot({ variables, premises })
        expect(detectEnthymemeWarnings(snapshot)).toEqual([
            { premiseId: "p1", antecedentConjunctCount: 0 },
        ])
    })

    test("15. a derivation premise shaped like implies with a single antecedent never appears in the output", () => {
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
        expect(detectEnthymemeWarnings(snapshot)).toEqual([])
    })

    test("16. non-implies roots (bare assertion, and/or root, iff root) never appear in the output", () => {
        const variables: Record<string, TVar> = {
            vA: claimVar("vA", "a"),
            vB: claimVar("vB", "b"),
            vC: claimVar("vC", "c"),
        }
        const premises: Record<string, TPremiseSnap> = {
            bare: makeFreeformPremise("bare", { v: "vA" }),
            andRoot: makeFreeformPremise("andRoot", {
                op: "and",
                children: [{ v: "vA" }, { v: "vB" }],
            }),
            iffRoot: makeFreeformPremise("iffRoot", {
                op: "iff",
                children: [{ v: "vA" }, { v: "vC" }],
            }),
            empty: makeFreeformPremise("empty", undefined),
        }
        const snapshot = makeSnapshot({ variables, premises })
        expect(detectEnthymemeWarnings(snapshot)).toEqual([])
    })
})

describe("computeArgumentMetrics", () => {
    test("17. combines both sub-results unchanged from calling them standalone", () => {
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
        const snapshot = makeSnapshot({
            claims: { p: normalClaim("p"), q: normalClaim("q") },
            citations: { p: [citationEdge("p")] },
            variables,
            premises,
        })
        const result = computeArgumentMetrics(snapshot)
        expect(result.citationStrength).toEqual(
            computeCitationStrength(snapshot)
        )
        expect(result.enthymemeWarnings).toEqual(
            detectEnthymemeWarnings(snapshot)
        )
    })
})
