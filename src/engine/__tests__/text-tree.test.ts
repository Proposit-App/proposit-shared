import { describe, test, expect } from "vitest"
import { buildTextTree } from "../text-tree.js"
import type { TProjectReactiveSnapshot } from "../engine.js"
import type { TPropositionalExpressionCombined } from "../../schemas/logic.js"

function makeSnapshot(
    overrides: Partial<TProjectReactiveSnapshot> = {}
): TProjectReactiveSnapshot {
    return {
        argument: {
            id: "arg-1",
            version: 1,
            title: "Test Argument",
            published: false,
            checksum: "x",
            descendantChecksum: null,
            combinedChecksum: "x",
            creatorId: "user-1",
            createdOn: new Date().toISOString(),
        } as unknown as TProjectReactiveSnapshot["argument"],
        variables: {},
        premises: {},
        roles: { conclusionPremiseId: undefined },
        claims: {},
        citations: {},
        origin: { document: undefined, link: undefined, anchors: {} },
        validationIssues: [],
        ...overrides,
    }
}

const EXPR_DEFAULTS = {
    checksum: "chk",
    descendantChecksum: null,
    combinedChecksum: "chk",
    createdOn: new Date(),
    creatorId: "user-1",
    argumentId: "arg-1",
    argumentVersion: 1,
}

const VAR_DEFAULTS = {
    checksum: "chk",
    descendantChecksum: null,
    combinedChecksum: "chk",
    createdOn: new Date(),
    creatorId: "user-1",
    premiseId: null,
    argumentId: "arg-1",
    argumentVersion: 1,
}

const NORMAL_CLAIM_DEFAULTS = {
    originArgumentId: "arg-1",
    version: 1,
    published: false,
    publishedOn: null,
    claimForkId: null,
    creatorId: "user-1",
    createdOn: new Date(),
    kind: "claim" as const,
    type: "normal" as const,
    parentId: null,
    digest: "digest",
    titleContentHash: "hash",
    url: null,
    citation: null,
    citationContentHash: null,
    axiom: null,
}

const CITATION_CLAIM_DEFAULTS = {
    originArgumentId: "arg-1",
    version: 1,
    published: false,
    publishedOn: null,
    claimForkId: null,
    creatorId: "user-1",
    createdOn: new Date(),
    kind: null,
    type: "citation" as const,
    parentId: null,
    digest: "digest",
    title: null,
    body: null,
    titleContentHash: null,
    url: "https://example.com/source",
    citation: {
        type: "JournalArticle" as const,
        authors: [{ givenNames: "A", familyName: "Author" }],
        year: "2024",
        title: "Cited Title",
        journalTitle: "Journal",
    },
    citationContentHash: "citation-hash",
    axiom: null,
}

const AXIOMATIC_CLAIM_DEFAULTS = {
    originArgumentId: "arg-1",
    version: 1,
    published: false,
    publishedOn: null,
    claimForkId: null,
    creatorId: "user-1",
    createdOn: new Date(),
    kind: null,
    type: "axiomatic" as const,
    parentId: null,
    digest: "digest",
    title: null,
    body: null,
    titleContentHash: null,
    url: null,
    citation: null,
    citationContentHash: null,
    axiom: "definition" as const,
}

