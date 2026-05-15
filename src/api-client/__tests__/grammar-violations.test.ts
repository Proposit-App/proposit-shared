import { describe, expect, test } from "vitest"
import { Value } from "typebox/value"

import { isGrammarViolationsError } from "../grammar-violations.js"
import {
    GrammarViolationsResponseSchema,
    type TGrammarViolationsResponse,
} from "../../schemas/api/grammar-violations.js"

describe("isGrammarViolationsError", () => {
    test("narrows a real GrammarViolationsResponse (assistive submit/save D-3 case)", () => {
        const body: TGrammarViolationsResponse = {
            error: "GRAMMAR_VIOLATIONS",
            tier: "derivable",
            violations: [
                {
                    tier: "derivable",
                    code: "D-3",
                    message: "Mixed-grounding antecedent",
                    argumentId: "00000000-0000-0000-0000-000000000001",
                    premiseId: "p1",
                    expressionId: "e1",
                },
            ],
        }

        // Sanity-check the fixture against the schema before asserting the
        // guard — a future schema change should fail the schema check first,
        // not silently invalidate the guard's positive case.
        expect(Value.Check(GrammarViolationsResponseSchema, body)).toBe(true)
        expect(isGrammarViolationsError(body)).toBe(true)
    })

    test("narrows a presentable-tier publish-gate response", () => {
        const body: TGrammarViolationsResponse = {
            error: "GRAMMAR_VIOLATIONS",
            tier: "presentable",
            violations: [],
        }
        expect(isGrammarViolationsError(body)).toBe(true)
    })

    test("rejects a TErrorResponse-shaped object (different discriminator)", () => {
        const errorResponse = {
            errorID: 1,
            errorMessage: "Unauthorized",
            statusCode: 401,
        }
        expect(isGrammarViolationsError(errorResponse)).toBe(false)
    })

    test("rejects an object whose `error` is a different string", () => {
        expect(isGrammarViolationsError({ error: "SOMETHING_ELSE" })).toBe(
            false
        )
    })

    test("rejects an object with no `error` key", () => {
        expect(isGrammarViolationsError({ violations: [] })).toBe(false)
    })

    test("rejects null", () => {
        expect(isGrammarViolationsError(null)).toBe(false)
    })

    test("rejects undefined", () => {
        expect(isGrammarViolationsError(undefined)).toBe(false)
    })

    test("rejects primitives", () => {
        expect(isGrammarViolationsError("GRAMMAR_VIOLATIONS")).toBe(false)
        expect(isGrammarViolationsError(42)).toBe(false)
        expect(isGrammarViolationsError(true)).toBe(false)
    })

    test("rejects arrays (typeof 'object' but discriminator absent)", () => {
        expect(isGrammarViolationsError([])).toBe(false)
        expect(isGrammarViolationsError(["GRAMMAR_VIOLATIONS"])).toBe(false)
    })
})
