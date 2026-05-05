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

describe("apiClient.getAllArguments", () => {
    test("passes an absolute URL (with origin) to fetchImpl", async () => {
        const calls: string[] = []
        const fetchImpl: typeof fetch = (input) => {
            calls.push(urlToString(input))
            return Promise.resolve(makeJsonResponse(200, []))
        }
        const apiClient = createApiClient({
            baseUrl: "https://example.test",
            fetchImpl,
        })

        await apiClient.getAllArguments({
            orderByPopularity: true,
            limit: 20,
            offset: 0,
        })

        expect(calls).toHaveLength(1)
        expect(new URL(calls[0]).origin).toBe("https://example.test")
        expect(calls[0]).toBe(
            "https://example.test/api/v1/argument?orderByPopularity=true&limit=20&offset=0"
        )
    })

    test("passes an absolute URL even when no params are provided", async () => {
        const calls: string[] = []
        const fetchImpl: typeof fetch = (input) => {
            calls.push(urlToString(input))
            return Promise.resolve(makeJsonResponse(200, []))
        }
        const apiClient = createApiClient({
            baseUrl: "https://example.test",
            fetchImpl,
        })

        await apiClient.getAllArguments()

        expect(calls).toHaveLength(1)
        expect(new URL(calls[0]).origin).toBe("https://example.test")
    })
})
