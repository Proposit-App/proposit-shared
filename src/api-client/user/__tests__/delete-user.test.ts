import { describe, expect, test, vi } from "vitest"
import { Value } from "typebox/value"

import { createApiClient } from "../../index.js"
import { UserSchema } from "../../../schemas/model/users.js"

const SAMPLE_USER_JSON = {
    id: "00000000-0000-0000-0000-000000000001",
    name: "Deleted User",
    email: "deleted@example.com",
    emailVerified: null,
    image: null,
    username: "deleted",
    tier: 1,
    tokensUsed: 0,
    lifetimeTokensUsed: 0,
    tokenResetOn: "2026-01-01T00:00:00.000Z",
    deleted: true,
    registrationDate: "2026-01-01T00:00:00.000Z",
}

function makeJsonResponse(status: number, body: unknown): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    })
}

describe("apiClient.deleteUser", () => {
    test("issues DELETE /api/v1/user/me and returns parsed user on 200", async () => {
        const fetchImpl = vi.fn(() =>
            Promise.resolve(makeJsonResponse(200, SAMPLE_USER_JSON))
        )
        const apiClient = createApiClient({
            baseUrl: "https://example.test",
            fetchImpl,
        })

        const result = await apiClient.deleteUser()

        expect(fetchImpl).toHaveBeenCalledTimes(1)
        expect(fetchImpl).toHaveBeenCalledWith(
            "https://example.test/api/v1/user/me",
            { method: "DELETE" }
        )

        expect(result.ok).toBe(true)
        if (!result.ok) throw new Error("expected ok")
        expect(Value.Check(UserSchema, result.value)).toBe(true)
        expect(result.value.id).toBe(SAMPLE_USER_JSON.id)
        expect(result.value.deleted).toBe(true)
    })

    test("returns parsed error on 401", async () => {
        const errorBody = {
            errorID: 1,
            errorMessage: "Unauthorized",
            statusCode: 401,
        }
        const fetchImpl = vi.fn(() =>
            Promise.resolve(makeJsonResponse(401, errorBody))
        )
        const apiClient = createApiClient({
            baseUrl: "https://example.test",
            fetchImpl,
        })

        const result = await apiClient.deleteUser()

        expect(result.ok).toBe(false)
        if (result.ok) throw new Error("expected error")
        expect(result.error.errorMessage).toBe("Unauthorized")
        expect(result.error.statusCode).toBe(401)
    })

    test("returns parsed error on 500", async () => {
        const errorBody = {
            errorID: 99,
            errorMessage: "Unexpected error",
            statusCode: 500,
        }
        const fetchImpl = vi.fn(() =>
            Promise.resolve(makeJsonResponse(500, errorBody))
        )
        const apiClient = createApiClient({
            baseUrl: "https://example.test",
            fetchImpl,
        })

        const result = await apiClient.deleteUser()

        expect(result.ok).toBe(false)
        if (result.ok) throw new Error("expected error")
        expect(result.error.statusCode).toBe(500)
    })

    test("throws when 200 body fails UserSchema validation", async () => {
        const malformed = {
            id: "00000000-0000-0000-0000-000000000002",
            deleted: true,
        }
        const fetchImpl = vi.fn(() =>
            Promise.resolve(makeJsonResponse(200, malformed))
        )
        const apiClient = createApiClient({
            baseUrl: "https://example.test",
            fetchImpl,
        })

        await expect(apiClient.deleteUser()).rejects.toThrow()
    })
})
