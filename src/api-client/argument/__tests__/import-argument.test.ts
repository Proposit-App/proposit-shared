import { describe, expect, test } from "vitest"

import { TaskStatus } from "../../../consts/index.js"
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

// The `argument_create` task returned immediately by the import route: carries
// data.{argumentId, version} so the consumer can navigate to the building draft.
const sampleTask = {
    id: "33333333-3333-4333-8333-333333333333",
    userId: "44444444-4444-4444-8444-444444444444",
    previousId: null,
    type: "argument_create",
    data: {
        argumentId: "66666666-6666-4666-8666-666666666666",
        version: 1,
    },
    errorData: null,
    resultData: null,
    createdOn: "2026-06-01T12:00:00.000Z",
    startedAt: null,
    settledAt: null,
    status: TaskStatus.PENDING,
}

describe("apiClient.importArgument", () => {
    test("POSTs the body to /import/{origin} and parses the create task", async () => {
        const calls: { url: string; method?: string; body: unknown }[] = []
        const fetchImpl: typeof fetch = (input, init) => {
            calls.push({
                url: urlToString(input),
                method: init?.method,
                body: init?.body,
            })
            return Promise.resolve(makeJsonResponse(200, sampleTask))
        }
        const apiClient = createApiClient({
            baseUrl: "https://example.test",
            fetchImpl,
        })

        const result = await apiClient.importArgument({
            origin: "raw_text",
            data: { textContent: "All men are mortal." },
            mode: "fast",
        })

        expect(calls).toHaveLength(1)
        expect(calls[0]?.method).toBe("POST")
        expect(calls[0]?.url).toBe(
            "https://example.test/api/v1/argument/import/raw_text"
        )
        const sentBody = JSON.parse(String(calls[0]?.body)) as {
            mode?: string
        }
        expect(sentBody.mode).toBe("fast")
        expect(result.ok).toBe(true)
        if (result.ok) {
            expect(result.value.type).toBe("argument_create")
            expect(result.value.data.argumentId).toBe(
                sampleTask.data.argumentId
            )
            expect(result.value.data.version).toBe(1)
        }
    })

    test("reflects origin in the path segment", async () => {
        const calls: string[] = []
        const fetchImpl: typeof fetch = (input) => {
            calls.push(urlToString(input))
            return Promise.resolve(makeJsonResponse(200, sampleTask))
        }
        const apiClient = createApiClient({
            baseUrl: "https://example.test",
            fetchImpl,
        })

        await apiClient.importArgument({
            origin: "twitter",
            data: { textContent: "x" },
        })

        expect(calls[0]).toBe(
            "https://example.test/api/v1/argument/import/twitter"
        )
    })

    test("surfaces a 409 (already-running) as a parsed error reply", async () => {
        const fetchImpl: typeof fetch = () =>
            Promise.resolve(
                makeJsonResponse(409, {
                    errorID: 1,
                    errorMessage: "A build is already running",
                    statusCode: 409,
                })
            )
        const apiClient = createApiClient({
            baseUrl: "https://example.test",
            fetchImpl,
        })

        const result = await apiClient.importArgument({
            origin: "raw_text",
            data: { textContent: "x" },
        })

        expect(result.ok).toBe(false)
    })
})
