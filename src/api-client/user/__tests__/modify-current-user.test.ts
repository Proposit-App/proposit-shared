import { describe, expect, test, vi } from "vitest"

import { createApiClient } from "../../index.js"

const UPDATED_USER_JSON = {
    id: "00000000-0000-0000-0000-000000000001",
    name: "Alice",
    email: "alice@example.com",
    emailVerified: null,
    image: null,
    username: "alice2",
    curationId: null,
    tier: 1,
    tokensUsed: 0,
    lifetimeTokensUsed: 0,
    tokenResetOn: "2026-01-01T00:00:00.000Z",
    deleted: false,
    registrationDate: "2026-01-01T00:00:00.000Z",
    preferences: { advancedMode: true },
}

function makeJsonResponse(status: number, body: unknown): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    })
}

describe("apiClient.modifyCurrentUser", () => {
    test("issues PUT /api/v1/user/me with the body and returns the updated user", async () => {
        const fetchImpl = vi.fn(
            (_uri: string | URL | Request, _init?: RequestInit) =>
                Promise.resolve(makeJsonResponse(200, UPDATED_USER_JSON))
        )
        const apiClient = createApiClient({
            baseUrl: "https://example.test",
            fetchImpl,
        })

        const result = await apiClient.modifyCurrentUser({ username: "alice2" })

        expect(fetchImpl).toHaveBeenCalledTimes(1)
        const [uri, init] = fetchImpl.mock.calls[0]
        expect(uri).toBe("https://example.test/api/v1/user/me")
        expect(init?.method).toBe("PUT")
        expect(JSON.parse(init?.body as string)).toEqual({ username: "alice2" })
        expect(result.ok).toBe(true)
        if (!result.ok) throw new Error("expected ok")
        expect(result.value.username).toBe("alice2")
        expect(result.value.preferences.advancedMode).toBe(true)
    })

    test("sends a partial preferences patch", async () => {
        const fetchImpl = vi.fn(
            (_uri: string | URL | Request, _init?: RequestInit) =>
                Promise.resolve(makeJsonResponse(200, UPDATED_USER_JSON))
        )
        const apiClient = createApiClient({
            baseUrl: "https://example.test",
            fetchImpl,
        })

        await apiClient.modifyCurrentUser({
            preferences: { advancedMode: true },
        })

        const [, init] = fetchImpl.mock.calls[0]
        expect(JSON.parse(init?.body as string)).toEqual({
            preferences: { advancedMode: true },
        })
    })
})
