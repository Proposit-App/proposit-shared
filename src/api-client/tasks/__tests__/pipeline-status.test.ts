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

const sampleTokenUsage = { input: 10, output: 5 }

const sampleRunBody = {
    run: {
        id: "33333333-3333-4333-8333-333333333333",
        pipelineId: "v2-multi-stage",
        pipelineVersion: "v2-multi-stage",
        startedAt: "2026-05-25T12:00:00.000Z",
        finishedAt: "2026-05-25T12:00:05.000Z",
        outputStatus: "success",
        tokenUsage: sampleTokenUsage,
    },
    stages: [
        {
            id: "44444444-4444-4444-8444-444444444444",
            stageId: "claim-canonicalization",
            ordinal: 0,
            status: "completed",
            startedAt: "2026-05-25T12:00:00.000Z",
            finishedAt: "2026-05-25T12:00:01.000Z",
            tokenUsage: sampleTokenUsage,
            retryCount: 0,
            failures: [],
            responseId: null,
        },
    ],
}

const samplePayloadsBody = {
    payloads: [
        {
            id: "55555555-5555-4555-8555-555555555555",
            attempt: 1,
            systemPrompt: "You are a canonicalizer.",
            userMessage: "input text",
            rawOutput: { claims: [] },
            tokenUsage: sampleTokenUsage,
            createdAt: "2026-05-25T12:00:01.000Z",
            responseId: null,
        },
    ],
}

describe("apiClient.getTaskPipeline", () => {
    test("issues a GET to the spec-defined URL and parses the response", async () => {
        const calls: { url: string; method: string | undefined }[] = []
        const fetchImpl: typeof fetch = (input, init) => {
            calls.push({ url: urlToString(input), method: init?.method })
            return Promise.resolve(makeJsonResponse(200, sampleRunBody))
        }
        const apiClient = createApiClient({
            baseUrl: "https://example.test",
            fetchImpl,
        })

        const result = await apiClient.getTaskPipeline(taskId)

        expect(calls).toHaveLength(1)
        expect(calls[0]?.method).toBe("GET")
        expect(calls[0]?.url).toBe(
            `https://example.test/api/v1/task/${taskId}/pipeline`
        )
        expect(result.ok).toBe(true)
        if (result.ok) {
            expect(result.value).toEqual(sampleRunBody)
        }
    })

    test("returns the empty-state response shape (no pipelineRuns row yet)", async () => {
        const fetchImpl: typeof fetch = () =>
            Promise.resolve(makeJsonResponse(200, { run: null, stages: [] }))
        const apiClient = createApiClient({
            baseUrl: "https://example.test",
            fetchImpl,
        })

        const result = await apiClient.getTaskPipeline(taskId)

        expect(result.ok).toBe(true)
        if (result.ok) {
            expect(result.value).toEqual({ run: null, stages: [] })
        }
    })

    test("percent-encodes the taskId in the URL path", async () => {
        const calls: string[] = []
        const fetchImpl: typeof fetch = (input) => {
            calls.push(urlToString(input))
            return Promise.resolve(makeJsonResponse(200, sampleRunBody))
        }
        const apiClient = createApiClient({
            baseUrl: "https://example.test",
            fetchImpl,
        })

        await apiClient.getTaskPipeline("task with spaces/and-slash")

        expect(calls).toHaveLength(1)
        // Both space and `/` should be percent-encoded so the value stays
        // a single path segment.
        expect(calls[0]).toContain("task%20with%20spaces%2Fand-slash/pipeline")
    })
})

describe("apiClient.getTaskPipelineStagePayloads", () => {
    test("issues a GET to the spec-defined URL and parses the response", async () => {
        const calls: { url: string; method: string | undefined }[] = []
        const fetchImpl: typeof fetch = (input, init) => {
            calls.push({ url: urlToString(input), method: init?.method })
            return Promise.resolve(makeJsonResponse(200, samplePayloadsBody))
        }
        const apiClient = createApiClient({
            baseUrl: "https://example.test",
            fetchImpl,
        })

        const result = await apiClient.getTaskPipelineStagePayloads(
            taskId,
            stageRowId
        )

        expect(calls).toHaveLength(1)
        expect(calls[0]?.method).toBe("GET")
        expect(calls[0]?.url).toBe(
            `https://example.test/api/v1/task/${taskId}` +
                `/pipeline/stages/${stageRowId}/payloads`
        )
        expect(result.ok).toBe(true)
        if (result.ok) {
            expect(result.value).toEqual(samplePayloadsBody)
        }
    })

    test("returns the empty-payloads shape (deterministic stage)", async () => {
        const fetchImpl: typeof fetch = () =>
            Promise.resolve(makeJsonResponse(200, { payloads: [] }))
        const apiClient = createApiClient({
            baseUrl: "https://example.test",
            fetchImpl,
        })

        const result = await apiClient.getTaskPipelineStagePayloads(
            taskId,
            stageRowId
        )

        expect(result.ok).toBe(true)
        if (result.ok) {
            expect(result.value).toEqual({ payloads: [] })
        }
    })

    test("surfaces a 403 (staff-only endpoint) as a parsed error reply", async () => {
        const fetchImpl: typeof fetch = () =>
            Promise.resolve(
                makeJsonResponse(403, {
                    errorID: 1,
                    errorMessage: "Forbidden",
                    statusCode: 403,
                })
            )
        const apiClient = createApiClient({
            baseUrl: "https://example.test",
            fetchImpl,
        })

        const result = await apiClient.getTaskPipelineStagePayloads(
            taskId,
            stageRowId
        )

        expect(result.ok).toBe(false)
    })

    test("percent-encodes both path params", async () => {
        const calls: string[] = []
        const fetchImpl: typeof fetch = (input) => {
            calls.push(urlToString(input))
            return Promise.resolve(makeJsonResponse(200, samplePayloadsBody))
        }
        const apiClient = createApiClient({
            baseUrl: "https://example.test",
            fetchImpl,
        })

        await apiClient.getTaskPipelineStagePayloads("task id/x", "stage id/y")

        expect(calls[0]).toContain(
            "task%20id%2Fx/pipeline/stages/stage%20id%2Fy/payloads"
        )
    })
})
