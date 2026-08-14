import { describe, expect, it } from "vitest"
import { isContentPolicyViolationError } from "../index.js"

// Imported through the package index rather than the module, because
// `./api-client` is a fixed export subpath: a guard the index does not
// re-export is unreachable for every consumer, and that is the failure this
// pins.
describe("isContentPolicyViolationError", () => {
    it("accepts the envelope", () => {
        expect(
            isContentPolicyViolationError({
                error: "CONTENT_POLICY_VIOLATION",
                message: "That content can't be published.",
            })
        ).toBe(true)
    })

    // One case per sibling envelope in the `parseResponse` ladder. A guard that
    // claims someone else's refusal would silently route a grammar or conflict
    // failure into the content-policy surface.
    const OTHER_ENVELOPES: Record<string, unknown> = {
        "grammar violations": {
            error: "GRAMMAR_VIOLATIONS",
            tier: "presentable",
            violations: [],
        },
        "mutation conflict": {
            error: "MUTATION_CONFLICT",
            code: "ALREADY_PUBLISHED",
            message: "Already published.",
        },
        "review not found": { error: "REVIEW_NOT_FOUND" },
        "review already exists": { error: "REVIEW_ALREADY_EXISTS" },
        "budget exceeded": {
            code: "TOKEN_BUDGET_EXCEEDED",
            message: "Out of budget.",
            usage: { used: 1, limit: 1, resetOn: "2026-09-01T00:00:00.000Z" },
        },
        "a plain error response": {
            statusCode: 500,
            errorMessage: "Unexpected error",
        },
    }

    for (const [name, value] of Object.entries(OTHER_ENVELOPES)) {
        it(`rejects ${name}`, () => {
            expect(isContentPolicyViolationError(value)).toBe(false)
        })
    }

    for (const value of [null, undefined, "CONTENT_POLICY_VIOLATION", 42, []]) {
        it(`rejects the non-object ${JSON.stringify(value) ?? "undefined"}`, () => {
            expect(isContentPolicyViolationError(value)).toBe(false)
        })
    }
})
