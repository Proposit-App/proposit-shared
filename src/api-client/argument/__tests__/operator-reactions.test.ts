import { describe, expect, test } from "vitest"

import { createApiClient } from "../../index.js"

const REACTION_ID = "55555555-5555-5555-5555-555555555555"
const ARGUMENT_ID = "11111111-1111-1111-1111-111111111111"
const PREMISE_ID = "66666666-6666-6666-6666-666666666666"
const EXPRESSION_ID = "77777777-7777-7777-7777-777777777777"
const USER_ID = "44444444-4444-4444-4444-444444444444"

const fullReaction = {
    id: REACTION_ID,
    argumentId: ARGUMENT_ID,
    argumentVersion: 3,
    premiseId: PREMISE_ID,
    expressionId: EXPRESSION_ID,
    decision: "rejected",
    reasonCode: "non-sequitur",
    userId: USER_ID,
    createdOn: "2026-08-12T00:00:00.000Z",
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

function recordingClient(response: Response) {
    const calls: { url: string; method?: string; body?: unknown }[] = []
    const apiClient = createApiClient({
        baseUrl: "https://example.test",
        fetchImpl: (input, init) => {
            calls.push({
                url: urlToString(input),
                method: init?.method,
                body: init?.body,
            })
            return Promise.resolve(response)
        },
    })
    return { apiClient, calls }
}

describe("apiClient.createOperatorReaction", () => {
    test("POSTs the decision to the nested premise route", async () => {
        const { apiClient, calls } = recordingClient(
            makeJsonResponse(200, { addedReaction: fullReaction })
        )

        const res = await apiClient.createOperatorReaction(
            "arg-1",
            3,
            "premise-1",
            {
                decision: "rejected",
                reasonCode: "non-sequitur",
                expressionId: EXPRESSION_ID,
            }
        )

        expect(calls).toHaveLength(1)
        expect(calls[0].method).toBe("POST")
        expect(calls[0].url).toBe(
            "https://example.test/api/v1/argument/arg-1/3/premise/premise-1/reactions"
        )
        expect(JSON.parse(calls[0].body as string)).toEqual({
            decision: "rejected",
            reasonCode: "non-sequitur",
            expressionId: EXPRESSION_ID,
        })
        expect(res.ok).toBe(true)
        if (res.ok) {
            expect(res.value.addedReaction.id).toBe(REACTION_ID)
            expect(res.value.addedReaction.createdOn instanceof Date).toBe(true)
        }
    })

    test("records a decision without an operator, which the column allows", async () => {
        const { apiClient, calls } = recordingClient(
            makeJsonResponse(200, {
                addedReaction: { ...fullReaction, expressionId: null },
            })
        )

        await apiClient.createOperatorReaction("arg-1", 3, "premise-1", {
            decision: "accepted",
            reasonCode: "entailment-holds",
        })

        expect(JSON.parse(calls[0].body as string)).toEqual({
            decision: "accepted",
            reasonCode: "entailment-holds",
        })
    })

    test("refuses an unknown decision before reaching the network", async () => {
        const { apiClient, calls } = recordingClient(
            makeJsonResponse(200, { addedReaction: fullReaction })
        )

        await expect(
            apiClient.createOperatorReaction("arg-1", 3, "premise-1", {
                // Not one of the two literals the request schema admits.
                decision: "maybe",
                reasonCode: "non-sequitur",
            } as never)
        ).rejects.toThrow()

        // The refusal has to happen client-side. Asserting only that it threw
        // would pass just as well if the body had gone out and the route had
        // rejected it.
        expect(calls).toHaveLength(0)
    })
})

describe("apiClient.deleteOperatorReaction", () => {
    test("DELETEs the same nested premise route and parses the removed row", async () => {
        const { apiClient, calls } = recordingClient(
            makeJsonResponse(200, { removedReaction: fullReaction })
        )

        const res = await apiClient.deleteOperatorReaction(
            "arg-1",
            3,
            "premise-1"
        )

        expect(calls).toHaveLength(1)
        expect(calls[0].method).toBe("DELETE")
        expect(calls[0].url).toBe(
            "https://example.test/api/v1/argument/arg-1/3/premise/premise-1/reactions"
        )
        expect(res.ok).toBe(true)
        if (res.ok) expect(res.value.removedReaction.id).toBe(REACTION_ID)
    })
})

describe("apiClient.getOperatorReactionMap", () => {
    test("reads every premise's state for one argument version in one request", async () => {
        const { apiClient, calls } = recordingClient(
            makeJsonResponse(200, {
                "premise-1": {
                    counts: { accept: 2, reject: 1 },
                    own: {
                        decision: "accepted",
                        reasonCode: "entailment-holds",
                        expressionId: EXPRESSION_ID,
                    },
                },
                "premise-2": {
                    counts: { accept: 0, reject: 4 },
                    own: null,
                },
            })
        )

        const res = await apiClient.getOperatorReactionMap("arg-1", 3)

        expect(calls).toHaveLength(1)
        expect(calls[0].method).toBe("GET")
        expect(calls[0].url).toBe(
            "https://example.test/api/v1/argument/arg-1/3/premise-reactions"
        )
        expect(res.ok).toBe(true)
        if (!res.ok) return

        // The fields the reading surface reads off each entry: aggregate counts
        // everyone sees, plus the caller's own selection or its absence.
        expect(res.value["premise-1"]).toEqual({
            counts: { accept: 2, reject: 1 },
            own: {
                decision: "accepted",
                reasonCode: "entailment-holds",
                expressionId: EXPRESSION_ID,
            },
        })
        expect(res.value["premise-2"].own).toBeNull()
        expect(res.value["premise-2"].counts.reject).toBe(4)
    })

    test("omits a premise nobody has decided rather than zeroing it", async () => {
        // The reading surface supplies its own empty default for an unlisted
        // premise. Filling one in here as well would put that rule in two
        // places, which is how the two copies drift apart.
        const { apiClient } = recordingClient(
            makeJsonResponse(200, {
                "premise-1": { counts: { accept: 1, reject: 0 }, own: null },
            })
        )

        const res = await apiClient.getOperatorReactionMap("arg-1", 3)

        expect(res.ok).toBe(true)
        if (res.ok) {
            expect(Object.keys(res.value)).toEqual(["premise-1"])
            expect(res.value["premise-2"]).toBeUndefined()
        }
    })
})
