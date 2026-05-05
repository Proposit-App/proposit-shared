import { describe, expect, test } from "vitest"

import { createApiClient } from "../../../index.js"

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

describe("apiClient.getExpressions", () => {
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

        await apiClient.getExpressions("arg-123", 1)

        expect(calls).toHaveLength(1)
        expect(new URL(calls[0]).origin).toBe("https://example.test")
        expect(calls[0]).toBe(
            "https://example.test/api/v1/argument/arg-123/1/logic/expressions"
        )
    })

    test("passes an absolute URL with premiseId query param", async () => {
        const calls: string[] = []
        const fetchImpl: typeof fetch = (input) => {
            calls.push(urlToString(input))
            return Promise.resolve(makeJsonResponse(200, []))
        }
        const apiClient = createApiClient({
            baseUrl: "https://example.test",
            fetchImpl,
        })

        await apiClient.getExpressions("arg-123", 1, "prem-456")

        expect(calls).toHaveLength(1)
        expect(new URL(calls[0]).origin).toBe("https://example.test")
        expect(calls[0]).toBe(
            "https://example.test/api/v1/argument/arg-123/1/logic/expressions?premiseId=prem-456"
        )
    })
})
