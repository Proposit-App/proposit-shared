import { describe, expect, it } from "vitest"
import { Value } from "typebox/value"
import { GrammarRuleCodeSchema } from "../grammar/rule-code.js"

// The canonical rule-code inventory, lifted from spec §7.1. Any change here
// is a coordinated shared+core publish — see proposit-shared/CLAUDE.md
// "Grammar rule-code coordination protocol".
const ALL_CODES = [
    "S-1",
    "S-2",
    "S-3",
    "S-4",
    "S-5",
    "S-6",
    "S-7",
    "S-8",
    "S-9",
    "S-10",
    "S-11",
    "S-12",
    "S-13",
    "S-14",
    "E-1",
    "E-3",
    "E-4",
    "E-5",
    "E-6",
    "E-7",
    "D-1",
    "D-2",
    "D-3",
    "D-4",
    "D-5",
    "D-6",
    "P-1",
    "P-2",
    "P-3",
    "P-4",
    "P-5",
] as const

describe("GrammarRuleCodeSchema", () => {
    it("accepts every code in the canonical inventory", () => {
        for (const code of ALL_CODES) {
            expect(Value.Check(GrammarRuleCodeSchema, code)).toBe(true)
        }
    })

    it("has exactly 31 codes (Structural 14 + Evaluable 6 + Derivable 6 + Presentable 5)", () => {
        // Cross-check the count so a future edit that adds/removes a code
        // notices when the union grows past spec §7.1's inventory.
        // 14 + 6 + 6 + 5 = 31. Reserved codes 'E-2' and 'D-7' are NOT in the
        // count — they are excluded from the union.
        expect(ALL_CODES.length).toBe(31)
    })

    it("rejects 'E-2' (reserved; promoted to Structural as S-13 per spec §4.2)", () => {
        expect(Value.Check(GrammarRuleCodeSchema, "E-2")).toBe(false)
    })

    it("rejects 'D-7' (reserved; restated as E-6 per spec §4.3)", () => {
        expect(Value.Check(GrammarRuleCodeSchema, "D-7")).toBe(false)
    })

    it("rejects codes outside the namespace", () => {
        expect(Value.Check(GrammarRuleCodeSchema, "S-99")).toBe(false)
        expect(Value.Check(GrammarRuleCodeSchema, "X-1")).toBe(false)
        expect(Value.Check(GrammarRuleCodeSchema, "s-1")).toBe(false) // case-sensitive
        expect(Value.Check(GrammarRuleCodeSchema, "S1")).toBe(false) // missing hyphen
    })
})
