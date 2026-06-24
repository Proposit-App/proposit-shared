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

const claimId = "11111111-1111-1111-1111-111111111111"

describe("apiClient.getLatestClaimVersion", () => {
    test("GETs /api/v1/claim/[claimId]/latest-version with no pinned param", async () => {
        const calls: { url: string; method?: string }[] = []
        const fetchImpl: typeof fetch = (input, init) => {
            calls.push({ url: urlToString(input), method: init?.method })
            return Promise.resolve(
                makeJsonResponse(200, {
                    claimId,
                    latestPublishedVersion: 3,
                    hasNewer: false,
                })
            )
        }
        const apiClient = createApiClient({
            baseUrl: "https://example.test",
            fetchImpl,
        })

        const result = await apiClient.getLatestClaimVersion(claimId)

        expect(calls).toHaveLength(1)
        expect(calls[0].url).toBe(
            `https://example.test/api/v1/claim/${claimId}/latest-version`
        )
        expect(calls[0].method).toBe("GET")
        expect(result.ok).toBe(true)
        if (!result.ok) throw new Error("expected ok=true")
        expect(result.value.claimId).toBe(claimId)
        expect(result.value.latestPublishedVersion).toBe(3)
        expect(result.value.hasNewer).toBe(false)
    })

    test("appends ?pinned when supplied and round-trips a null latestPublishedVersion", async () => {
        const calls: { url: string }[] = []
        const fetchImpl: typeof fetch = (input) => {
            calls.push({ url: urlToString(input) })
            return Promise.resolve(
                makeJsonResponse(200, {
                    claimId,
                    latestPublishedVersion: null,
                    hasNewer: false,
                })
            )
        }
        const apiClient = createApiClient({
            baseUrl: "https://example.test",
            fetchImpl,
        })

        const result = await apiClient.getLatestClaimVersion(claimId, 2)

        expect(calls[0].url).toBe(
            `https://example.test/api/v1/claim/${claimId}/latest-version?pinned=2`
        )
        expect(result.ok).toBe(true)
        if (!result.ok) throw new Error("expected ok=true")
        expect(result.value.latestPublishedVersion).toBeNull()
    })
})

/**
 * Helper: build a minimal axiomatic claim body that round-trips cleanly
 * through ClaimSchema. The `GET /latest` endpoint returns a full claim, so
 * the api-client method validates the response against ClaimSchema on the way
 * out — callers get a typed rejection when the server's shape drifts.
 */
function makeClaimBody() {
    return {
        id: claimId,
        originArgumentId: "arg-1",
        version: 2,
        published: true,
        publishedOn: new Date("2026-05-19").toISOString(),
        creatorId: "user-1",
        createdOn: new Date("2026-05-19").toISOString(),
        digest: "claim-digest",
        claimForkId: null,
        parentId: null,
        type: "axiomatic",
        kind: null,
        title: null,
        body: null,
        titleContentHash: null,
        url: null,
        citation: null,
        citationContentHash: null,
        axiom: "logical-principle",
    }
}

describe("apiClient.getLatestClaim", () => {
    test("GETs /api/v1/claim/[claimId]/latest and round-trips a valid claim", async () => {
        const calls: { url: string; method?: string }[] = []
        const fetchImpl: typeof fetch = (input, init) => {
            calls.push({ url: urlToString(input), method: init?.method })
            return Promise.resolve(makeJsonResponse(200, makeClaimBody()))
        }
        const apiClient = createApiClient({
            baseUrl: "https://example.test",
            fetchImpl,
        })

        const result = await apiClient.getLatestClaim(claimId)

        expect(calls).toHaveLength(1)
        expect(calls[0].url).toBe(
            `https://example.test/api/v1/claim/${claimId}/latest`
        )
        expect(calls[0].method).toBe("GET")
        expect(result.ok).toBe(true)
        if (!result.ok) throw new Error("expected ok=true")
        expect(result.value.id).toBe(claimId)
        expect(result.value.version).toBe(2)
        expect(result.value.type).toBe("axiomatic")
    })

    test("rejects malformed response bodies through strictFetch's schema validator", async () => {
        // Drop a required field so the response no longer matches any ClaimSchema
        // variant, surfacing a parse rejection rather than a silent pass-through.
        const malformed = makeClaimBody() as Record<string, unknown>
        delete malformed.type
        const fetchImpl: typeof fetch = () =>
            Promise.resolve(makeJsonResponse(200, malformed))
        const apiClient = createApiClient({
            baseUrl: "https://example.test",
            fetchImpl,
        })

        await expect(apiClient.getLatestClaim(claimId)).rejects.toThrowError()
    })
})

describe("apiClient.advanceClaimReference", () => {
    test("POSTs to /api/v1/argument/[id]/[v]/claim/[claimId]/advance with an explicit toVersion", async () => {
        const calls: { url: string; method?: string; body?: unknown }[] = []
        const fetchImpl: typeof fetch = (input, init) => {
            calls.push({
                url: urlToString(input),
                method: init?.method,
                body:
                    typeof init?.body === "string"
                        ? JSON.parse(init.body)
                        : init?.body,
            })
            return Promise.resolve(
                makeJsonResponse(200, { claimId, newVersion: 4 })
            )
        }
        const apiClient = createApiClient({
            baseUrl: "https://example.test",
            fetchImpl,
        })

        const result = await apiClient.advanceClaimReference(
            "arg-1",
            1,
            claimId,
            4
        )

        expect(calls).toHaveLength(1)
        expect(calls[0].url).toBe(
            `https://example.test/api/v1/argument/arg-1/1/claim/${claimId}/advance`
        )
        expect(calls[0].method).toBe("POST")
        expect(calls[0].body).toEqual({ toVersion: 4 })
        expect(result.ok).toBe(true)
        if (!result.ok) throw new Error("expected ok=true")
        expect(result.value.claimId).toBe(claimId)
        expect(result.value.newVersion).toBe(4)
    })

    test("omits toVersion from the body when not supplied (advance to head)", async () => {
        const calls: { body?: unknown }[] = []
        const fetchImpl: typeof fetch = (_input, init) => {
            calls.push({
                body:
                    typeof init?.body === "string"
                        ? JSON.parse(init.body)
                        : init?.body,
            })
            return Promise.resolve(
                makeJsonResponse(200, { claimId, newVersion: 5 })
            )
        }
        const apiClient = createApiClient({
            baseUrl: "https://example.test",
            fetchImpl,
        })

        const result = await apiClient.advanceClaimReference(
            "arg-1",
            1,
            claimId
        )

        expect(calls[0].body).toEqual({})
        expect(result.ok).toBe(true)
        if (!result.ok) throw new Error("expected ok=true")
        expect(result.value.newVersion).toBe(5)
    })

    test("rejects malformed response bodies through strictFetch's schema validator", async () => {
        const fetchImpl: typeof fetch = () =>
            // newVersion missing → schema rejection
            Promise.resolve(makeJsonResponse(200, { claimId }))
        const apiClient = createApiClient({
            baseUrl: "https://example.test",
            fetchImpl,
        })

        await expect(
            apiClient.advanceClaimReference("arg-1", 1, claimId)
        ).rejects.toThrowError()
    })
})
