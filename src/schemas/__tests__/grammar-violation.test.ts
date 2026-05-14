import { describe, expect, it } from "vitest"
import { Value } from "typebox/value"
import { ViolationSchema } from "../grammar/violation.js"

describe("ViolationSchema", () => {
    it("accepts a minimal violation with just the three required fields", () => {
        const minimal = {
            tier: "structural",
            code: "S-1",
            message: "FK soundness: parentId 'foo' does not resolve",
        }
        expect(Value.Check(ViolationSchema, minimal)).toBe(true)
    })

    it("accepts a violation with every documented optional locator", () => {
        const fullyLocated = {
            tier: "presentable",
            code: "P-1",
            message: "Non-`not` operator is a direct child of another operator",
            argumentId: "arg-uuid",
            premiseId: "premise-uuid",
            expressionId: "expr-uuid",
            variableId: "var-uuid",
            claimId: "claim-uuid",
        }
        expect(Value.Check(ViolationSchema, fullyLocated)).toBe(true)
    })

    it("accepts rule-specific context fields beyond the documented locators (extension slot)", () => {
        // Spec §7.1: "additional rule-specific context fields as needed".
        // The TypeBox schema must allow additional properties so a future
        // rule can attach extra context without a wire-format break.
        const withExtras = {
            tier: "derivable",
            code: "D-3",
            message: "Mixed-grounding antecedent",
            premiseId: "premise-uuid",
            mixedCitationCount: 2,
            mixedAxiomCount: 1,
            antecedentSkeleton: "OR(c, c, a)",
        }
        expect(Value.Check(ViolationSchema, withExtras)).toBe(true)
    })

    it("rejects when `tier` is missing", () => {
        const bad = { code: "S-1", message: "x" }
        expect(Value.Check(ViolationSchema, bad)).toBe(false)
    })

    it("rejects when `code` is missing", () => {
        const bad = { tier: "structural", message: "x" }
        expect(Value.Check(ViolationSchema, bad)).toBe(false)
    })

    it("rejects when `message` is missing", () => {
        const bad = { tier: "structural", code: "S-1" }
        expect(Value.Check(ViolationSchema, bad)).toBe(false)
    })

    it("rejects when `tier` is not in the GrammarTier union", () => {
        const bad = { tier: "atomic", code: "S-1", message: "x" }
        expect(Value.Check(ViolationSchema, bad)).toBe(false)
    })

    it("rejects when `code` is not in the GrammarRuleCode union", () => {
        const bad = { tier: "structural", code: "S-99", message: "x" }
        expect(Value.Check(ViolationSchema, bad)).toBe(false)
    })

    it("rejects when `code` is 'E-2' (reserved)", () => {
        const bad = { tier: "evaluable", code: "E-2", message: "x" }
        expect(Value.Check(ViolationSchema, bad)).toBe(false)
    })

    it("rejects when an optional locator is the wrong type", () => {
        const bad = {
            tier: "structural",
            code: "S-1",
            message: "x",
            premiseId: 42, // expected string
        }
        expect(Value.Check(ViolationSchema, bad)).toBe(false)
    })
})
