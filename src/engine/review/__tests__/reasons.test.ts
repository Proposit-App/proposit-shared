import { describe, it, expect } from "vitest"
import { Value } from "typebox/value"
import {
    CLAIM_TRUE_REASONS,
    CLAIM_FALSE_REASONS,
    CLAIM_UNKNOWN_REASONS,
    OPERATOR_ACCEPT_REASONS,
    OPERATOR_REJECT_REASONS,
    getClaimReasonsForValue,
    getOperatorReasonsForDecision,
    findReasonByCode,
    getStanceForClaimReason,
} from "../../review/reasons.js"
import {
    ClaimTrueReasonCodeSchema,
    ClaimFalseReasonCodeSchema,
    ClaimUnknownReasonCodeSchema,
    OperatorAcceptReasonCodeSchema,
    OperatorRejectReasonCodeSchema,
} from "../../../schemas/review.js"

describe("reasons taxonomy", () => {
    it("every catalogue entry's code is valid under its bucket schema", () => {
        for (const r of CLAIM_TRUE_REASONS)
            expect(Value.Check(ClaimTrueReasonCodeSchema, r.code)).toBe(true)
        for (const r of CLAIM_FALSE_REASONS)
            expect(Value.Check(ClaimFalseReasonCodeSchema, r.code)).toBe(true)
        for (const r of CLAIM_UNKNOWN_REASONS)
            expect(Value.Check(ClaimUnknownReasonCodeSchema, r.code)).toBe(true)
        for (const r of OPERATOR_ACCEPT_REASONS)
            expect(Value.Check(OperatorAcceptReasonCodeSchema, r.code)).toBe(
                true
            )
        for (const r of OPERATOR_REJECT_REASONS)
            expect(Value.Check(OperatorRejectReasonCodeSchema, r.code)).toBe(
                true
            )
    })

    it("getClaimReasonsForValue returns the right bucket", () => {
        expect(getClaimReasonsForValue(true)).toBe(CLAIM_TRUE_REASONS)
        expect(getClaimReasonsForValue(false)).toBe(CLAIM_FALSE_REASONS)
        expect(getClaimReasonsForValue(null)).toBe(CLAIM_UNKNOWN_REASONS)
    })

    it("getOperatorReasonsForDecision returns the right bucket", () => {
        expect(getOperatorReasonsForDecision("accepted")).toBe(
            OPERATOR_ACCEPT_REASONS
        )
        expect(getOperatorReasonsForDecision("rejected")).toBe(
            OPERATOR_REJECT_REASONS
        )
    })

    it("findReasonByCode locates an entry regardless of bucket", () => {
        expect(findReasonByCode("common-knowledge")?.label).toBe(
            "Common knowledge"
        )
        expect(findReasonByCode("non-sequitur")?.label).toBe("Non sequitur")
        expect(
            findReasonByCode("nonsense" as never as "common-knowledge")
        ).toBeUndefined()
    })

    it("getStanceForClaimReason maps every true-bucket code to true", () => {
        for (const r of CLAIM_TRUE_REASONS)
            expect(getStanceForClaimReason(r.code)).toBe(true)
    })

    it("getStanceForClaimReason maps every false-bucket code to false", () => {
        for (const r of CLAIM_FALSE_REASONS)
            expect(getStanceForClaimReason(r.code)).toBe(false)
    })

    it("getStanceForClaimReason maps every unknown-bucket code to null", () => {
        for (const r of CLAIM_UNKNOWN_REASONS)
            expect(getStanceForClaimReason(r.code)).toBeNull()
    })

    it("getStanceForClaimReason round-trips against getClaimReasonsForValue", () => {
        for (const r of CLAIM_TRUE_REASONS)
            expect(
                getClaimReasonsForValue(getStanceForClaimReason(r.code))
            ).toBe(CLAIM_TRUE_REASONS)
        for (const r of CLAIM_FALSE_REASONS)
            expect(
                getClaimReasonsForValue(getStanceForClaimReason(r.code))
            ).toBe(CLAIM_FALSE_REASONS)
        for (const r of CLAIM_UNKNOWN_REASONS)
            expect(
                getClaimReasonsForValue(getStanceForClaimReason(r.code))
            ).toBe(CLAIM_UNKNOWN_REASONS)
    })

    it("getStanceForClaimReason falls back to null for an unrecognized code", () => {
        expect(
            getStanceForClaimReason("nonsense" as never as "common-knowledge")
        ).toBeNull()
    })

    it("codes are unique across all buckets", () => {
        const all = [
            ...CLAIM_TRUE_REASONS,
            ...CLAIM_FALSE_REASONS,
            ...CLAIM_UNKNOWN_REASONS,
            ...OPERATOR_ACCEPT_REASONS,
            ...OPERATOR_REJECT_REASONS,
        ]
        const codes = all.map((r) => r.code)
        expect(new Set(codes).size).toBe(codes.length)
    })

    it("every schema literal has exactly one catalogue entry (bijection)", () => {
        const unionCodes = (s: { anyOf?: { const: string }[] }): string[] =>
            (s.anyOf ?? []).map((l) => l.const)
        const schemaCodes = new Set([
            ...unionCodes(ClaimTrueReasonCodeSchema as never),
            ...unionCodes(ClaimFalseReasonCodeSchema as never),
            ...unionCodes(ClaimUnknownReasonCodeSchema as never),
            ...unionCodes(OperatorAcceptReasonCodeSchema as never),
            ...unionCodes(OperatorRejectReasonCodeSchema as never),
        ])
        const catalogueCodes = new Set(
            [
                ...CLAIM_TRUE_REASONS,
                ...CLAIM_FALSE_REASONS,
                ...CLAIM_UNKNOWN_REASONS,
                ...OPERATOR_ACCEPT_REASONS,
                ...OPERATOR_REJECT_REASONS,
            ].map((r) => r.code)
        )
        expect([...schemaCodes].sort()).toEqual([...catalogueCodes].sort())
    })
})
