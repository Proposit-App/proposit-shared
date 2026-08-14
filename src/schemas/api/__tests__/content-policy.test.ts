import { describe, expect, it } from "vitest"
import { Value } from "typebox/value"
import { ContentPolicyViolationResponseSchema } from "../content-policy.js"
import { GrammarViolationsResponseSchema } from "../grammar-violations.js"

const VALID = {
    error: "CONTENT_POLICY_VIOLATION",
    message: "That content can't be published.",
}

describe("ContentPolicyViolationResponseSchema", () => {
    it("accepts the envelope", () => {
        expect(Value.Check(ContentPolicyViolationResponseSchema, VALID)).toBe(
            true
        )
    })

    it("rejects a body with the wrong discriminator", () => {
        expect(
            Value.Check(ContentPolicyViolationResponseSchema, {
                ...VALID,
                error: "GRAMMAR_VIOLATIONS",
            })
        ).toBe(false)
    })

    it("rejects a body with no message", () => {
        expect(
            Value.Check(ContentPolicyViolationResponseSchema, {
                error: "CONTENT_POLICY_VIOLATION",
            })
        ).toBe(false)
    })

    // Both envelopes answer on 422, so `parseResponse` separates them by shape
    // alone. If either schema ever loosened enough to accept the other's body,
    // detection would depend on ladder order — which is exactly the kind of
    // silent coupling this asserts against.
    it("cannot be confused with the grammar-violations envelope on the shared 422", () => {
        expect(Value.Check(GrammarViolationsResponseSchema, VALID)).toBe(false)
        expect(
            Value.Check(ContentPolicyViolationResponseSchema, {
                error: "GRAMMAR_VIOLATIONS",
                tier: "presentable",
                violations: [],
            })
        ).toBe(false)
    })
})
