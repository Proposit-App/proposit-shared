import { describe, it, expect } from "vitest"
import { Value } from "typebox/value"
import {
    ClaimReactionSchema,
    type TClaimReactionSafe,
} from "../model/claim-reaction.js"

const ARGUMENT_ID = "11111111-1111-1111-1111-111111111111"
const CLAIM_ID = "22222222-2222-2222-2222-222222222222"
const REACTION_ID = "33333333-3333-3333-3333-333333333333"
const USER_ID = "44444444-4444-4444-4444-444444444444"
const NOW = new Date("2026-06-29T00:00:00Z")

const baseReaction = {
    id: REACTION_ID,
    argumentId: ARGUMENT_ID,
    argumentVersion: 3,
    claimId: CLAIM_ID,
    claimVersion: 2,
    value: true,
    reasonCode: "well-supported-by-sources",
    userId: USER_ID,
    createdOn: NOW,
}

describe("ClaimReactionSchema", () => {
    it("accepts a complete affirmation reaction", () => {
        expect(Value.Check(ClaimReactionSchema, baseReaction)).toBe(true)
    })

    it("accepts a neutral reaction (value: null) with an unknown-bucket reason", () => {
        expect(
            Value.Check(ClaimReactionSchema, {
                ...baseReaction,
                value: null,
                reasonCode: "matter-of-opinion",
            })
        ).toBe(true)
    })

    it("requires reasonCode", () => {
        const { reasonCode: _omit, ...withoutReason } = baseReaction
        expect(Value.Check(ClaimReactionSchema, withoutReason)).toBe(false)
    })

    it("requires value", () => {
        const { value: _omit, ...withoutValue } = baseReaction
        expect(Value.Check(ClaimReactionSchema, withoutValue)).toBe(false)
    })

    it("rejects a reasonCode outside the claim reason vocabulary", () => {
        expect(
            Value.Check(ClaimReactionSchema, {
                ...baseReaction,
                reasonCode: "non-sequitur",
            })
        ).toBe(false)
    })

    it("round-trips createdOn through Encode → stringify → Decode", () => {
        const encoded = Value.Encode(ClaimReactionSchema, baseReaction)
        const parsed: unknown = JSON.parse(JSON.stringify(encoded))
        const back = Value.Decode(ClaimReactionSchema, parsed)
        expect(back.createdOn instanceof Date).toBe(true)
        expect(back.claimVersion).toBe(2)
    })

    it("TClaimReactionSafe strips userId and createdOn", () => {
        const safe: TClaimReactionSafe = {
            id: REACTION_ID,
            argumentId: ARGUMENT_ID,
            argumentVersion: 3,
            claimId: CLAIM_ID,
            claimVersion: 2,
            value: true,
            reasonCode: "well-supported-by-sources",
        }
        expect(safe.id).toBe(REACTION_ID)
        // @ts-expect-error userId is stripped from the safe shape
        const withIdentity: TClaimReactionSafe = { ...safe, userId: USER_ID }
        expect(withIdentity).toBeDefined()
    })
})
