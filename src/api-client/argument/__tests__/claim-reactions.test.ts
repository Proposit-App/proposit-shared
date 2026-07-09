import { describe, expect, test } from "vitest"

import { createApiClient } from "../../index.js"

const REACTION_ID = "33333333-3333-3333-3333-333333333333"
const ARGUMENT_ID = "11111111-1111-1111-1111-111111111111"
const CLAIM_ID = "22222222-2222-2222-2222-222222222222"
const USER_ID = "44444444-4444-4444-4444-444444444444"

const fullReaction = {
    id: REACTION_ID,
    argumentId: ARGUMENT_ID,
    argumentVersion: 3,
    claimId: CLAIM_ID,
    claimVersion: 2,
    value: true,
    reasonCode: "well-supported-by-sources",
    userId: USER_ID,
    createdOn: "2026-06-29T00:00:00.000Z",
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

describe("apiClient.createClaimReaction / deleteClaimReaction", () => {
    test("createClaimReaction POSTs the stance+reason to the nested claim route", async () => {
        const calls: { url: string; method?: string; body?: unknown }[] = []
        const fetchImpl: typeof fetch = (input, init) => {
            calls.push({
                url: urlToString(input),
                method: init?.method,
                body: init?.body,
            })
            return Promise.resolve(
                makeJsonResponse(200, { addedReaction: fullReaction })
            )
        }
        const apiClient = createApiClient({
            baseUrl: "https://example.test",
            fetchImpl,
        })

        const res = await apiClient.createClaimReaction("arg-1", 3, "claim-1", {
            value: true,
            reasonCode: "common-knowledge",
        })

        expect(res.ok).toBe(true)
        if (res.ok) {
            expect(res.value.addedReaction.id).toBe(REACTION_ID)
            expect(res.value.addedReaction.createdOn instanceof Date).toBe(true)
        }
        expect(calls).toHaveLength(1)
        expect(calls[0].method).toBe("POST")
        expect(calls[0].url).toBe(
            "https://example.test/api/v1/argument/arg-1/3/claim/claim-1/reactions"
        )
        expect(JSON.parse(calls[0].body as string)).toEqual({
            value: true,
            reasonCode: "common-knowledge",
        })
    })

    test("getClaimReaction GETs the caller's stance snapshot for one claim", async () => {
        const calls: { url: string; method?: string; body?: unknown }[] = []
        const fetchImpl: typeof fetch = (input, init) => {
            calls.push({
                url: urlToString(input),
                method: init?.method,
                body: init?.body,
            })
            return Promise.resolve(
                makeJsonResponse(200, {
                    counts: { affirm: 5, disagree: 2, neutral: 1 },
                    own: { value: true, reasonCode: "common-knowledge" },
                })
            )
        }
        const apiClient = createApiClient({
            baseUrl: "https://example.test",
            fetchImpl,
        })

        const res = await apiClient.getClaimReaction("arg-1", 3, "claim-1")

        expect(res.ok).toBe(true)
        if (res.ok) {
            expect(res.value.counts).toEqual({
                affirm: 5,
                disagree: 2,
                neutral: 1,
            })
            expect(res.value.own).toEqual({
                value: true,
                reasonCode: "common-knowledge",
            })
        }
        expect(calls).toHaveLength(1)
        expect(calls[0].method).toBe("GET")
        expect(calls[0].body).toBeUndefined()
        expect(calls[0].url).toBe(
            "https://example.test/api/v1/argument/arg-1/3/claim/claim-1/reactions"
        )
    })

    test("getClaimReactionMap GETs the per-argument-version bulk map keyed by claimId", async () => {
        const calls: { url: string; method?: string; body?: unknown }[] = []
        const map = {
            "claim-1": {
                counts: { affirm: 5, disagree: 2, neutral: 1 },
                own: { value: true, reasonCode: "common-knowledge" },
            },
            "claim-2": {
                counts: { affirm: 0, disagree: 0, neutral: 0 },
                own: null,
            },
        }
        const fetchImpl: typeof fetch = (input, init) => {
            calls.push({
                url: urlToString(input),
                method: init?.method,
                body: init?.body,
            })
            return Promise.resolve(makeJsonResponse(200, map))
        }
        const apiClient = createApiClient({
            baseUrl: "https://example.test",
            fetchImpl,
        })

        const res = await apiClient.getClaimReactionMap("arg-1", 3)

        expect(res.ok).toBe(true)
        if (res.ok) {
            expect(res.value).toEqual(map)
            expect(res.value["claim-2"].own).toBeNull()
        }
        expect(calls).toHaveLength(1)
        expect(calls[0].method).toBe("GET")
        expect(calls[0].body).toBeUndefined()
        expect(calls[0].url).toBe(
            "https://example.test/api/v1/argument/arg-1/3/claim-reactions"
        )
    })

    test("deleteClaimReaction DELETEs the caller's reaction via the collection route (natural-key, no reaction id)", async () => {
        const calls: { url: string; method?: string }[] = []
        const fetchImpl: typeof fetch = (input, init) => {
            calls.push({ url: urlToString(input), method: init?.method })
            return Promise.resolve(
                makeJsonResponse(200, { removedReaction: fullReaction })
            )
        }
        const apiClient = createApiClient({
            baseUrl: "https://example.test",
            fetchImpl,
        })

        const res = await apiClient.deleteClaimReaction("arg-1", 3, "claim-1")

        expect(res.ok).toBe(true)
        if (res.ok) expect(res.value.removedReaction.id).toBe(REACTION_ID)
        expect(calls).toHaveLength(1)
        expect(calls[0].method).toBe("DELETE")
        expect(calls[0].url).toBe(
            "https://example.test/api/v1/argument/arg-1/3/claim/claim-1/reactions"
        )
    })
})
