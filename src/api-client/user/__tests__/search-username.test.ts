import { describe, expect, test } from "vitest"

import { createApiClient } from "../../index.js"

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

function stubClient(response: Response) {
    const calls: string[] = []
    const apiClient = createApiClient({
        baseUrl: "https://example.test",
        fetchImpl: (input) => {
            calls.push(urlToString(input))
            return Promise.resolve(response)
        },
    })
    return { apiClient, calls }
}

describe("apiClient.searchUsername", () => {
    test("reads the lookup route and parses the account it resolves to", async () => {
        const account = {
            userId: "6f1c2b6e-6a1e-4f5f-9f3a-2f9c1a7d4e11",
            username: "socrates",
            imageURI: null,
        }
        const { apiClient, calls } = stubClient(makeJsonResponse(200, account))

        const result = await apiClient.searchUsername("socrates")

        expect(calls).toEqual([
            "https://example.test/api/v1/user/search?username=socrates",
        ])
        expect(result.ok).toBe(true)
        if (result.ok) expect(result.value).toEqual(account)
    })

    test("encodes a handle with a space and a slash exactly once", async () => {
        // The curated personas carry handles of this shape ("Socrates / Plato").
        // Decoding the issued URL rather than matching its text is deliberate: a
        // double encode still yields a well-formed URL that simply resolves
        // nobody, so it reads as "no such account" instead of as a defect.
        const handle = "Socrates / Plato"
        const { apiClient, calls } = stubClient(
            makeJsonResponse(200, {
                userId: "1b7d0a44-1c6f-4b0e-9d5a-3c8e2f6b9a02",
                username: handle,
                imageURI: null,
            })
        )

        await apiClient.searchUsername(handle)

        expect(calls).toHaveLength(1)
        expect(new URL(calls[0]).searchParams.get("username")).toBe(handle)
    })

    test("reports an unresolvable handle as a failed result rather than throwing", async () => {
        // The body the route's `createErrorResponse("User not found", 404)`
        // actually emits, so this exercises the real refusal rather than a
        // convenient stand-in.
        const { apiClient } = stubClient(
            makeJsonResponse(404, {
                errorMessage: "User not found",
                errorID: -1,
                statusCode: 404,
            })
        )

        const result = await apiClient.searchUsername("nobody")

        expect(result.ok).toBe(false)
        // `parseResponse` returns a union of error bodies, only some of which
        // carry a status, so narrow the way a real caller has to.
        if (!result.ok && "statusCode" in result.error) {
            expect(result.error.statusCode).toBe(404)
        }
    })
})
