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

const ARGUMENT_ID = "11111111-1111-4111-8111-111111111111"
const CREATOR_ID = "22222222-2222-4222-8222-222222222222"
const CREATED_ON = "2026-08-01T12:00:00.000Z"

/**
 * A wire-form argument carrying every field the profile page's claimable-argument
 * list dereferences, on top of the full set `ArgumentSchema` requires. Written
 * out rather than generated so a schema change that would break the list surfaces
 * as a failing test here.
 */
const wireArgument = {
    id: ARGUMENT_ID,
    version: 3,
    checksum: "abc123",
    descendantChecksum: null,
    combinedChecksum: "abc123",
    title: "A claimable argument",
    published: false,
    creatorId: CREATOR_ID,
    createdOn: CREATED_ON,
    publishedOn: null,
    forkId: null,
    digest: "digest-value",
    popularity: 0,
    platform: "twitter",
    platformData: {
        textContent: "the original post text",
        postUrl: "https://x.com/someone/status/1",
        importMode: "self_author",
    },
    platformUsername: "someone",
    titleContentHash: null,
    description: null,
}

const wireUnownedRow = {
    argumentId: ARGUMENT_ID,
    version: 3,
    platform: "twitter",
    platformUsername: "someone",
    userId: null,
}

function stubClient(responses: Response[]) {
    const calls: { url: string; method?: string }[] = []
    const fetchImpl: typeof fetch = (input, init) => {
        calls.push({ url: urlToString(input), method: init?.method })
        return Promise.resolve(responses[calls.length - 1])
    }
    const apiClient = createApiClient({
        baseUrl: "https://example.test",
        fetchImpl,
    })
    return { apiClient, calls }
}

describe("apiClient.getUnownedArguments", () => {
    test("GETs the auth-scoped list route with an absolute URL", async () => {
        const { apiClient, calls } = stubClient([makeJsonResponse(200, [])])

        await apiClient.getUnownedArguments()

        expect(calls).toHaveLength(1)
        expect(calls[0].url).toBe(
            "https://example.test/api/v1/argument/unowned"
        )
        expect(calls[0].method).toBe("GET")
    })

    test("returns an empty list, not an error, when nothing is claimable", async () => {
        const { apiClient } = stubClient([makeJsonResponse(200, [])])

        const result = await apiClient.getUnownedArguments()

        expect(result.ok).toBe(true)
        expect(result.ok && result.value).toEqual([])
    })

    test("returns full arguments carrying every field the web list renders", async () => {
        const { apiClient } = stubClient([
            makeJsonResponse(200, [wireArgument]),
        ])

        const result = await apiClient.getUnownedArguments()

        expect(result.ok).toBe(true)
        if (!result.ok) return

        const [argument] = result.value
        expect(argument.id).toBe(ARGUMENT_ID)
        expect(argument.version).toBe(3)
        expect(argument.title).toBe("A claimable argument")
        expect(argument.platform).toBe("twitter")
        expect(argument.platformData).toMatchObject({
            postUrl: "https://x.com/someone/status/1",
        })
        // Decoded into a real Date, which is what the list's date formatting
        // receives when the page loads the rows in-process today.
        expect(argument.createdOn).toBeInstanceOf(Date)
        expect(argument.createdOn.toISOString()).toBe(CREATED_ON)
    })

    test("rejects an unauthenticated caller rather than yielding data", async () => {
        // The route answers 401 with a bare text body, so the rejection surfaces
        // as a body-parse failure rather than a typed error envelope. Pinned
        // here so the refusal is deliberate: what must never happen is the call
        // resolving with an empty list, which would read as "nothing claimable".
        const { apiClient } = stubClient([
            new Response("Unauthorized", { status: 401 }),
        ])

        await expect(apiClient.getUnownedArguments()).rejects.toThrow()
    })
})

describe("apiClient.getUnownedArgument", () => {
    test("GETs the per-argument route and returns the unowned row", async () => {
        const { apiClient, calls } = stubClient([
            makeJsonResponse(200, wireUnownedRow),
        ])

        const result = await apiClient.getUnownedArgument(ARGUMENT_ID, 3)

        expect(calls[0].url).toBe(
            `https://example.test/api/v1/argument/unowned/${ARGUMENT_ID}/3`
        )
        expect(calls[0].method).toBe("GET")
        expect(result.ok).toBe(true)
        expect(result.ok && result.value).toEqual(wireUnownedRow)
    })

    test("returns null when the argument has no unowned entry", async () => {
        const { apiClient } = stubClient([makeJsonResponse(200, null)])

        const result = await apiClient.getUnownedArgument(ARGUMENT_ID, 3)

        expect(result.ok).toBe(true)
        expect(result.ok && result.value).toBeNull()
    })
})
