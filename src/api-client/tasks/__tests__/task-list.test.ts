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

const argumentId = "66666666-6666-4666-8666-666666666666"

// A representative task row as the server would return it on the wire.
const sampleTask = {
    id: "33333333-3333-4333-8333-333333333333",
    userId: "44444444-4444-4444-8444-444444444444",
    previousId: null,
    type: "argument_create",
    data: { argumentId, version: 1 },
    errorData: null,
    resultData: null,
    createdOn: "2026-05-27T12:00:00.000Z",
    startedOn: null,
    completedOn: null,
    status: 0,
}

function clientCapturing(calls: string[], body: unknown) {
    const fetchImpl: typeof fetch = (input) => {
        calls.push(urlToString(input))
        return Promise.resolve(makeJsonResponse(200, body))
    }
    return createApiClient({ baseUrl: "https://example.test", fetchImpl })
}

const listBody = { tasks: [sampleTask], hasMore: true }

describe("apiClient.listTasks", () => {
    test("issues a GET to the bare URL with no query string when no params given", async () => {
        const calls: string[] = []
        const apiClient = clientCapturing(calls, listBody)

        await apiClient.listTasks()

        expect(calls).toHaveLength(1)
        expect(calls[0]).toBe("https://example.test/api/v1/task")
    })

    test("includes each optional param when present", async () => {
        const calls: string[] = []
        const apiClient = clientCapturing(calls, listBody)

        await apiClient.listTasks({
            argumentId,
            version: 2,
            limit: 5,
            offset: 10,
        })

        const params = new URL(calls[0]).searchParams
        expect(params.get("argumentId")).toBe(argumentId)
        expect(params.get("version")).toBe("2")
        expect(params.get("limit")).toBe("5")
        expect(params.get("offset")).toBe("10")
    })

    test("omits absent params rather than sending `undefined`", async () => {
        const calls: string[] = []
        const apiClient = clientCapturing(calls, listBody)

        await apiClient.listTasks({ limit: 10 })

        expect(calls[0]).not.toContain("undefined")
        const params = new URL(calls[0]).searchParams
        expect(params.get("limit")).toBe("10")
        expect(params.has("offset")).toBe(false)
        expect(params.has("argumentId")).toBe(false)
        expect(params.has("version")).toBe(false)
    })

    test("parses the response and decodes wire date strings into Date", async () => {
        const apiClient = clientCapturing([], listBody)

        const result = await apiClient.listTasks()

        expect(result.ok).toBe(true)
        if (result.ok) {
            expect(result.value.hasMore).toBe(true)
            expect(result.value.tasks).toHaveLength(1)
            expect(result.value.tasks[0]?.createdOn).toBeInstanceOf(Date)
        }
    })

    test("accepts an empty tasks array", async () => {
        const apiClient = clientCapturing([], { tasks: [], hasMore: false })

        const result = await apiClient.listTasks()

        expect(result.ok).toBe(true)
        if (result.ok) {
            expect(result.value.tasks).toHaveLength(0)
            expect(result.value.hasMore).toBe(false)
        }
    })

    test("rejects a response body missing `hasMore`", async () => {
        const apiClient = clientCapturing([], { tasks: [] })

        await expect(apiClient.listTasks()).rejects.toThrow()
    })
})
