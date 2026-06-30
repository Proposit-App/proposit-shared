import { describe, expect, test } from "vitest"
import {
    curatedArgumentContentDigest,
    lowerArgumentToCurated,
    parseArgumentYaml,
    serializeArgumentYaml,
    sha256Hex,
    type TArgumentLoweringInput,
    type TCuratedArgumentYaml,
} from "../index.js"
import type { TArgument } from "../../../schemas/model/arguments.js"
import type { TClaim } from "../../../schemas/model/claims.js"
import type {
    TPropositionalExpressionCombined,
    TPropositionalPremise,
    TPropositionalVariable,
} from "../../../schemas/logic.js"

// ---------------------------------------------------------------------------
// Minimal persisted-argument fixtures. Only the fields `lowerArgumentToCurated`
// reads are populated; the rest of each domain shape is irrelevant to lowering,
// so the literals are asserted to their schema type.
// ---------------------------------------------------------------------------

function normalClaim(id: string, title: string, body: string): TClaim {
    return { id, type: "normal", title, body } as unknown as TClaim
}

function claimBoundVariable(
    id: string,
    symbol: string,
    claimId: string
): TPropositionalVariable {
    return { id, symbol, claimId } as unknown as TPropositionalVariable
}

function freeformPremise(
    id: string,
    role: "conclusion" | "supporting",
    title: string | null
): TPropositionalPremise {
    return {
        id,
        type: "freeform",
        role,
        title,
    } as unknown as TPropositionalPremise
}

function derivationPremise(
    id: string,
    derivedClaimId: string
): TPropositionalPremise {
    return {
        id,
        type: "derivation",
        role: "supporting",
        title: null,
        derivedClaimId,
    } as unknown as TPropositionalPremise
}

function variableExpr(
    id: string,
    premiseId: string,
    parentId: string | null,
    position: number,
    variableId: string
): TPropositionalExpressionCombined {
    return {
        id,
        premiseId,
        parentId,
        position,
        type: "variable",
        variableId,
    } as unknown as TPropositionalExpressionCombined
}

function operatorExpr(
    id: string,
    premiseId: string,
    parentId: string | null,
    position: number,
    operator: "and" | "or" | "not" | "implies" | "iff"
): TPropositionalExpressionCombined {
    return {
        id,
        premiseId,
        parentId,
        position,
        type: "operator",
        operator,
    } as unknown as TPropositionalExpressionCombined
}

function argument(title: string, description: string | null): TArgument {
    return { title, description } as unknown as TArgument
}

// Modus ponens: premises implies(P,Q), P, and conclusion Q, plus one derivation
// premise that must be excluded.
function modusPonensInput(idSuffix = ""): TArgumentLoweringInput {
    const s = idSuffix
    return {
        argument: argument("Modus Ponens", null),
        claims: [
            normalClaim(`claim-p${s}`, "P title", "P body"),
            normalClaim(`claim-q${s}`, "Q title", "Q body"),
        ],
        variables: [
            claimBoundVariable(`var-p${s}`, "P", `claim-p${s}`),
            claimBoundVariable(`var-q${s}`, "Q", `claim-q${s}`),
        ],
        premises: [
            freeformPremise(`prem-imp${s}`, "supporting", "If P then Q"),
            freeformPremise(`prem-p${s}`, "supporting", null),
            freeformPremise(`prem-q${s}`, "conclusion", "Q"),
            derivationPremise(`prem-deriv${s}`, `claim-q${s}`),
        ],
        expressions: [
            // implies(P, Q)
            operatorExpr(`e1${s}`, `prem-imp${s}`, null, 0, "implies"),
            variableExpr(`e2${s}`, `prem-imp${s}`, `e1${s}`, 0, `var-p${s}`),
            variableExpr(`e3${s}`, `prem-imp${s}`, `e1${s}`, 1, `var-q${s}`),
            // P
            variableExpr(`e4${s}`, `prem-p${s}`, null, 0, `var-p${s}`),
            // Q (conclusion)
            variableExpr(`e5${s}`, `prem-q${s}`, null, 0, `var-q${s}`),
            // derivation premise content — must be ignored
            variableExpr(`e6${s}`, `prem-deriv${s}`, null, 0, `var-q${s}`),
        ],
    }
}

describe("sha256Hex", () => {
    test("matches FIPS 180-4 known answers", () => {
        expect(sha256Hex("abc")).toBe(
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
        )
        expect(sha256Hex("")).toBe(
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        )
    })

    test("handles multi-byte UTF-8", () => {
        // "abc" with a trailing snowman exercises the 3-byte branch.
        expect(sha256Hex("abc☃")).toMatch(/^[0-9a-f]{64}$/)
        expect(sha256Hex("abc☃")).not.toBe(sha256Hex("abc"))
    })
})

