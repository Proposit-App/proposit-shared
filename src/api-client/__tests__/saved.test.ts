import { describe, expect, it, vi } from "vitest"
import { createApiClient } from "../factory.js"

const ARGUMENT_ID = "8f1c6b2e-3d4a-4f5b-9c7d-1e2f3a4b5c6d"
const OTHER_ARGUMENT_ID = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d"
const CREATOR_ID = "2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e"

function buildClient(response: unknown, status = 200) {
    const fetchImpl = vi.fn(async (_url: string, _init?: RequestInit) =>
        Promise.resolve(
            new Response(JSON.stringify(response), {
                status,
                headers: { "Content-Type": "application/json" },
            })
        )
    )
    return {
        client: createApiClient({
            baseUrl: "https://example.test",
            fetchImpl: fetchImpl as unknown as typeof fetch,
        }),
        fetchImpl,
    }
}

// A saved entry carries the argument whole, so the fixture has to satisfy
// `ArgumentWithMetadataSchema` in full — a partial one would pass the call and
// fail response validation, which is the failure this suite exists to catch.
function savedArgument(overrides: Record<string, unknown> = {}) {
    return {
        id: ARGUMENT_ID,
        version: 2,
        checksum: "arg-checksum",
        descendantChecksum: null,
        combinedChecksum: "arg-checksum",
        title: "Whether the sea is salt",
        description: "",
        creatorId: CREATOR_ID,
        createdOn: "2026-08-01T00:00:00.000Z",
        published: true,
        publishedOn: "2026-08-02T00:00:00.000Z",
        forkId: null,
        digest: "digest",
        popularity: 0,
        platform: "manual",
        platformData: null,
        platformUsername: null,
        titleContentHash: null,
        upvotes: 3,
        downvotes: 1,
        savedAt: "2026-08-10T12:00:00.000Z",
        ...overrides,
    }
}

describe("saved-argument api-client methods", () => {
    it("registers every saved method on the client", () => {
        const { client } = buildClient({})
        for (const name of [
            "saveArgument",
            "unsaveArgument",
            "getArgumentSavedState",
            "getSavedArguments",
        ] as const) {
            expect(typeof client[name]).toBe("function")
        }
    })

    it("saves through an unversioned route — the collection tracks the argument, not a revision", async () => {
        const { client, fetchImpl } = buildClient({
            argumentId: ARGUMENT_ID,
            savedAt: "2026-08-10T12:00:00.000Z",
        })

        const result = await client.saveArgument(ARGUMENT_ID)

        expect(fetchImpl.mock.calls[0]?.[0]).toBe(
            `https://example.test/api/v1/argument/${ARGUMENT_ID}/save`
        )
        expect(fetchImpl.mock.calls[0]?.[1]?.method).toBe("POST")
        expect(result.ok).toBe(true)
        if (!result.ok) return
        expect(result.value.argumentId).toBe(ARGUMENT_ID)
        expect(result.value.savedAt).toBeInstanceOf(Date)
    })

    it("unsaves through the same route with DELETE", async () => {
        const { client, fetchImpl } = buildClient({
            argumentId: ARGUMENT_ID,
            saved: false,
        })

        const result = await client.unsaveArgument(ARGUMENT_ID)

        expect(fetchImpl.mock.calls[0]?.[0]).toBe(
            `https://example.test/api/v1/argument/${ARGUMENT_ID}/save`
        )
        expect(fetchImpl.mock.calls[0]?.[1]?.method).toBe("DELETE")
        expect(result.ok).toBe(true)
        if (!result.ok) return
        expect(result.value.saved).toBe(false)
    })

    it("surfaces the not-published refusal as a parsed error rather than a throw", async () => {
        const { client } = buildClient(
            {
                errorID: -1,
                errorMessage: "Only a published argument can be saved.",
                statusCode: 400,
            },
            400
        )

        const result = await client.saveArgument(ARGUMENT_ID)

        expect(result.ok).toBe(false)
        if (result.ok) return
        // A refusal on this route is the plain error envelope, not one of the
        // coded ones `parseResponse` auto-detects — so the message is reachable
        // rather than hidden behind a `code` discriminant.
        expect("errorMessage" in result.error).toBe(true)
        if (!("errorMessage" in result.error)) return
        expect(result.error.errorMessage).toContain("published")
    })

    it("reads the toggle state from the same route with GET", async () => {
        const { client, fetchImpl } = buildClient({
            argumentId: ARGUMENT_ID,
            saved: true,
            savedAt: "2026-08-10T12:00:00.000Z",
        })

        const result = await client.getArgumentSavedState(ARGUMENT_ID)

        expect(fetchImpl.mock.calls[0]?.[0]).toBe(
            `https://example.test/api/v1/argument/${ARGUMENT_ID}/save`
        )
        expect(fetchImpl.mock.calls[0]?.[1]?.method).toBe("GET")
        expect(result.ok).toBe(true)
        if (!result.ok) return
        expect(result.value.saved).toBe(true)
        expect(result.value.savedAt).toBeInstanceOf(Date)
    })

    it("reads an unsaved toggle state with a null timestamp", async () => {
        const { client } = buildClient({
            argumentId: ARGUMENT_ID,
            saved: false,
            savedAt: null,
        })

        const result = await client.getArgumentSavedState(ARGUMENT_ID)

        expect(result.ok).toBe(true)
        if (!result.ok) return
        expect(result.value.saved).toBe(false)
        expect(result.value.savedAt).toBeNull()
    })

    it("reads the saved list from its own route, not from the argument catalogue", async () => {
        const { client, fetchImpl } = buildClient([savedArgument()])

        const result = await client.getSavedArguments()

        expect(fetchImpl.mock.calls[0]?.[0]).toBe(
            "https://example.test/api/v1/argument/saved"
        )
        expect(fetchImpl.mock.calls[0]?.[1]?.method).toBe("GET")
        expect(result.ok).toBe(true)
        if (!result.ok) return
        expect(result.value[0]?.savedAt).toBeInstanceOf(Date)
    })

    it("passes paging and title search through as query parameters", async () => {
        const { client, fetchImpl } = buildClient([])

        await client.getSavedArguments({
            limit: 20,
            offset: 40,
            titlePattern: "sea",
        })

        const url = new URL(String(fetchImpl.mock.calls[0]?.[0]))
        expect(url.pathname).toBe("/api/v1/argument/saved")
        expect(url.searchParams.get("limit")).toBe("20")
        expect(url.searchParams.get("offset")).toBe("40")
        expect(url.searchParams.get("titlePattern")).toBe("sea")
    })

    it("omits an absent parameter instead of sending it as the string 'undefined'", async () => {
        const { client, fetchImpl } = buildClient([])

        await client.getSavedArguments({ limit: undefined, offset: 10 })

        const url = new URL(String(fetchImpl.mock.calls[0]?.[0]))
        expect(url.searchParams.has("limit")).toBe(false)
        expect(url.searchParams.get("offset")).toBe("10")
    })

    it("carries every entry the list returns, in the order the server sent them", async () => {
        const { client } = buildClient([
            savedArgument({ savedAt: "2026-08-12T00:00:00.000Z" }),
            savedArgument({
                id: OTHER_ARGUMENT_ID,
                savedAt: "2026-08-09T00:00:00.000Z",
            }),
        ])

        const result = await client.getSavedArguments()

        expect(result.ok).toBe(true)
        if (!result.ok) return
        expect(result.value.map((entry) => entry.id)).toEqual([
            ARGUMENT_ID,
            OTHER_ARGUMENT_ID,
        ])
    })
})
