import { describe, expect, test } from "vitest"

import {
    createReviewRemoteImpl,
    getMyReviewImpl,
    getReviewByIdRemoteImpl,
} from "../argument/reviews.js"
import {
    isReviewAlreadyExistsError,
    isReviewNotFoundError,
} from "../review-errors.js"
import { isBudgetExceededError } from "../budget-exceeded.js"
import { ArgumentCreateTask } from "../../schemas/tasks.js"
import { parseResponse } from "../../utils/utils.js"
import type { TApiClientConfig } from "../config.js"

/**
 * The real thing, not a schema fixture: this defect lived in the response
 * normalizer, so anything short of a `Response` through the actual call would
 * have passed while a signed-in reader could not start their first review.
 */
function configReturning(status: number, body: unknown): TApiClientConfig {
    return {
        baseUrl: "https://example.test",
        fetchImpl: () =>
            Promise.resolve(
                new Response(JSON.stringify(body), {
                    status,
                    headers: { "content-type": "application/json" },
                })
            ),
    } as unknown as TApiClientConfig
}

describe("a review that does not exist yet", () => {
    test("getMyReview resolves on the typed 404 rather than rejecting", async () => {
        const res = await getMyReviewImpl(
            configReturning(404, { error: "not_found" }),
            "arg-1",
            1
        )
        expect(res.ok).toBe(false)
        if (res.ok) throw new Error("expected the not-found envelope")
        expect(isReviewNotFoundError(res.error)).toBe(true)
    })

    test("the same envelope on the by-id endpoint", async () => {
        const res = await getReviewByIdRemoteImpl(
            configReturning(404, { error: "not_found" }),
            "arg-1",
            1,
            "rev-1"
        )
        expect(res.ok).toBe(false)
        if (res.ok) throw new Error("expected the not-found envelope")
        expect(isReviewNotFoundError(res.error)).toBe(true)
    })

    test("is distinguishable from a transport failure without catching", async () => {
        const res = await getMyReviewImpl(
            configReturning(500, {
                errorID: -1,
                errorMessage: "Unexpected error",
                statusCode: 500,
            }),
            "arg-1",
            1
        )
        expect(res.ok).toBe(false)
        if (res.ok) throw new Error("expected an error envelope")
        expect(isReviewNotFoundError(res.error)).toBe(false)
    })
})

describe("a review that already exists", () => {
    test("createReview resolves on the typed 409 rather than rejecting", async () => {
        // Reached whenever a second tab, or a retry after a partial failure,
        // asks for a review the reader already has.
        const res = await createReviewRemoteImpl(
            configReturning(409, {
                error: "already_exists",
                reviewId: "00000000-0000-0000-0000-000000000001",
            }),
            "arg-1",
            1
        )
        expect(res.ok).toBe(false)
        if (res.ok) throw new Error("expected the already-exists envelope")
        expect(isReviewAlreadyExistsError(res.error)).toBe(true)
        if (!isReviewAlreadyExistsError(res.error)) return
        expect(res.error.reviewId).toBe("00000000-0000-0000-0000-000000000001")
    })
})

describe("an exhausted token budget", () => {
    test("resolves on the typed 402 rather than rejecting", async () => {
        // Through the normalizer directly rather than through
        // `importArgumentImpl`: that call asserts its request body first, and
        // the defect being pinned is on the response side. Same envelope the
        // import and build routes emit.
        const res = await parseResponse(
            new Response(
                JSON.stringify({
                    code: "TOKEN_BUDGET_EXCEEDED",
                    message: "You have exceeded your monthly token limit.",
                    usage: {
                        used: 100,
                        limit: 100,
                        resetOn: "2026-09-01T00:00:00.000Z",
                    },
                }),
                { status: 402 }
            ),
            ArgumentCreateTask
        )
        expect(res.ok).toBe(false)
        if (res.ok) throw new Error("expected the budget envelope")
        expect(isBudgetExceededError(res.error)).toBe(true)
        if (!isBudgetExceededError(res.error)) return
        expect(res.error.usage.limit).toBe(100)
    })
})