describe("buildTextTree", () => {
    test("returns empty array for empty snapshot", () => {
        const result = buildTextTree(makeSnapshot())
        expect(result).toEqual([])
    })

    test("emits premise header and single claim for simple premise", () => {
        const snapshot = makeSnapshot({
            claims: {
                "claim-1": {
                    ...NORMAL_CLAIM_DEFAULTS,
                    id: "claim-1",
                    title: "Claim Title",
                    body: "Claim Body",
                },
            },
            variables: {
                "var-1": {
                    ...VAR_DEFAULTS,
                    id: "var-1",
                    symbol: "P",
                    claimId: "claim-1",
                    claimVersion: 1,
                } as unknown as TProjectReactiveSnapshot["variables"][string],
            },
            premises: {
                "premise-1": {
                    premise: {
                        id: "premise-1",
                        title: "My Premise",
                        type: "freeform",
                    } as TProjectReactiveSnapshot["premises"][string]["premise"],
                    rootExpressionId: "expr-1",
                    expressions: {
                        "expr-1": {
                            ...EXPR_DEFAULTS,
                            id: "expr-1",
                            type: "variable",
                            variableId: "var-1",
                            operator: null,
                            premiseId: "premise-1",
                            parentId: null,
                            position: 0,
                        } as unknown as TPropositionalExpressionCombined,
                    },
                },
            },
        })

        const result = buildTextTree(snapshot)

        expect(result).toHaveLength(2)
        expect(result[0]).toMatchObject({
            type: "premise-header",
            premiseId: "premise-1",
            role: "supporting",
            title: "My Premise",
            premiseType: "freeform",
        })
        expect(result[1]).toMatchObject({
            type: "claim",
            expressionId: "expr-1",
            variableId: "var-1",
            claimId: "claim-1",
            claimTitle: "Claim Title",
            claimBody: "Claim Body",
            claimType: "normal",
            negated: false,
            isConclusion: false,
            depth: 0,
        })
    })

    test("populates claimType='citation' from snapshot claim type", () => {
        const snapshot = makeSnapshot({
            claims: {
                "claim-cite": {
                    ...CITATION_CLAIM_DEFAULTS,
                    id: "claim-cite",
                },
            },
            variables: {
                "var-1": {
                    ...VAR_DEFAULTS,
                    id: "var-1",
                    symbol: "C",
                    claimId: "claim-cite",
                    claimVersion: 1,
                } as unknown as TProjectReactiveSnapshot["variables"][string],
            },
            premises: {
                "premise-1": {
                    premise: {
                        id: "premise-1",
                        title: null,
                        type: "freeform",
                    } as TProjectReactiveSnapshot["premises"][string]["premise"],
                    rootExpressionId: "expr-1",
                    expressions: {
                        "expr-1": {
                            ...EXPR_DEFAULTS,
                            id: "expr-1",
                            type: "variable",
                            variableId: "var-1",
                            operator: null,
                            premiseId: "premise-1",
                            parentId: null,
                            position: 0,
                        } as unknown as TPropositionalExpressionCombined,
                    },
                },
            },
        })

        const result = buildTextTree(snapshot)
        const claimItem = result.find((i) => i.type === "claim")
        expect(claimItem).toMatchObject({
            type: "claim",
            claimId: "claim-cite",
            claimType: "citation",
        })
    })

    test("populates claimType='axiomatic' from snapshot claim type and falls back to empty title/body", () => {
        const snapshot = makeSnapshot({
            claims: {
                "claim-ax": {
                    ...AXIOMATIC_CLAIM_DEFAULTS,
                    id: "claim-ax",
                },
            },
            variables: {
                "var-1": {
                    ...VAR_DEFAULTS,
                    id: "var-1",
                    symbol: "X",
                    claimId: "claim-ax",
                    claimVersion: 1,
                } as unknown as TProjectReactiveSnapshot["variables"][string],
            },
            premises: {
                "premise-1": {
                    premise: {
                        id: "premise-1",
                        title: null,
                        type: "freeform",
                    } as TProjectReactiveSnapshot["premises"][string]["premise"],
                    rootExpressionId: "expr-1",
                    expressions: {
                        "expr-1": {
                            ...EXPR_DEFAULTS,
                            id: "expr-1",
                            type: "variable",
                            variableId: "var-1",
                            operator: null,
                            premiseId: "premise-1",
                            parentId: null,
                            position: 0,
                        } as unknown as TPropositionalExpressionCombined,
                    },
                },
            },
        })

        const result = buildTextTree(snapshot)
        const claimItem = result.find((i) => i.type === "claim")
        expect(claimItem).toMatchObject({
            type: "claim",
            claimId: "claim-ax",
            claimType: "axiomatic",
            claimTitle: "",
            claimBody: "",
        })
    })

    test("conclusion premise appears before supporting premises", () => {
        const snapshot = makeSnapshot({
            roles: { conclusionPremiseId: "premise-conclusion" },
            premises: {
                "premise-supporting": {
                    premise: {
                        id: "premise-supporting",
                        title: null,
                    } as TProjectReactiveSnapshot["premises"][string]["premise"],
                    rootExpressionId: undefined,
                    expressions: {},
                },
                "premise-conclusion": {
                    premise: {
                        id: "premise-conclusion",
                        title: null,
                    } as TProjectReactiveSnapshot["premises"][string]["premise"],
                    rootExpressionId: undefined,
                    expressions: {},
                },
            },
        })

        const result = buildTextTree(snapshot)

        // Two headers + two empty-premise items
        expect(result).toHaveLength(4)
        expect(result[0]).toMatchObject({
            type: "premise-header",
            premiseId: "premise-conclusion",
            role: "conclusion",
        })
        expect(result[2]).toMatchObject({
            type: "premise-header",
            premiseId: "premise-supporting",
            role: "supporting",
        })
    })

    test("AND operator emits children with 'and' label between them", () => {
        const snapshot = makeSnapshot({
            claims: {
                "claim-a": {
                    ...NORMAL_CLAIM_DEFAULTS,
                    id: "claim-a",
                    title: "Claim A",
                    body: "Body A",
                },
                "claim-b": {
                    ...NORMAL_CLAIM_DEFAULTS,
                    id: "claim-b",
                    title: "Claim B",
                    body: "Body B",
                },
            },
            variables: {
                "var-a": {
                    ...VAR_DEFAULTS,
                    id: "var-a",
                    symbol: "A",
                    claimId: "claim-a",
                    claimVersion: 1,
                } as unknown as TProjectReactiveSnapshot["variables"][string],
                "var-b": {
                    ...VAR_DEFAULTS,
                    id: "var-b",
                    symbol: "B",
                    claimId: "claim-b",
                    claimVersion: 1,
                } as unknown as TProjectReactiveSnapshot["variables"][string],
            },
            premises: {
                "premise-1": {
                    premise: {
                        id: "premise-1",
                        title: null,
                    } as TProjectReactiveSnapshot["premises"][string]["premise"],
                    rootExpressionId: "op-and",
                    expressions: {
                        "op-and": {
                            ...EXPR_DEFAULTS,
                            id: "op-and",
                            type: "operator",
                            operator: "and",
                            variableId: null,
                            premiseId: "premise-1",
                            parentId: null,
                            position: 0,
                        } as unknown as TPropositionalExpressionCombined,
                        "expr-a": {
                            ...EXPR_DEFAULTS,
                            id: "expr-a",
                            type: "variable",
                            variableId: "var-a",
                            operator: null,
                            premiseId: "premise-1",
                            parentId: "op-and",
                            position: 0,
                        } as unknown as TPropositionalExpressionCombined,
                        "expr-b": {
                            ...EXPR_DEFAULTS,
                            id: "expr-b",
                            type: "variable",
                            variableId: "var-b",
                            operator: null,
                            premiseId: "premise-1",
                            parentId: "op-and",
                            position: 1,
                        } as unknown as TPropositionalExpressionCombined,
                    },
                },
            },
        })

        const result = buildTextTree(snapshot)

        // header, claim-a, operator, claim-b
        expect(result).toHaveLength(4)
        expect(result[0]).toMatchObject({ type: "premise-header" })
        expect(result[1]).toMatchObject({
            type: "claim",
            claimTitle: "Claim A",
        })
        expect(result[2]).toMatchObject({
            type: "operator",
            operator: "and",
            label: "and",
            depth: 0,
        })
        expect(result[3]).toMatchObject({
            type: "claim",
            claimTitle: "Claim B",
        })
    })

    test("IMPLIES puts consequent before antecedent with 'is true if' label", () => {
        const snapshot = makeSnapshot({
            claims: {
                "claim-ant": {
                    ...NORMAL_CLAIM_DEFAULTS,
                    id: "claim-ant",
                    title: "Antecedent",
                    body: "Body Ant",
                },
                "claim-con": {
                    ...NORMAL_CLAIM_DEFAULTS,
                    id: "claim-con",
                    title: "Consequent",
                    body: "Body Con",
                },
            },
            variables: {
                "var-ant": {
                    ...VAR_DEFAULTS,
                    id: "var-ant",
                    symbol: "A",
                    claimId: "claim-ant",
                    claimVersion: 1,
                } as unknown as TProjectReactiveSnapshot["variables"][string],
                "var-con": {
                    ...VAR_DEFAULTS,
                    id: "var-con",
                    symbol: "C",
                    claimId: "claim-con",
                    claimVersion: 1,
                } as unknown as TProjectReactiveSnapshot["variables"][string],
            },
            premises: {
                "premise-1": {
                    premise: {
                        id: "premise-1",
                        title: null,
                    } as TProjectReactiveSnapshot["premises"][string]["premise"],
                    rootExpressionId: "op-implies",
                    expressions: {
                        "op-implies": {
                            ...EXPR_DEFAULTS,
                            id: "op-implies",
                            type: "operator",
                            operator: "implies",
                            variableId: null,
                            premiseId: "premise-1",
                            parentId: null,
                            position: 0,
                        } as unknown as TPropositionalExpressionCombined,
                        // Antecedent at position 0
                        "expr-ant": {
                            ...EXPR_DEFAULTS,
                            id: "expr-ant",
                            type: "variable",
                            variableId: "var-ant",
                            operator: null,
                            premiseId: "premise-1",
                            parentId: "op-implies",
                            position: 0,
                        } as unknown as TPropositionalExpressionCombined,
                        // Consequent at position 1 (higher position = emitted first)
                        "expr-con": {
                            ...EXPR_DEFAULTS,
                            id: "expr-con",
                            type: "variable",
                            variableId: "var-con",
                            operator: null,
                            premiseId: "premise-1",
                            parentId: "op-implies",
                            position: 1,
                        } as unknown as TPropositionalExpressionCombined,
                    },
                },
            },
        })

        const result = buildTextTree(snapshot)

        // header, consequent, operator("is true if"), antecedent
        expect(result).toHaveLength(4)
        expect(result[1]).toMatchObject({
            type: "claim",
            claimTitle: "Consequent",
        })
        expect(result[2]).toMatchObject({
            type: "operator",
            operator: "implies",
            label: "is true if",
        })
        expect(result[3]).toMatchObject({
            type: "claim",
            claimTitle: "Antecedent",
        })
    })

    test("NOT propagates negation to child claim", () => {
        const snapshot = makeSnapshot({
            claims: {
                "claim-1": {
                    ...NORMAL_CLAIM_DEFAULTS,
                    id: "claim-1",
                    title: "Some Claim",
                    body: "Body",
                },
            },
            variables: {
                "var-1": {
                    ...VAR_DEFAULTS,
                    id: "var-1",
                    symbol: "P",
                    claimId: "claim-1",
                    claimVersion: 1,
                } as unknown as TProjectReactiveSnapshot["variables"][string],
            },
            premises: {
                "premise-1": {
                    premise: {
                        id: "premise-1",
                        title: null,
                    } as TProjectReactiveSnapshot["premises"][string]["premise"],
                    rootExpressionId: "op-not",
                    expressions: {
                        "op-not": {
                            ...EXPR_DEFAULTS,
                            id: "op-not",
                            type: "operator",
                            operator: "not",
                            variableId: null,
                            premiseId: "premise-1",
                            parentId: null,
                            position: 0,
                        } as unknown as TPropositionalExpressionCombined,
                        "expr-1": {
                            ...EXPR_DEFAULTS,
                            id: "expr-1",
                            type: "variable",
                            variableId: "var-1",
                            operator: null,
                            premiseId: "premise-1",
                            parentId: "op-not",
                            position: 0,
                        } as unknown as TPropositionalExpressionCombined,
                    },
                },
            },
        })

        const result = buildTextTree(snapshot)

        expect(result).toHaveLength(2)
        expect(result[1]).toMatchObject({
            type: "claim",
            claimTitle: "Some Claim",
            negated: true,
        })
    })

    test("formula node increases depth by 1", () => {
        const snapshot = makeSnapshot({
            claims: {
                "claim-1": {
                    ...NORMAL_CLAIM_DEFAULTS,
                    id: "claim-1",
                    title: "Inner Claim",
                    body: "Body",
                },
            },
            variables: {
                "var-1": {
                    ...VAR_DEFAULTS,
                    id: "var-1",
                    symbol: "P",
                    claimId: "claim-1",
                    claimVersion: 1,
                } as unknown as TProjectReactiveSnapshot["variables"][string],
            },
            premises: {
                "premise-1": {
                    premise: {
                        id: "premise-1",
                        title: null,
                    } as TProjectReactiveSnapshot["premises"][string]["premise"],
                    rootExpressionId: "formula-1",
                    expressions: {
                        "formula-1": {
                            ...EXPR_DEFAULTS,
                            id: "formula-1",
                            type: "formula",
                            variableId: null,
                            operator: null,
                            premiseId: "premise-1",
                            parentId: null,
                            position: 0,
                        } as unknown as TPropositionalExpressionCombined,
                        "expr-1": {
                            ...EXPR_DEFAULTS,
                            id: "expr-1",
                            type: "variable",
                            variableId: "var-1",
                            operator: null,
                            premiseId: "premise-1",
                            parentId: "formula-1",
                            position: 0,
                        } as unknown as TPropositionalExpressionCombined,
                    },
                },
            },
        })

        const result = buildTextTree(snapshot)

        expect(result).toHaveLength(2)
        expect(result[1]).toMatchObject({
            type: "claim",
            claimTitle: "Inner Claim",
            depth: 1,
        })
    })

    test("skips derivation premises", () => {
        const snapshot = makeSnapshot({
            claims: {
                "claim-q": {
                    ...NORMAL_CLAIM_DEFAULTS,
                    id: "claim-q",
                    title: "Q",
                    body: "Body Q",
                },
                "claim-free": {
                    ...NORMAL_CLAIM_DEFAULTS,
                    id: "claim-free",
                    title: "F",
                    body: "Body F",
                },
            },
            variables: {
                "var-q": {
                    ...VAR_DEFAULTS,
                    id: "var-q",
                    symbol: "Q",
                    claimId: "claim-q",
                    claimVersion: 1,
                } as unknown as TProjectReactiveSnapshot["variables"][string],
                "var-free": {
                    ...VAR_DEFAULTS,
                    id: "var-free",
                    symbol: "P",
                    claimId: "claim-free",
                    claimVersion: 1,
                } as unknown as TProjectReactiveSnapshot["variables"][string],
            },
            premises: {
                "p-free": {
                    premise: {
                        id: "p-free",
                        title: "Freeform",
                        type: "freeform",
                    } as TProjectReactiveSnapshot["premises"][string]["premise"],
                    rootExpressionId: "expr-free",
                    expressions: {
                        "expr-free": {
                            ...EXPR_DEFAULTS,
                            id: "expr-free",
                            type: "variable",
                            variableId: "var-free",
                            operator: null,
                            premiseId: "p-free",
                            parentId: null,
                            position: 0,
                        } as unknown as TPropositionalExpressionCombined,
                    },
                },
                "p-deriv": {
                    premise: {
                        id: "p-deriv",
                        title: null,
                        type: "derivation",
                        derivedClaimId: "claim-q",
                    } as TProjectReactiveSnapshot["premises"][string]["premise"],
                    rootExpressionId: "expr-q",
                    expressions: {
                        "expr-q": {
                            ...EXPR_DEFAULTS,
                            id: "expr-q",
                            type: "variable",
                            variableId: "var-q",
                            operator: null,
                            premiseId: "p-deriv",
                            parentId: null,
                            position: 0,
                        } as unknown as TPropositionalExpressionCombined,
                    },
                },
            },
        })

        const items = buildTextTree(snapshot)
        const headers = items.filter((i) => i.type === "premise-header")
        expect(
            headers.map((h) => (h as { premiseId: string }).premiseId)
        ).toEqual(["p-free"])
        // No claim/operator items from the derivation premise either.
        const claimItems = items.filter((i) => i.type === "claim")
        expect(claimItems).toHaveLength(1)
        expect(claimItems[0]).toMatchObject({ claimId: "claim-free" })
    })

    test("orders premise headers by reading-order, not lexicographic id", () => {
        // conclusion `a-concl` asserts A; `z-proof-a` proves A (B⇒A); `m-leaf`
        // is disconnected. Premises are *inserted* [a-concl, m-leaf, z-proof-a]
        // so the old conclusion-first-then-insertion-order sort would yield
        // [a-concl, m-leaf, z-proof-a]. Reading order is [a-concl, z-proof-a,
        // m-leaf] — the proof of A sits right under the conclusion.
        const snapshot = makeSnapshot({
            roles: { conclusionPremiseId: "a-concl" },
            variables: {
                va: {
                    ...VAR_DEFAULTS,
                    id: "va",
                    symbol: "A",
                    claimId: "claim-a",
                    claimVersion: 1,
                } as unknown as TProjectReactiveSnapshot["variables"][string],
                "va-con": {
                    ...VAR_DEFAULTS,
                    id: "va-con",
                    symbol: "A",
                    claimId: "claim-a",
                    claimVersion: 1,
                } as unknown as TProjectReactiveSnapshot["variables"][string],
                vb: {
                    ...VAR_DEFAULTS,
                    id: "vb",
                    symbol: "B",
                    claimId: "claim-b",
                    claimVersion: 1,
                } as unknown as TProjectReactiveSnapshot["variables"][string],
                vm: {
                    ...VAR_DEFAULTS,
                    id: "vm",
                    symbol: "M",
                    claimId: "claim-m",
                    claimVersion: 1,
                } as unknown as TProjectReactiveSnapshot["variables"][string],
            },
            premises: {
                "a-concl": {
                    premise: {
                        id: "a-concl",
                        title: null,
                        type: "freeform",
                    } as TProjectReactiveSnapshot["premises"][string]["premise"],
                    rootExpressionId: "e-concl",
                    expressions: {
                        "e-concl": {
                            ...EXPR_DEFAULTS,
                            id: "e-concl",
                            type: "variable",
                            variableId: "va",
                            operator: null,
                            premiseId: "a-concl",
                            parentId: null,
                            position: 0,
                        } as unknown as TPropositionalExpressionCombined,
                    },
                },
                "m-leaf": {
                    premise: {
                        id: "m-leaf",
                        title: null,
                        type: "freeform",
                    } as TProjectReactiveSnapshot["premises"][string]["premise"],
                    rootExpressionId: "e-m",
                    expressions: {
                        "e-m": {
                            ...EXPR_DEFAULTS,
                            id: "e-m",
                            type: "variable",
                            variableId: "vm",
                            operator: null,
                            premiseId: "m-leaf",
                            parentId: null,
                            position: 0,
                        } as unknown as TPropositionalExpressionCombined,
                    },
                },
                "z-proof-a": {
                    premise: {
                        id: "z-proof-a",
                        title: null,
                        type: "freeform",
                    } as TProjectReactiveSnapshot["premises"][string]["premise"],
                    rootExpressionId: "z-imp",
                    expressions: {
                        "z-imp": {
                            ...EXPR_DEFAULTS,
                            id: "z-imp",
                            type: "operator",
                            operator: "implies",
                            variableId: null,
                            premiseId: "z-proof-a",
                            parentId: null,
                            position: 0,
                        } as unknown as TPropositionalExpressionCombined,
                        "z-ant": {
                            ...EXPR_DEFAULTS,
                            id: "z-ant",
                            type: "variable",
                            variableId: "vb",
                            operator: null,
                            premiseId: "z-proof-a",
                            parentId: "z-imp",
                            position: 0,
                        } as unknown as TPropositionalExpressionCombined,
                        "z-con": {
                            ...EXPR_DEFAULTS,
                            id: "z-con",
                            type: "variable",
                            variableId: "va-con",
                            operator: null,
                            premiseId: "z-proof-a",
                            parentId: "z-imp",
                            position: 1,
                        } as unknown as TPropositionalExpressionCombined,
                    },
                },
            },
        })

        const headers = buildTextTree(snapshot).filter(
            (i) => i.type === "premise-header"
        )
        expect(
            headers.map((h) => (h as { premiseId: string }).premiseId)
        ).toEqual(["a-concl", "z-proof-a", "m-leaf"])
    })
})