describe("lowerArgumentToCurated", () => {
    test("recovers authored claims and premise trees, excluding the derivation premise", () => {
        const curated = lowerArgumentToCurated(modusPonensInput())

        expect(curated).toEqual({
            title: "Modus Ponens",
            description: "",
            claims: [
                { symbol: "P", title: "P title", body: "P body" },
                { symbol: "Q", title: "Q title", body: "Q body" },
            ],
            premises: [
                {
                    title: "If P then Q",
                    role: "supporting",
                    tree: {
                        type: "operator",
                        operator: "implies",
                        children: [
                            { type: "variable", symbol: "P" },
                            { type: "variable", symbol: "Q" },
                        ],
                    },
                },
                {
                    title: null,
                    role: "supporting",
                    tree: { type: "variable", symbol: "P" },
                },
                {
                    title: "Q",
                    role: "conclusion",
                    tree: { type: "variable", symbol: "Q" },
                },
            ],
        })
    })

    test("derivation premise is absent from the output", () => {
        const curated = lowerArgumentToCurated(modusPonensInput())
        expect(curated.premises).toHaveLength(3)
        expect(
            curated.premises.every((premise) => premise.role !== undefined)
        ).toBe(true)
    })
})

describe("curatedArgumentContentDigest", () => {
    test("is stable across differing database ids", () => {
        const first = lowerArgumentToCurated(modusPonensInput("-a"))
        const second = lowerArgumentToCurated(modusPonensInput("-b"))
        expect(curatedArgumentContentDigest(first)).toBe(
            curatedArgumentContentDigest(second)
        )
    })

    test("is a 64-char hex string", () => {
        const curated = lowerArgumentToCurated(modusPonensInput())
        expect(curatedArgumentContentDigest(curated)).toMatch(/^[0-9a-f]{64}$/)
    })

    test("differs when content differs", () => {
        const baseline = lowerArgumentToCurated(modusPonensInput())
        const changed = lowerArgumentToCurated(modusPonensInput())
        changed.claims[0].body = "a different body"
        expect(curatedArgumentContentDigest(baseline)).not.toBe(
            curatedArgumentContentDigest(changed)
        )
    })
})

describe("serializeArgumentYaml / parseArgumentYaml", () => {
    const fixture: TCuratedArgumentYaml = {
        title: "Round Trip",
        description: "",
        documentCurationId: "demo-01",
        claims: [
            { symbol: "P", title: "P title", body: "P body" },
            { symbol: "Q", title: "Q title", body: "Q body" },
        ],
        premises: [
            {
                title: "If (P and Q) then Q",
                role: "supporting",
                // Exercises the recursive operator/formula branches.
                tree: {
                    type: "operator",
                    operator: "implies",
                    children: [
                        {
                            type: "formula",
                            children: [
                                {
                                    type: "operator",
                                    operator: "and",
                                    children: [
                                        { type: "variable", symbol: "P" },
                                        { type: "variable", symbol: "Q" },
                                    ],
                                },
                            ],
                        },
                        { type: "variable", symbol: "Q" },
                    ],
                },
            },
            {
                title: null,
                role: "conclusion",
                tree: { type: "variable", symbol: "Q" },
            },
        ],
        provenance: {
            provider: "openai",
            model: null,
            pipeline: "scribe",
            pipelineVersion: "1.0.0",
            mode: "fast",
            runAt: "2026-06-30T00:00:00.000Z",
            sourceFile: "demo.txt",
            sourcePath: "/tmp/demo.txt",
            coreVersion: "2.4.0",
            sharedVersion: "0.30.0",
            serverVersion: "0.32.0",
        },
    }

    test("round-trips a curated argument", () => {
        const yaml = serializeArgumentYaml(fixture)
        expect(typeof yaml).toBe("string")
        expect(parseArgumentYaml(yaml)).toEqual(fixture)
    })

    test("serializing rejects an invalid argument", () => {
        const invalid = {
            ...fixture,
            claims: [{ symbol: "P", title: "only a title" }],
        } as unknown as TCuratedArgumentYaml
        expect(() => serializeArgumentYaml(invalid)).toThrow()
    })

    test("parsing rejects YAML that does not match the schema", () => {
        expect(() => parseArgumentYaml("title: 5\n")).toThrow()
        expect(() => parseArgumentYaml("just a string")).toThrow()
    })
})
