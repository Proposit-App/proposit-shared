import { describe, expect, it, expectTypeOf } from "vitest"
import { Value } from "typebox/value"
import * as CoreGrammar from "@proposit/proposit-core"
import {
    GrammarTierSchema,
    GrammarRuleCodeSchema,
    ViolationSchema,
    type TGrammarTier,
    type TGrammarRuleCode,
    type TViolation,
} from "../grammar/index.js"

// Verifies the post-restructure re-export at `@proposit/shared/schemas/grammar`.
// The four-tier grammar wire format lives in `@proposit/proposit-core`
// (`src/lib/grammar/types.ts`); shared re-exports it for consumer
// ergonomics. These tests assert (1) the re-export is identity (same
// schema object as core's), (2) the runtime schemas behave correctly,
// and (3) the derived TypeScript types are assignable across both paths.
describe("@proposit/shared/schemas/grammar re-export", () => {
    it("re-exports the same GrammarTierSchema identity as @proposit/proposit-core", () => {
        expect(GrammarTierSchema).toBe(CoreGrammar.GrammarTierSchema)
    })

    it("re-exports the same GrammarRuleCodeSchema identity as @proposit/proposit-core", () => {
        expect(GrammarRuleCodeSchema).toBe(CoreGrammar.GrammarRuleCodeSchema)
    })

    it("re-exports the same ViolationSchema identity as @proposit/proposit-core", () => {
        expect(ViolationSchema).toBe(CoreGrammar.ViolationSchema)
    })

    it("re-exported GrammarTierSchema validates the four canonical tier names", () => {
        for (const tier of [
            "structural",
            "evaluable",
            "derivable",
            "presentable",
        ]) {
            expect(Value.Check(GrammarTierSchema, tier)).toBe(true)
        }
        expect(Value.Check(GrammarTierSchema, "atomic")).toBe(false)
    })

    it("re-exported GrammarRuleCodeSchema validates a representative subset of codes", () => {
        // Spot-check one literal from each of the four tier groups — full
        // coverage is provided by core's own grammar-types test suite.
        for (const code of ["S-1", "E-1", "D-1", "P-1"]) {
            expect(Value.Check(GrammarRuleCodeSchema, code)).toBe(true)
        }
        // Reserved (D-7, E-2) and bogus codes are rejected.
        expect(Value.Check(GrammarRuleCodeSchema, "D-7")).toBe(false)
        expect(Value.Check(GrammarRuleCodeSchema, "E-2")).toBe(false)
        expect(Value.Check(GrammarRuleCodeSchema, "Z-99")).toBe(false)
    })

    it("re-exported ViolationSchema validates a minimal violation object", () => {
        const minimal = {
            tier: "derivable",
            code: "D-3",
            message: "Mixed-grounding antecedent",
        }
        expect(Value.Check(ViolationSchema, minimal)).toBe(true)
        // Locator fields are optional.
        const withLocator = { ...minimal, premiseId: "p1" }
        expect(Value.Check(ViolationSchema, withLocator)).toBe(true)
        // Missing `message` is rejected (required field).
        expect(
            Value.Check(ViolationSchema, { tier: "derivable", code: "D-3" })
        ).toBe(false)
    })

    it("type re-exports are structurally identical to core's", () => {
        // Static type assertions — these compile-time checks fail the build
        // if the re-exported types drift from core's, locking the contract
        // shared owes its consumers.
        expectTypeOf<TGrammarTier>().toEqualTypeOf<CoreGrammar.TGrammarTier>()
        expectTypeOf<TGrammarRuleCode>().toEqualTypeOf<CoreGrammar.TGrammarRuleCode>()
        expectTypeOf<TViolation>().toEqualTypeOf<CoreGrammar.TViolation>()
    })
})
