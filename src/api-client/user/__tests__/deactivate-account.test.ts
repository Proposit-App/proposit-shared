import { describe, expect, test, vi } from "vitest"

import { createApiClient } from "../../index.js"

const DEACTIVATED_USER_JSON = {
    id: "00000000-0000-0000-0000-000000000001",
    name: "Alice",
    email: "alice@example.com",
    emailVerified: null,
    image: null,
    username: "alice",
    curationId: null,
    tier: 1,
    accountState: "deactivated",
    tokensUsed: 0,
    lifetimeTokensUsed: 0,
    tokenResetOn: "2026-01-01T00:00:00.000Z",
    registrationDate: "2026-01-01T00:00:00.000Z",
    preferences: { advancedMode: false },
}

function makeJsonResponse(status: number, body: unknown): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    })
}

describe("apiClient.deactivateAccount", () => {
    test("issues PATCH /api/v1/user/me and returns the updated user", async () => {
        const fetchImpl = vi.fn(
            (_uri: string | URL | Request, _init?: RequestInit) =>
                Promise.resolve(makeJsonResponse(200, DEACTIVATED_USER_JSON))
        )
        const apiClient = createApiClient({
            baseUrl: "https://example.test",
            fetchImpl,
        })

        const result = await apiClient.deactivateAccount()

        expect(fetchImpl).toHaveBeenCalledTimes(1)
        const [uri, init] = fetchImpl.mock.calls[0]
        expect(uri).toBe("https://example.test/api/v1/user/me")
        expect(init?.method).toBe("PATCH")
        // The route accepts one value, so the caller never supplies it — a
        // client that could ask for `banned` or `deleted` would be a client
        // that could hand a user an admin's reach.
        expect(JSON.parse(init?.body as string)).toEqual({
            accountState: "deactivated",
        })
        expect(result.ok).toBe(true)
        if (!result.ok) throw new Error("expected ok")
        expect(result.value.accountState).toBe("deactivated")
        // The whole reason state left `tier`: a reversible transition must not
        // cost the entitlement.
        expect(result.value.tier).toBe(1)
    })

    test("surfaces a refused transition as an error result, not a throw", async () => {
        const fetchImpl = vi.fn(
            (_uri: string | URL | Request, _init?: RequestInit) =>
                Promise.resolve(
                    makeJsonResponse(400, {
                        errorID: 0,
                        errorMessage: "Account is already deactivated.",
                        statusCode: 400,
                    })
                )
        )
        const apiClient = createApiClient({
            baseUrl: "https://example.test",
            fetchImpl,
        })

        const result = await apiClient.deactivateAccount()

        expect(result.ok).toBe(false)
    })
})
