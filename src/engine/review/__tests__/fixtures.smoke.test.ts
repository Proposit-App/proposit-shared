import { describe, it, expect } from "vitest"
import { buildEngineWithTwoPremises } from "./fixtures.js"

describe("fixtures smoke", () => {
    it("builds an engine with the expected claim and premise IDs", () => {
        const engine = buildEngineWithTwoPremises()
        const claimIds = Object.keys(engine.getClaims())
        expect(claimIds).toEqual(expect.arrayContaining(["sA", "cA", "cB"]))
        expect(engine.listSupportingPremises().map((p) => p.getId())).toEqual([
            "pSupport",
        ])
        expect(engine.getConclusionPremise()?.getId()).toBe("pConclusion")
    })
})
