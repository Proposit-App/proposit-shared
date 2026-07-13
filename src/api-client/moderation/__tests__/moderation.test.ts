import { describe, expect, test } from "vitest"

import { createApiClient } from "../../index.js"

const TARGET_ID = "11111111-1111-4111-8111-111111111111"
const REPORT_ID = "22222222-2222-4222-8222-222222222222"
const BLOCKED_USER_ID = "33333333-3333-4333-8333-333333333333"

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

type TCall = { url: string; method?: string; body?: unknown }

function makeClient(status: number, body: unknown, calls: TCall[]) {
    const fetchImpl: typeof fetch = (input, init) => {
        calls.push({
            url: urlToString(input),
            method: init?.method,
            body: init?.body,
        })
        return Promise.resolve(makeJsonResponse(status, body))
    }
    return createApiClient({ baseUrl: "https://example.test", fetchImpl })
}

describe("apiClient moderation", () => {
    test("reportContent POSTs the report body to the moderation report route", async () => {
        const calls: TCall[] = []
        const client = makeClient(
            200,
            { reportId: REPORT_ID, status: "received" },
            calls
        )

        const res = await client.reportContent({
            targetType: "argument",
            targetId: TARGET_ID,
            reasonCode: "spam",
        })

        expect(res.ok).toBe(true)
        if (res.ok) expect(res.value.reportId).toBe(REPORT_ID)
        expect(calls).toHaveLength(1)
        expect(calls[0].method).toBe("POST")
        expect(calls[0].url).toBe(
            "https://example.test/api/v1/moderation/report"
        )
        const sentBody = JSON.parse(calls[0].body as string) as {
            reasonCode: string
        }
        expect(sentBody.reasonCode).toBe("spam")
    })

    test("blockUser POSTs to the block route", async () => {
        const calls: TCall[] = []
        const client = makeClient(
            200,
            { blockedUserId: BLOCKED_USER_ID, blocked: true },
            calls
        )

        const res = await client.blockUser({ blockedUserId: BLOCKED_USER_ID })

        expect(res.ok).toBe(true)
        if (res.ok) expect(res.value.blocked).toBe(true)
        expect(calls[0].method).toBe("POST")
        expect(calls[0].url).toBe(
            "https://example.test/api/v1/moderation/block"
        )
    })

    test("unblockUser POSTs to the unblock route", async () => {
        const calls: TCall[] = []
        const client = makeClient(
            200,
            { blockedUserId: BLOCKED_USER_ID, blocked: false },
            calls
        )

        const res = await client.unblockUser({ blockedUserId: BLOCKED_USER_ID })

        expect(res.ok).toBe(true)
        if (res.ok) expect(res.value.blocked).toBe(false)
        expect(calls[0].url).toBe(
            "https://example.test/api/v1/moderation/unblock"
        )
    })

    test("getMyBlocks GETs the blocks collection and parses the array", async () => {
        const calls: TCall[] = []
        const client = makeClient(
            200,
            [{ userId: BLOCKED_USER_ID, username: "blocked-one" }],
            calls
        )

        const res = await client.getMyBlocks()

        expect(res.ok).toBe(true)
        if (res.ok) {
            expect(res.value).toHaveLength(1)
            expect(res.value[0].userId).toBe(BLOCKED_USER_ID)
        }
        expect(calls[0].method).toBe("GET")
        expect(calls[0].body).toBeUndefined()
        expect(calls[0].url).toBe(
            "https://example.test/api/v1/moderation/blocks"
        )
    })
})
