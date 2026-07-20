import { describe, expect, test, vi } from "vitest"

import { createApiClient } from "../../index.js"
import type { TRegistrationInvitationCreate } from "../../../schemas/model/users.js"

const INVITATION_JSON = {
    code: "minted-invite-code",
    createdBy: "00000000-0000-0000-0000-000000000001",
    createdOn: "2026-01-01T00:00:00.000Z",
    expiresOn: "2026-01-08T00:00:00.000Z",
    used: false,
    usedOn: null,
    usedBy: null,
    presetUserTier: 1,
    presetSystemRole: "Normal",
}

const CREATE_BODY: TRegistrationInvitationCreate = {
    presetUserTier: 1,
    presetSystemRole: "Normal",
}

function makeJsonResponse(status: number, body: unknown): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    })
}

describe("apiClient.issueInvitation", () => {
    test("issues POST /api/v1/user/invite with the body and returns the invitation", async () => {
        const fetchImpl = vi.fn(
            (_uri: string | URL | Request, _init?: RequestInit) =>
                Promise.resolve(makeJsonResponse(200, INVITATION_JSON))
        )
        const apiClient = createApiClient({
            baseUrl: "https://example.test",
            fetchImpl,
        })

        const result = await apiClient.issueInvitation(CREATE_BODY)

        expect(fetchImpl).toHaveBeenCalledTimes(1)
        const [uri, init] = fetchImpl.mock.calls[0]
        expect(uri).toBe("https://example.test/api/v1/user/invite")
        expect(init?.method).toBe("POST")
        expect(JSON.parse(init?.body as string)).toEqual(CREATE_BODY)
        expect(result.ok).toBe(true)
        if (!result.ok) throw new Error("expected ok")
        expect(result.value.code).toBe("minted-invite-code")
        expect(result.value.used).toBe(false)
    })

    test("returns parsed error on 403 (insufficient permissions)", async () => {
        const errorBody = {
            errorID: 1,
            errorMessage:
                "You cannot create an invitation granting permissions you do not hold.",
            statusCode: 403,
        }
        const fetchImpl = vi.fn(() =>
            Promise.resolve(makeJsonResponse(403, errorBody))
        )
        const apiClient = createApiClient({
            baseUrl: "https://example.test",
            fetchImpl,
        })

        const result = await apiClient.issueInvitation({
            presetUserTier: 1,
            presetSystemRole: "Admin",
        } satisfies TRegistrationInvitationCreate)

        expect(result.ok).toBe(false)
        if (result.ok) throw new Error("expected error")
        if (!("statusCode" in result.error)) {
            throw new Error("expected TErrorResponse branch")
        }
        expect(result.error.statusCode).toBe(403)
    })
})
