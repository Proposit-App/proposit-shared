import { describe, expect, test, vi } from "vitest"

import { createApiClient } from "../../index.js"

const SAMPLE_CURRENT_USER_JSON = {
    usage: {
        userId: "00000000-0000-0000-0000-000000000001",
        argumentCount: 3,
        tokensUsed: 1200,
        lifetimeTokensUsed: 8000,
        tokenResetOn: "2026-08-01T00:00:00.000Z",
        tier: 1,
    },
    limits: {
        maxArguments: 10,
        maxStatementsPerArg: 30,
        maxCitationsPerArg: 20,
        maxTokensPerMonth: 100000,
    },
    username: "alice",
    image: "https://cdn.test/avatar.png",
    preferences: { advancedMode: false },
}

function makeJsonResponse(status: number, body: unknown): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    })
}

describe("apiClient.getCurrentUser", () => {
    test("issues GET /api/v1/user/me and returns the parsed current user on 200", async () => {
        const fetchImpl = vi.fn(() =>
            Promise.resolve(makeJsonResponse(200, SAMPLE_CURRENT_USER_JSON))
        )
        const apiClient = createApiClient({
            baseUrl: "https://example.test",
            fetchImpl,
        })

        const result = await apiClient.getCurrentUser()

        expect(fetchImpl).toHaveBeenCalledTimes(1)
        expect(fetchImpl).toHaveBeenCalledWith(
            "https://example.test/api/v1/user/me",
            { method: "GET" }
        )
        expect(result.ok).toBe(true)
        if (!result.ok) throw new Error("expected ok")
        expect(result.value.username).toBe("alice")
        expect(result.value.image).toBe("https://cdn.test/avatar.png")
        expect(result.value.preferences.advancedMode).toBe(false)
        expect(result.value.usage.argumentCount).toBe(3)
        expect(result.value.limits.maxArguments).toBe(10)
    })

    test("accepts a null username", async () => {
        const fetchImpl = vi.fn(() =>
            Promise.resolve(
                makeJsonResponse(200, {
                    ...SAMPLE_CURRENT_USER_JSON,
                    username: null,
                })
            )
        )
        const apiClient = createApiClient({
            baseUrl: "https://example.test",
            fetchImpl,
        })

        const result = await apiClient.getCurrentUser()
        expect(result.ok).toBe(true)
        if (!result.ok) throw new Error("expected ok")
        expect(result.value.username).toBeNull()
    })
})
