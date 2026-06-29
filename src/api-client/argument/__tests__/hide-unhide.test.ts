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

describe("apiClient.hideArgument / unhideArgument", () => {
    test("hideArgument POSTs to the hide route and returns the parsed flag", async () => {
        const calls: { url: string; method?: string }[] = []
        const fetchImpl: typeof fetch = (input, init) => {
            calls.push({ url: urlToString(input), method: init?.method })
            return Promise.resolve(makeJsonResponse(200, { hidden: true }))
        }
        const apiClient = createApiClient({
            baseUrl: "https://example.test",
            fetchImpl,
        })

        const res = await apiClient.hideArgument("arg-1", 3)

        expect(res).toEqual({ ok: true, value: { hidden: true } })
        expect(calls).toHaveLength(1)
        expect(calls[0].method).toBe("POST")
        expect(calls[0].url).toBe(
            "https://example.test/api/v1/argument/arg-1/3/hide"
        )
    })

    test("unhideArgument POSTs to the unhide route and returns the parsed flag", async () => {
        const calls: { url: string; method?: string }[] = []
        const fetchImpl: typeof fetch = (input, init) => {
            calls.push({ url: urlToString(input), method: init?.method })
            return Promise.resolve(makeJsonResponse(200, { hidden: false }))
        }
        const apiClient = createApiClient({
            baseUrl: "https://example.test",
            fetchImpl,
        })

        const res = await apiClient.unhideArgument("arg-1", 3)

        expect(res).toEqual({ ok: true, value: { hidden: false } })
        expect(calls).toHaveLength(1)
        expect(calls[0].method).toBe("POST")
        expect(calls[0].url).toBe(
            "https://example.test/api/v1/argument/arg-1/3/unhide"
        )
    })
})
