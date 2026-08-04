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
import type {
    TAxiomaticClaim,
    TAxiomKind,
    TClaim,
} from "../../../schemas/model/claims.js"
import type {
    TPropositionalExpressionCombined,
    TPropositionalPremise,
    TPropositionalVariable,
} from "../../../schemas/logic.js"
import {
    mutateCreateDerivationPremise,
    mutateCreateExpression,
    mutateCreatePremise,
    mutateCreateVariable,
    populateDerivationFromAxiom,
} from "../../../engine/mutations/index.js"
import {
    createTestEngine,
    mkTestClaim,
} from "../../../engine/mutations/__tests__/helpers.js"

// ---------------------------------------------------------------------------
// Minimal persisted-argument fixtures. Only the fields `lowerArgumentToCurated`
// reads are populated; the rest of each domain shape is irrelevant to lowering,
// so the literals are asserted to their schema type.
// ---------------------------------------------------------------------------

function normalClaim(id: string, title: string, body: string): TClaim {
    return { id, type: "normal", title, body } as unknown as TClaim
}

// An axiomatic claim carries no prose — its only content is its kind.
function axiomaticClaim(id: string, axiom: TAxiomKind): TClaim {
    return {
        id,
        type: "axiomatic",
        title: null,
        body: null,
        url: null,
        citation: null,
        axiom,
    } as unknown as TClaim
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

// Modus ponens: freeform premises implies(P,Q), P, and conclusion Q.
//
// Modeled on REAL persistence, not a toy: `addClaim` mints a per-claim hidden
// derivation premise AND binds a second, engine-synthesized variable (auto
// symbol) to each claim — that variable is referenced ONLY by the claim's
// derivation premise. Neither synthesized claim-bound variable is an authored
// claim; lowering must drop them and recover exactly the two authored claims
// (P, Q). (An earlier fixture reused the authored `var-q` inside the derivation
// premise, which hid the double-count bug entirely.)
//
// Passing `axiomKind` attaches an axiomatic claim as the antecedent of Q's
// derivation premise — the persisted shape of "Q rests on an axiom". Omitting
// it yields an argument with no axiomatic support anywhere, which must lower
// exactly as it did before the `axiom` field existed.
function modusPonensInput(
    idSuffix = "",
    axiomKind?: TAxiomKind
): TArgumentLoweringInput {
    const s = idSuffix
    return {
        argument: argument("Modus Ponens", null),
        claims: [
            normalClaim(`claim-p${s}`, "P title", "P body"),
            normalClaim(`claim-q${s}`, "Q title", "Q body"),
            ...(axiomKind
                ? [axiomaticClaim(`claim-axiom${s}`, axiomKind)]
                : []),
        ],
        variables: [
            // Authored claim-bound variables (appear in the freeform premises).
            claimBoundVariable(`var-p${s}`, "P", `claim-p${s}`),
            claimBoundVariable(`var-q${s}`, "Q", `claim-q${s}`),
            // Engine-synthesized derivation variables — same claims, auto
            // symbols, referenced only by the derivation premises.
            claimBoundVariable(`var-p-deriv${s}`, "P1", `claim-p${s}`),
            claimBoundVariable(`var-q-deriv${s}`, "P3", `claim-q${s}`),
            // The axiomatic claim's variable — referenced only by a derivation
            // premise, and never a curated claim of its own.
            ...(axiomKind
                ? [
                      claimBoundVariable(
                          `var-axiom${s}`,
                          "P55",
                          `claim-axiom${s}`
                      ),
                  ]
                : []),
        ],
        premises: [
            freeformPremise(`prem-imp${s}`, "supporting", "If P then Q"),
            freeformPremise(`prem-p${s}`, "supporting", null),
            freeformPremise(`prem-q${s}`, "conclusion", "Q"),
            derivationPremise(`prem-deriv-p${s}`, `claim-p${s}`),
            derivationPremise(`prem-deriv-q${s}`, `claim-q${s}`),
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
            // Derivation premise content — never lowered to a premise. The
            // Q-derivation references the synthesized Q-variable, plus the
            // axiom variable when the fixture declares axiomatic support.
            variableExpr(
                `e6${s}`,
                `prem-deriv-p${s}`,
                null,
                0,
                `var-p-deriv${s}`
            ),
            operatorExpr(`e7${s}`, `prem-deriv-q${s}`, null, 0, "implies"),
            variableExpr(
                `e8${s}`,
                `prem-deriv-q${s}`,
                `e7${s}`,
                1,
                `var-q-deriv${s}`
            ),
            ...(axiomKind
                ? [
                      variableExpr(
                          `e9${s}`,
                          `prem-deriv-q${s}`,
                          `e7${s}`,
                          0,
                          `var-axiom${s}`
                      ),
                  ]
                : []),
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

    test("drops per-claim derivation variables and the axiomatic claim's own variable", () => {
        // Every persisted claim binds a second engine-synthesized variable that
        // appears only in its derivation premise, and an axiomatic claim's
        // variable appears only inside a derivation premise. None are authored
        // claims, so only the two authored claims (P, Q) survive — no
        // double-counting, and the axiomatic claim does not trip the
        // non-normal-claim guard.
        const curated = lowerArgumentToCurated(
            modusPonensInput("", "logical-principle")
        )
        expect(curated.claims.map((claim) => claim.symbol)).toEqual(["P", "Q"])
    })

    test("carries an axiomatic antecedent back as the supported claim's kind", () => {
        const curated = lowerArgumentToCurated(
            modusPonensInput("", "logical-principle")
        )
        expect(curated.claims[1]).toEqual({
            symbol: "Q",
            title: "Q title",
            body: "Q body",
            axiom: "logical-principle",
        })
    })

    test("omits the axiom key entirely on an unsupported claim", () => {
        const curated = lowerArgumentToCurated(
            modusPonensInput("", "logical-principle")
        )
        // P's derivation premise has no axiomatic antecedent. The key must be
        // absent, not present-and-undefined, so the YAML is unchanged.
        expect(Object.keys(curated.claims[0])).toEqual([
            "symbol",
            "title",
            "body",
        ])
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

    test("is unchanged for an argument with no axiomatic support", () => {
        // Frozen hash. Claims carry no `axiom`, so the hashed projection must
        // serialize exactly as it did before the field existed — otherwise every
        // stored curated argument reports drift and republishes for nothing.
        const curated = lowerArgumentToCurated(modusPonensInput())
        expect(curatedArgumentContentDigest(curated)).toBe(
            "3670325cf0bc407014a0d8e3dc3de2b8a10bf23658c04ce9c049c109a1491bdf"
        )
    })

    test("changes when a claim's axiom kind changes, and only then", () => {
        const none = lowerArgumentToCurated(modusPonensInput())
        const logical = lowerArgumentToCurated(
            modusPonensInput("", "logical-principle")
        )
        const definition = lowerArgumentToCurated(
            modusPonensInput("", "definition")
        )
        expect(curatedArgumentContentDigest(logical)).not.toBe(
            curatedArgumentContentDigest(none)
        )
        expect(curatedArgumentContentDigest(logical)).not.toBe(
            curatedArgumentContentDigest(definition)
        )
        expect(curatedArgumentContentDigest(logical)).toBe(
            curatedArgumentContentDigest(
                lowerArgumentToCurated(
                    modusPonensInput("-other", "logical-principle")
                )
            )
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
            {
                symbol: "Q",
                title: "Q title",
                body: "Q body",
                axiom: "definition",
            },
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

    test("rejects an axiom kind outside the declared set", () => {
        const invalid = {
            ...fixture,
            claims: [
                {
                    symbol: "P",
                    title: "P title",
                    body: "P body",
                    axiom: "self-evident",
                },
            ],
        } as unknown as TCuratedArgumentYaml
        expect(() => serializeArgumentYaml(invalid)).toThrow()
        expect(() =>
            parseArgumentYaml(
                "title: T\ndescription: ''\nclaims:\n  - symbol: P\n    title: t\n    body: b\n    axiom: self-evident\npremises: []\n"
            )
        ).toThrow()
    })
})

// The engine is the authority on how axiomatic support is persisted, so this
// drives the real mutation (`populateDerivationFromAxiom`) rather than a
// hand-built derivation tree: whatever shape the engine writes, lowering must
// read the kind back out of it, and the YAML must survive a round trip.
describe("axiomatic support wired by the engine", () => {
    const argId = "test-arg-id"
    const argVersion = 1
    const userId = "test-user-id"
    const createdOn = new Date("2026-01-01")

    function mkAxiomaticClaim(id: string, axiom: TAxiomKind): TAxiomaticClaim {
        return {
            id,
            originArgumentId: argId,
            version: argVersion,
            published: false,
            publishedOn: null,
            creatorId: userId,
            createdOn,
            digest: `axiom-digest-${id}`,
            type: "axiomatic",
            kind: null,
            title: null,
            body: null,
            titleContentHash: null,
            url: null,
            citation: null,
            citationContentHash: null,
            axiom,
            parentId: null,
            claimForkId: null,
        } as TAxiomaticClaim
    }

    // A one-claim argument: the claim stated as the conclusion premise, plus its
    // hidden derivation premise carrying the axiom as antecedent.
    function loweringInputFromEngine(
        axiom: TAxiomKind
    ): TArgumentLoweringInput {
        const meta = {
            argumentId: argId,
            argumentVersion: argVersion,
            creatorId: userId,
            createdOn,
        }
        const supported = mkTestClaim({
            id: "claim-q",
            title: "Q title",
            body: "Q body",
        })
        const engine = createTestEngine(undefined, [supported])
        const axiomatic = mkAxiomaticClaim("claim-axiom", axiom)
        engine.setClaim(axiomatic)

        mutateCreatePremise(engine, "prem-q", {
            ...meta,
            title: "Q",
            role: "conclusion",
        })
        mutateCreateVariable(engine, "var-q", {
            ...meta,
            claimId: "claim-q",
            claimVersion: 1,
            symbol: "Q",
        })
        mutateCreateExpression(engine, {
            ...meta,
            premiseId: "prem-q",
            expressionId: "expr-q",
            parentId: null,
            type: "variable",
            variableId: "var-q",
        })
        mutateCreateDerivationPremise(engine, "prem-deriv-q", {
            ...meta,
            derivedClaimId: "claim-q",
            existingConsequentVariableId: "var-q",
            consequentExpressionId: "expr-q-deriv",
        })
        populateDerivationFromAxiom(engine, "prem-deriv-q", axiomatic)

        const premises = engine.listPremises()
        return {
            argument: engine.getArgument(),
            claims: [supported, axiomatic],
            variables: engine.getVariables(),
            premises: premises.map((premise) => premise.toPremiseData()),
            expressions: premises.flatMap((premise) =>
                premise.getExpressions()
            ),
        }
    }

    test("lowers to the supported claim carrying the kind, and nothing else", () => {
        const curated = lowerArgumentToCurated(
            loweringInputFromEngine("domain-rule")
        )
        expect(curated.claims).toEqual([
            {
                symbol: "Q",
                title: "Q title",
                body: "Q body",
                axiom: "domain-rule",
            },
        ])
        // The axiomatic claim's variable and the derivation premise holding it
        // stay engine-internal.
        expect(curated.premises).toEqual([
            {
                title: "Q",
                role: "conclusion",
                tree: { type: "variable", symbol: "Q" },
            },
        ])
    })

    test("survives a YAML round trip", () => {
        const curated: TCuratedArgumentYaml = {
            ...lowerArgumentToCurated(loweringInputFromEngine("stipulation")),
            documentCurationId: "demo-01",
        }
        const yaml = serializeArgumentYaml(curated)
        expect(yaml).toContain("axiom: stipulation")
        expect(parseArgumentYaml(yaml)).toEqual(curated)
    })
})
