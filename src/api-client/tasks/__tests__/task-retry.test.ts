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

const taskId = "11111111-1111-4111-8111-111111111111"
const stageRowId = "22222222-2222-4222-8222-222222222222"

// The fresh `argument_create` task minted by the server retry route.
// `previousId` points at the failed task; not yet started (PENDING).
const sampleRetryTask = {
    id: "33333333-3333-4333-8333-333333333333",
    userId: "44444444-4444-4444-8444-444444444444",
    previousId: "55555555-5555-4555-8555-555555555555",
    type: "argument_create",
    data: {
        argumentId: "66666666-6666-4666-8666-666666666666",
        version: 1,
    },
    errorData: null,
    resultData: null,
    createdOn: "2026-05-27T12:00:00.000Z",
    startedOn: null,
    completedOn: null,
    status: 0,
}

describe("apiClient.retryTask", () => {
    test("issues a POST (no body) to the spec-defined URL and parses the response", async () => {
        const calls: {
            url: string
            method: string | undefined
            body: unknown
        }[] = []
        const fetchImpl: typeof fetch = (input, init) => {
            calls.push({
                url: urlToString(input),
                method: init?.method,
                body: init?.body,
            })
            return Promise.resolve(makeJsonResponse(200, sampleRetryTask))
        }
        const apiClient = createApiClient({
            baseUrl: "https://example.test",
            fetchImpl,
        })

        const result = await apiClient.retryTask(taskId)

        expect(calls).toHaveLength(1)
        expect(calls[0]?.method).toBe("POST")
        // path-params-only: no request body
        expect(calls[0]?.body).toBeUndefined()
        expect(calls[0]?.url).toBe(
            `https://example.test/api/v1/task/${taskId}/retry`
        )
        expect(result.ok).toBe(true)
        if (result.ok) {
            expect(result.value.id).toBe(sampleRetryTask.id)
            expect(result.value.previousId).toBe(sampleRetryTask.previousId)
            expect(result.value.type).toBe("argument_create")
            // EncodableDate decodes the wire string into a Date instance
            expect(result.value.createdOn).toBeInstanceOf(Date)
        }
    })

    test("percent-encodes the taskId in the URL path", async () => {
        const calls: string[] = []
        const fetchImpl: typeof fetch = (input) => {
            calls.push(urlToString(input))
            return Promise.resolve(makeJsonResponse(200, sampleRetryTask))
        }
        const apiClient = createApiClient({
            baseUrl: "https://example.test",
            fetchImpl,
        })

        await apiClient.retryTask("task with spaces/and-slash")

        expect(calls).toHaveLength(1)
        expect(calls[0]).toContain("task%20with%20spaces%2Fand-slash/retry")
    })

    test("surfaces a 409 (non-retryable task) as a parsed error reply", async () => {
        const fetchImpl: typeof fetch = () =>
            Promise.resolve(
                makeJsonResponse(409, {
                    errorID: 1,
                    errorMessage: "Task is not retryable",
                    statusCode: 409,
                })
            )
        const apiClient = createApiClient({
            baseUrl: "https://example.test",
            fetchImpl,
        })

        const result = await apiClient.retryTask(taskId)

        expect(result.ok).toBe(false)
    })
})

describe("apiClient.retryStage", () => {
    test("issues a POST (no body) to the spec-defined stage URL and parses the response", async () => {
        const calls: {
            url: string
            method: string | undefined
            body: unknown
        }[] = []
        const fetchImpl: typeof fetch = (input, init) => {
            calls.push({
                url: urlToString(input),
                method: init?.method,
                body: init?.body,
            })
            return Promise.resolve(makeJsonResponse(200, sampleRetryTask))
        }
        const apiClient = createApiClient({
            baseUrl: "https://example.test",
            fetchImpl,
        })

        const result = await apiClient.retryStage(taskId, stageRowId)

        expect(calls).toHaveLength(1)
        expect(calls[0]?.method).toBe("POST")
        expect(calls[0]?.body).toBeUndefined()
        expect(calls[0]?.url).toBe(
            `https://example.test/api/v1/task/${taskId}` +
                `/pipeline/stages/${stageRowId}/retry`
        )
        expect(result.ok).toBe(true)
        if (result.ok) {
            expect(result.value.id).toBe(sampleRetryTask.id)
            expect(result.value.type).toBe("argument_create")
        }
    })

    test("percent-encodes both path params", async () => {
        const calls: string[] = []
        const fetchImpl: typeof fetch = (input) => {
            calls.push(urlToString(input))
            return Promise.resolve(makeJsonResponse(200, sampleRetryTask))
        }
        const apiClient = createApiClient({
            baseUrl: "https://example.test",
            fetchImpl,
        })

        await apiClient.retryStage("task id/x", "stage id/y")

        expect(calls[0]).toContain(
            "task%20id%2Fx/pipeline/stages/stage%20id%2Fy/retry"
        )
    })
})
