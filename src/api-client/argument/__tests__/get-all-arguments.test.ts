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

    test.each(["unpublished", "published", "archived"] as const)(
        "serializes the optional status filter %s into the query string",
        async (status) => {
            const calls: string[] = []
            const fetchImpl: typeof fetch = (input) => {
                calls.push(urlToString(input))
                return Promise.resolve(makeJsonResponse(200, []))
            }
            const apiClient = createApiClient({
                baseUrl: "https://example.test",
                fetchImpl,
            })

            await apiClient.getAllArguments({ status, limit: 20 })

            expect(calls).toHaveLength(1)
            const query = new URL(calls[0]).searchParams
            expect(query.get("status")).toBe(status)
            expect(query.get("limit")).toBe("20")
        }
    )

    test("omits the status param from the URL when not provided", async () => {
        const calls: string[] = []
        const fetchImpl: typeof fetch = (input) => {
            calls.push(urlToString(input))
            return Promise.resolve(makeJsonResponse(200, []))
        }
        const apiClient = createApiClient({
            baseUrl: "https://example.test",
            fetchImpl,
        })

        await apiClient.getAllArguments({ limit: 20 })

        expect(calls).toHaveLength(1)
        expect(new URL(calls[0]).searchParams.has("status")).toBe(false)
    })

    test("serializes the ordering pair into the query string", async () => {
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
            owned: true,
            orderBy: "createdOn",
            orderDirection: "desc",
            limit: 20,
        })

        const query = new URL(calls[0]).searchParams
        expect(query.get("orderBy")).toBe("createdOn")
        expect(query.get("orderDirection")).toBe("desc")
    })

    test("omits the ordering params when not provided", async () => {
        const calls: string[] = []
        const fetchImpl: typeof fetch = (input) => {
            calls.push(urlToString(input))
            return Promise.resolve(makeJsonResponse(200, []))
        }
        const apiClient = createApiClient({
            baseUrl: "https://example.test",
            fetchImpl,
        })

        await apiClient.getAllArguments({ orderByPopularity: true, limit: 20 })

        expect(calls[0]).toBe(
            "https://example.test/api/v1/argument?orderByPopularity=true&limit=20"
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
