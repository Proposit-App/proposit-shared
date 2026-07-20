import { describe, expect, test, vi } from "vitest"

import { createApiClient } from "../../index.js"
import type { TAddParticipantRequest } from "../../../schemas/api/argument/index.js"

const ARGUMENT_ID = "00000000-0000-0000-0000-0000000000a1"
const VERSION = 3
const OWNER_ID = "00000000-0000-0000-0000-0000000000b1"
const EDITOR_ID = "00000000-0000-0000-0000-0000000000b2"

const PARTICIPANT_JSON = {
    argumentId: ARGUMENT_ID,
    version: VERSION,
    userId: EDITOR_ID,
    createdOn: "2026-01-01T00:00:00.000Z",
    role: "editor",
}

const PARTICIPANT_WITH_USER_JSON = {
    ...PARTICIPANT_JSON,
    userId: OWNER_ID,
    role: "owner",
    name: "Owner User",
    username: "owner-user",
    image: null,
}

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

describe("apiClient.getArgumentParticipants", () => {
    test("GETs the participants path and returns the parsed list", async () => {
        const fetchImpl = vi.fn(
            (_uri: string | URL | Request, _init?: RequestInit) =>
                Promise.resolve(
                    makeJsonResponse(200, [PARTICIPANT_WITH_USER_JSON])
                )
        )
        const apiClient = createApiClient({
            baseUrl: "https://example.test",
            fetchImpl,
        })

        const result = await apiClient.getArgumentParticipants(
            ARGUMENT_ID,
            VERSION
        )

        expect(fetchImpl).toHaveBeenCalledTimes(1)
        const [uri, init] = fetchImpl.mock.calls[0]
        expect(urlToString(uri)).toBe(
            `https://example.test/api/v1/argument/${ARGUMENT_ID}/${VERSION}/participants`
        )
        expect(init?.method).toBe("GET")
        expect(result.ok).toBe(true)
        if (!result.ok) throw new Error("expected ok")
        expect(result.value).toHaveLength(1)
        expect(result.value[0].userId).toBe(OWNER_ID)
        expect(result.value[0].role).toBe("owner")
    })

    test("returns parsed error on 403", async () => {
        const fetchImpl = vi.fn(
            (_uri: string | URL | Request, _init?: RequestInit) =>
                Promise.resolve(
                    makeJsonResponse(403, {
                        errorID: 1,
                        errorMessage: "Not permitted.",
                        statusCode: 403,
                    })
                )
        )
        const apiClient = createApiClient({
            baseUrl: "https://example.test",
            fetchImpl,
        })

        const result = await apiClient.getArgumentParticipants(
            ARGUMENT_ID,
            VERSION
        )

        expect(result.ok).toBe(false)
        if (result.ok) throw new Error("expected error")
        if (!("statusCode" in result.error)) {
            throw new Error("expected TErrorResponse branch")
        }
        expect(result.error.statusCode).toBe(403)
    })
})

describe("apiClient.addArgumentEditor", () => {
    test("POSTs the body to the participants path and returns the participant", async () => {
        const fetchImpl = vi.fn(
            (_uri: string | URL | Request, _init?: RequestInit) =>
                Promise.resolve(makeJsonResponse(200, PARTICIPANT_JSON))
        )
        const apiClient = createApiClient({
            baseUrl: "https://example.test",
            fetchImpl,
        })

        const body: TAddParticipantRequest = { userId: EDITOR_ID }
        const result = await apiClient.addArgumentEditor(
            ARGUMENT_ID,
            VERSION,
            body
        )

        expect(fetchImpl).toHaveBeenCalledTimes(1)
        const [uri, init] = fetchImpl.mock.calls[0]
        expect(urlToString(uri)).toBe(
            `https://example.test/api/v1/argument/${ARGUMENT_ID}/${VERSION}/participants`
        )
        expect(init?.method).toBe("POST")
        expect(JSON.parse(init?.body as string)).toEqual(body)
        expect(result.ok).toBe(true)
        if (!result.ok) throw new Error("expected ok")
        expect(result.value.userId).toBe(EDITOR_ID)
        expect(result.value.role).toBe("editor")
    })

    test("returns parsed error on 409 (already a participant)", async () => {
        const fetchImpl = vi.fn(
            (_uri: string | URL | Request, _init?: RequestInit) =>
                Promise.resolve(
                    makeJsonResponse(409, {
                        errorID: 1,
                        errorMessage: "Already a participant.",
                        statusCode: 409,
                    })
                )
        )
        const apiClient = createApiClient({
            baseUrl: "https://example.test",
            fetchImpl,
        })

        const result = await apiClient.addArgumentEditor(ARGUMENT_ID, VERSION, {
            userId: EDITOR_ID,
        })

        expect(result.ok).toBe(false)
        if (result.ok) throw new Error("expected error")
        if (!("statusCode" in result.error)) {
            throw new Error("expected TErrorResponse branch")
        }
        expect(result.error.statusCode).toBe(409)
    })
})

describe("apiClient.removeArgumentParticipant", () => {
    test("DELETEs the participant path (no response body)", async () => {
        const fetchImpl = vi.fn(
            (_uri: string | URL | Request, _init?: RequestInit) =>
                Promise.resolve(new Response(null, { status: 204 }))
        )
        const apiClient = createApiClient({
            baseUrl: "https://example.test",
            fetchImpl,
        })

        const result = await apiClient.removeArgumentParticipant(
            ARGUMENT_ID,
            VERSION,
            EDITOR_ID
        )

        expect(result).toBeUndefined()
        expect(fetchImpl).toHaveBeenCalledTimes(1)
        const [uri, init] = fetchImpl.mock.calls[0]
        expect(urlToString(uri)).toBe(
            `https://example.test/api/v1/argument/${ARGUMENT_ID}/${VERSION}/participants/${EDITOR_ID}`
        )
        expect(init?.method).toBe("DELETE")
    })
})
