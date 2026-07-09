import { describe, expect, test } from "vitest"

import { createApiClient } from "../../index.js"

const REACTION_ID = "33333333-3333-3333-3333-333333333333"
const ARGUMENT_ID = "11111111-1111-1111-1111-111111111111"
const USER_ID = "44444444-4444-4444-4444-444444444444"

const fullReaction = {
    id: REACTION_ID,
    argumentId: ARGUMENT_ID,
    version: 3,
    reaction: "upvote",
    userId: USER_ID,
    createdOn: "2026-06-29T00:00:00.000Z",
}

function makeJsonResponse(status: number, body: unknown): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    })
}

function urlToString(input: Parameters<typeof fetch>[0]): string {
    if (typeof input === "string") return input
    if (input instanceof URL) return input.href
    return input.url
}

describe("apiClient.getReaction", () => {
    test("getReaction GETs the argument-level reactions collection and parses the array", async () => {
        const calls: { url: string; method?: string; body?: unknown }[] = []
        const fetchImpl: typeof fetch = (input, init) => {
            calls.push({
                url: urlToString(input),
                method: init?.method,
                body: init?.body,
            })
            return Promise.resolve(makeJsonResponse(200, [fullReaction]))
        }
        const apiClient = createApiClient({
            baseUrl: "https://example.test",
            fetchImpl,
        })

        const res = await apiClient.getReaction("arg-1", 3)

        expect(res.ok).toBe(true)
        if (res.ok) {
            expect(res.value).toHaveLength(1)
            expect(res.value[0].id).toBe(REACTION_ID)
            expect(res.value[0].reaction).toBe("upvote")
            expect(res.value[0].createdOn instanceof Date).toBe(true)
        }
        expect(calls).toHaveLength(1)
        expect(calls[0].method).toBe("GET")
        expect(calls[0].body).toBeUndefined()
        expect(calls[0].url).toBe(
            "https://example.test/api/v1/argument/arg-1/3/reactions"
        )
    })
})
