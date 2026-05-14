import { describe, expect, it } from "vitest"
import { Value } from "typebox/value"
import { GrammarViolationsResponseSchema } from "../api/grammar-violations.js"

describe("GrammarViolationsResponseSchema", () => {
    it("accepts a response with one violation", () => {
        const body = {
            error: "GRAMMAR_VIOLATIONS",
            tier: "derivable",
            violations: [
                {
                    tier: "derivable",
                    code: "D-3",
                    message: "Mixed-grounding antecedent",
                    premiseId: "p1",
                },
            ],
        }
        expect(Value.Check(GrammarViolationsResponseSchema, body)).toBe(true)
    })

    it("accepts a response with multiple violations across tiers", () => {
        const body = {
            error: "GRAMMAR_VIOLATIONS",
            tier: "presentable",
            violations: [
                {
                    tier: "derivable",
                    code: "D-1",
                    message: "Derivation premise canonical shape",
                    premiseId: "p1",
                },
                {
                    tier: "presentable",
                    code: "P-1",
                    message: "Missing formula buffer",
                    premiseId: "p2",
                    expressionId: "e9",
                },
            ],
        }
        expect(Value.Check(GrammarViolationsResponseSchema, body)).toBe(true)
    })

    it("accepts an empty violations array (degenerate case server may emit)", () => {
        const body = {
            error: "GRAMMAR_VIOLATIONS",
            tier: "presentable",
            violations: [],
        }
        expect(Value.Check(GrammarViolationsResponseSchema, body)).toBe(true)
    })

    it("rejects when `error` is missing", () => {
        const bad = {
            tier: "derivable",
            violations: [],
        }
        expect(Value.Check(GrammarViolationsResponseSchema, bad)).toBe(false)
    })

    it("rejects when `tier` is not a GrammarTier", () => {
        const bad = {
            error: "GRAMMAR_VIOLATIONS",
            tier: "atomic",
            violations: [],
        }
        expect(Value.Check(GrammarViolationsResponseSchema, bad)).toBe(false)
    })

    it("rejects when `violations` is not an array", () => {
        const bad = {
            error: "GRAMMAR_VIOLATIONS",
            tier: "derivable",
            violations: { code: "D-1" },
        }
        expect(Value.Check(GrammarViolationsResponseSchema, bad)).toBe(false)
    })

    it("rejects when a contained violation is malformed", () => {
        const bad = {
            error: "GRAMMAR_VIOLATIONS",
            tier: "derivable",
            violations: [{ tier: "derivable", code: "D-1" }], // no `message`
        }
        expect(Value.Check(GrammarViolationsResponseSchema, bad)).toBe(false)
    })
})
