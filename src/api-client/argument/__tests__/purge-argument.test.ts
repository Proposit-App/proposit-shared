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

describe("apiClient.purgeArgument", () => {
    test("DELETEs the purge route and returns the deleted ids", async () => {
        const calls: { url: string; method?: string }[] = []
        const fetchImpl: typeof fetch = (input, init) => {
            calls.push({ url: urlToString(input), method: init?.method })
            return Promise.resolve(
                makeJsonResponse(200, {
                    deletedArgumentIds: [
                        "11111111-1111-1111-1111-111111111111",
                        "22222222-2222-2222-2222-222222222222",
                    ],
                })
            )
        }
        const apiClient = createApiClient({
            baseUrl: "https://example.test",
            fetchImpl,
        })

        const res = await apiClient.purgeArgument("arg-1", 2)

        expect(res).toEqual({
            ok: true,
            value: {
                deletedArgumentIds: [
                    "11111111-1111-1111-1111-111111111111",
                    "22222222-2222-2222-2222-222222222222",
                ],
            },
        })
        expect(calls).toHaveLength(1)
        expect(calls[0].method).toBe("DELETE")
        expect(calls[0].url).toBe(
            "https://example.test/api/v1/argument/arg-1/2?purge=true"
        )
    })
})
