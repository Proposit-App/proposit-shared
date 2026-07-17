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

// A completed `argument_build_review` task, as the build route returns it
// synchronously (not SSE): resultData.output carries the assistant reply and
// data.responseId chains the next turn.
const sampleReviewTask = {
    id: "33333333-3333-4333-8333-333333333333",
    userId: "44444444-4444-4444-8444-444444444444",
    previousId: null,
    type: "argument_build_review",
    data: {
        argumentId: "66666666-6666-4666-8666-666666666666",
        version: 1,
        responseId: "resp_abc",
        newPrompts: [{ role: "user", content: "All men are mortal." }],
    },
    errorData: null,
    resultData: {
        tokensUsed: 42,
        output: { role: "assistant", content: "What follows from that?" },
    },
    createdOn: "2026-06-01T12:00:00.000Z",
    startedAt: "2026-06-01T12:00:01.000Z",
    settledAt: "2026-06-01T12:00:05.000Z",
    status: TaskStatus.COMPLETED,
}

describe("apiClient.build", () => {
    test("POSTs the body to /{argumentId}/{version}/build and parses the build task", async () => {
        const calls: { url: string; method?: string; body: unknown }[] = []
        const fetchImpl: typeof fetch = (input, init) => {
            calls.push({
                url: urlToString(input),
                method: init?.method,
                body: init?.body,
            })
            return Promise.resolve(makeJsonResponse(200, sampleReviewTask))
        }
        const apiClient = createApiClient({
            baseUrl: "https://example.test",
            fetchImpl,
        })

        const result = await apiClient.build(
            "66666666-6666-4666-8666-666666666666",
            1,
            {
                lastResponseId: "resp_prev",
                newPrompts: ["All men are mortal."],
                action: "review",
            }
        )

        expect(calls).toHaveLength(1)
        expect(calls[0]?.method).toBe("POST")
        expect(calls[0]?.url).toBe(
            "https://example.test/api/v1/argument/66666666-6666-4666-8666-666666666666/1/build"
        )
        const sentBody = JSON.parse(String(calls[0]?.body)) as {
            action?: string
            newPrompts?: string[]
            lastResponseId?: string
        }
        expect(sentBody.action).toBe("review")
        expect(sentBody.newPrompts).toEqual(["All men are mortal."])
        expect(sentBody.lastResponseId).toBe("resp_prev")

        expect(result.ok).toBe(true)
        if (result.ok && result.value.type === "argument_build_review") {
            expect(result.value.data.responseId).toBe("resp_abc")
            expect(result.value.resultData?.output.content).toBe(
                "What follows from that?"
            )
        } else {
            expect.fail("expected an argument_build_review task")
        }
    })

    test("threads argumentId and version into the path segments", async () => {
        const calls: string[] = []
        const fetchImpl: typeof fetch = (input) => {
            calls.push(urlToString(input))
            return Promise.resolve(makeJsonResponse(200, sampleReviewTask))
        }
        const apiClient = createApiClient({
            baseUrl: "https://example.test",
            fetchImpl,
        })

        await apiClient.build("22222222-2222-4222-8222-222222222222", 7, {
            newPrompts: [],
            action: "finalize",
        })

        expect(calls[0]).toBe(
            "https://example.test/api/v1/argument/22222222-2222-4222-8222-222222222222/7/build"
        )
    })

    test("surfaces a 409 (build already running) as a parsed error reply", async () => {
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

        const result = await apiClient.build(
            "66666666-6666-4666-8666-666666666666",
            1,
            { newPrompts: ["hi"], action: "review" }
        )

        expect(result.ok).toBe(false)
    })
})
