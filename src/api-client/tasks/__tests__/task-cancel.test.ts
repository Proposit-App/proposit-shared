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

const taskId = "11111111-1111-4111-8111-111111111111"

// The updated `argument_create` task returned by the cancel route: same task,
// status flipped to CANCELLED (terminal). 200 + body, NOT 204.
const sampleCancelledTask = {
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
    startedOn: "2026-06-01T12:00:01.000Z",
    completedOn: "2026-06-01T12:00:03.000Z",
    status: TaskStatus.CANCELLED,
}

describe("apiClient.cancelTask", () => {
    test("issues a DELETE (no body) to the task URL and parses the updated task", async () => {
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
            return Promise.resolve(makeJsonResponse(200, sampleCancelledTask))
        }
        const apiClient = createApiClient({
            baseUrl: "https://example.test",
            fetchImpl,
        })

        const result = await apiClient.cancelTask(taskId)

        expect(calls).toHaveLength(1)
        expect(calls[0]?.method).toBe("DELETE")
        // path-params-only: no request body
        expect(calls[0]?.body).toBeUndefined()
        expect(calls[0]?.url).toBe(`https://example.test/api/v1/task/${taskId}`)
        expect(result.ok).toBe(true)
        if (result.ok) {
            expect(result.value.id).toBe(sampleCancelledTask.id)
            expect(result.value.status).toBe(TaskStatus.CANCELLED)
            expect(result.value.type).toBe("argument_create")
            // EncodableDate decodes the wire string into a Date instance
            expect(result.value.createdOn).toBeInstanceOf(Date)
        }
    })

    test("percent-encodes the taskId in the URL path", async () => {
        const calls: string[] = []
        const fetchImpl: typeof fetch = (input) => {
            calls.push(urlToString(input))
            return Promise.resolve(makeJsonResponse(200, sampleCancelledTask))
        }
        const apiClient = createApiClient({
            baseUrl: "https://example.test",
            fetchImpl,
        })

        await apiClient.cancelTask("task with spaces/and-slash")

        expect(calls).toHaveLength(1)
        expect(calls[0]).toContain("task%20with%20spaces%2Fand-slash")
        expect(calls[0]).not.toContain("/retry")
    })

    test("surfaces a 409 (non-cancellable task) as a parsed error reply", async () => {
        const fetchImpl: typeof fetch = () =>
            Promise.resolve(
                makeJsonResponse(409, {
                    errorID: 1,
                    errorMessage: "Task is not cancellable",
                    statusCode: 409,
                })
            )
        const apiClient = createApiClient({
            baseUrl: "https://example.test",
            fetchImpl,
        })

        const result = await apiClient.cancelTask(taskId)

        expect(result.ok).toBe(false)
    })
})
