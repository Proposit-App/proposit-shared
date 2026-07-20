import { describe, expect, test, vi } from "vitest"

import { createApiClient } from "../../index.js"

const INVITATION_JSON = {
    code: "some-invite-code",
    createdBy: "00000000-0000-0000-0000-000000000001",
    createdOn: "2026-01-01T00:00:00.000Z",
    expiresOn: "2026-01-08T00:00:00.000Z",
    used: true,
    usedOn: "2026-01-02T00:00:00.000Z",
    usedBy: "00000000-0000-0000-0000-000000000002",
    presetUserTier: 1,
    presetSystemRole: "Normal",
}

const ACTIVATION_BODY = {
    code: "some-invite-code",
    isPromoCode: false,
    agreedToTerms: true,
    agreedToPrivacyPolicy: true,
    agreedToCommunityGuidelines: true,
}

function makeJsonResponse(status: number, body: unknown): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    })
}

describe("apiClient.activateRegistrationInvite", () => {
    test("issues POST /api/v1/user/register with the body and returns the invitation", async () => {
        const fetchImpl = vi.fn(
            (_uri: string | URL | Request, _init?: RequestInit) =>
                Promise.resolve(makeJsonResponse(200, INVITATION_JSON))
        )
        const apiClient = createApiClient({
            baseUrl: "https://example.test",
            fetchImpl,
        })

        const result =
            await apiClient.activateRegistrationInvite(ACTIVATION_BODY)

        expect(fetchImpl).toHaveBeenCalledTimes(1)
        const [uri, init] = fetchImpl.mock.calls[0]
        expect(uri).toBe("https://example.test/api/v1/user/register")
        expect(init?.method).toBe("POST")
        expect(JSON.parse(init?.body as string)).toEqual(ACTIVATION_BODY)
        expect(result.ok).toBe(true)
        if (!result.ok) throw new Error("expected ok")
        expect(result.value.code).toBe("some-invite-code")
        expect(result.value.used).toBe(true)
    })

    test("returns parsed error on 400 (did_not_agree)", async () => {
        const errorBody = {
            errorID: 1,
            errorMessage: "did_not_agree",
            statusCode: 400,
        }
        const fetchImpl = vi.fn(() =>
            Promise.resolve(makeJsonResponse(400, errorBody))
        )
        const apiClient = createApiClient({
            baseUrl: "https://example.test",
            fetchImpl,
        })

        const result = await apiClient.activateRegistrationInvite({
            ...ACTIVATION_BODY,
            agreedToTerms: false,
        })

        expect(result.ok).toBe(false)
        if (result.ok) throw new Error("expected error")
        if (!("statusCode" in result.error)) {
            throw new Error("expected TErrorResponse branch")
        }
        expect(result.error.statusCode).toBe(400)
    })
})
