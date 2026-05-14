import { describe, expect, it } from "vitest"
import { Value } from "typebox/value"
import { GrammarTierSchema } from "../grammar/tier.js"

describe("GrammarTierSchema", () => {
    it("accepts each of the four canonical tier names", () => {
        for (const tier of [
            "structural",
            "evaluable",
            "derivable",
            "presentable",
        ]) {
            expect(Value.Check(GrammarTierSchema, tier)).toBe(true)
        }
    })

    it("rejects an unknown tier name", () => {
        expect(Value.Check(GrammarTierSchema, "atomic")).toBe(false)
        expect(Value.Check(GrammarTierSchema, "Structural")).toBe(false) // case-sensitive
        expect(Value.Check(GrammarTierSchema, "")).toBe(false)
    })

    it("rejects non-string inputs", () => {
        expect(Value.Check(GrammarTierSchema, 0)).toBe(false)
        expect(Value.Check(GrammarTierSchema, null)).toBe(false)
        expect(Value.Check(GrammarTierSchema, undefined)).toBe(false)
    })
})
