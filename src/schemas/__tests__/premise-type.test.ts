import { describe, expect, it } from "vitest"
import { Value } from "typebox/value"
import { PropositionalPremiseSchema } from "../logic.js"

const baseFields = {
    id: "11111111-1111-1111-1111-111111111111",
    argumentId: "22222222-2222-2222-2222-222222222222",
    argumentVersion: 1,
    role: "supporting" as const,
    title: "Premise title",
    createdOn: new Date("2026-05-06T00:00:00Z"),
    creatorId: "33333333-3333-3333-3333-333333333333",
    // checksum fields that core's premise schema requires:
    checksum: "sha256-premise-checksum",
    descendantChecksum: null,
    combinedChecksum: "sha256-combined",
}

describe("PropositionalPremiseSchema type discriminator", () => {
    it("accepts type='freeform'", () => {
        const premise = { ...baseFields, type: "freeform" }
        expect(Value.Check(PropositionalPremiseSchema, premise)).toBe(true)
    })

    it("accepts type='derivation' with derivedClaimId", () => {
        const premise = {
            ...baseFields,
            type: "derivation",
            derivedClaimId: "44444444-4444-4444-4444-444444444444",
        }
        expect(Value.Check(PropositionalPremiseSchema, premise)).toBe(true)
    })

    it("rejects type='derivation' without derivedClaimId", () => {
        const premise = { ...baseFields, type: "derivation" }
        expect(Value.Check(PropositionalPremiseSchema, premise)).toBe(false)
    })

    it("rejects a premise with the type field missing entirely (legacy data)", () => {
        const legacyPremise = { ...baseFields }
        // type omitted — pre-v0.11 shape
        expect(Value.Check(PropositionalPremiseSchema, legacyPremise)).toBe(
            false
        )
    })
})
