import { describe, it, expect } from "vitest"
import { Value } from "typebox/value"
import {
    ClaimReactionCreateRequest,
    ClaimReactionCreateResponse,
    ClaimReactionGetResponse,
    ClaimReactionDeleteResponse,
    ClaimReactionMapResponse,
} from "../api/claim-reaction/index.js"

const ARGUMENT_ID = "11111111-1111-1111-1111-111111111111"
const CLAIM_ID = "22222222-2222-2222-2222-222222222222"
const REACTION_ID = "33333333-3333-3333-3333-333333333333"
const USER_ID = "44444444-4444-4444-4444-444444444444"
const NOW = new Date("2026-06-29T00:00:00Z")

const fullReaction = {
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

describe("ClaimReactionCreateRequest", () => {
    it("accepts an affirmation { value, reasonCode }", () => {
        expect(
            Value.Check(ClaimReactionCreateRequest, {
                value: true,
                reasonCode: "common-knowledge",
            })
        ).toBe(true)
    })

    it("accepts a neutral { value: null, reasonCode }", () => {
        expect(
            Value.Check(ClaimReactionCreateRequest, {
                value: null,
                reasonCode: "matter-of-opinion",
            })
        ).toBe(true)
    })

    it("requires reasonCode (a stance alone is not a reaction)", () => {
        expect(Value.Check(ClaimReactionCreateRequest, { value: true })).toBe(
            false
        )
    })

    it("is single-select: exactly value + reasonCode, no reactionsToRemove", () => {
        expect(Object.keys(ClaimReactionCreateRequest.properties)).toEqual([
            "value",
            "reasonCode",
        ])
    })

    it("rejects a reasonCode outside the closed union (writes stay strict)", () => {
        expect(
            Value.Check(ClaimReactionCreateRequest, {
                value: true,
                reasonCode: "a-code-that-was-removed-from-the-union",
            })
        ).toBe(false)
    })
})

describe("ClaimReactionCreateResponse", () => {
    it("carries the caller's own added reaction", () => {
        expect(
            Value.Check(ClaimReactionCreateResponse, {
                addedReaction: fullReaction,
            })
        ).toBe(true)
    })

    it("stays strict: the added reaction echoes a just-written code, so an out-of-union code cannot reach it", () => {
        expect(
            Value.Check(ClaimReactionCreateResponse, {
                addedReaction: {
                    ...fullReaction,
                    reasonCode: "a-code-that-was-removed-from-the-union",
                },
            })
        ).toBe(false)
    })
})

describe("ClaimReactionGetResponse", () => {
    it("accepts per-stance counts plus the caller's own selection", () => {
        expect(
            Value.Check(ClaimReactionGetResponse, {
                counts: { affirm: 2, disagree: 1, neutral: 0 },
                own: { value: true, reasonCode: "common-knowledge" },
            })
        ).toBe(true)
    })

    it("accepts own: null for a viewer who has not reacted", () => {
        expect(
            Value.Check(ClaimReactionGetResponse, {
                counts: { affirm: 0, disagree: 0, neutral: 0 },
                own: null,
            })
        ).toBe(true)
    })

    it("rejects a missing stance count", () => {
        expect(
            Value.Check(ClaimReactionGetResponse, {
                counts: { affirm: 0, disagree: 0 },
                own: null,
            })
        ).toBe(false)
    })

    it("tolerates an own reasonCode that has fallen out of the closed union", () => {
        expect(
            Value.Check(ClaimReactionGetResponse, {
                counts: { affirm: 1, disagree: 0, neutral: 0 },
                own: {
                    value: true,
                    reasonCode: "a-code-that-was-removed-from-the-union",
                },
            })
        ).toBe(true)
    })

    it("still requires reasonCode to be a string (loosening is not open-ended)", () => {
        expect(
            Value.Check(ClaimReactionGetResponse, {
                counts: { affirm: 1, disagree: 0, neutral: 0 },
                own: { value: true, reasonCode: 123 },
            })
        ).toBe(false)
    })
})

describe("ClaimReactionMapResponse", () => {
    it("tolerates an out-of-union own reasonCode on a keyed map value", () => {
        expect(
            Value.Check(ClaimReactionMapResponse, {
                [CLAIM_ID]: {
                    counts: { affirm: 1, disagree: 0, neutral: 0 },
                    own: {
                        value: false,
                        reasonCode: "a-code-that-was-removed-from-the-union",
                    },
                },
            })
        ).toBe(true)
    })
})

describe("ClaimReactionDeleteResponse", () => {
    it("carries the removed reaction", () => {
        expect(
            Value.Check(ClaimReactionDeleteResponse, {
                removedReaction: fullReaction,
            })
        ).toBe(true)
    })

    it("tolerates a removed reasonCode that has fallen out of the closed union", () => {
        expect(
            Value.Check(ClaimReactionDeleteResponse, {
                removedReaction: {
                    ...fullReaction,
                    reasonCode: "a-code-that-was-removed-from-the-union",
                },
            })
        ).toBe(true)
    })

    it("still requires reasonCode to be a string (loosening is not open-ended)", () => {
        expect(
            Value.Check(ClaimReactionDeleteResponse, {
                removedReaction: { ...fullReaction, reasonCode: 123 },
            })
        ).toBe(false)
    })
})
