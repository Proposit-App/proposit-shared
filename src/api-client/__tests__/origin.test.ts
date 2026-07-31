import { describe, expect, it, vi } from "vitest"
import { createApiClient } from "../factory.js"

const ORIGIN_METHODS = [
    "getArgumentOrigin",
    "attachArgumentOrigin",
    "updateArgumentOrigin",
    "detachArgumentOrigin",
    "createOriginAnchor",
    "deleteOriginAnchor",
    "markPremiseEnthymeme",
    "markExpressionEnthymeme",
] as const

function buildClient(response: unknown) {
    const fetchImpl = vi.fn(async (_url: string, _init?: RequestInit) =>
        Promise.resolve(
            new Response(JSON.stringify(response), {
                status: 200,
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

describe("origin api-client methods", () => {
    it("registers every origin method on the client", () => {
        const { client } = buildClient({})
        for (const name of ORIGIN_METHODS) {
            expect(typeof client[name]).toBe("function")
        }
    })

    it("reads an argument version's origin from the versioned route", async () => {
        const { client, fetchImpl } = buildClient({
            document: null,
            link: null,
            anchors: [],
        })

        const result = await client.getArgumentOrigin("arg-1", 3)

        expect(fetchImpl.mock.calls[0]?.[0]).toBe(
            "https://example.test/api/v1/argument/arg-1/3/origin"
        )
        expect(result).toEqual({
            ok: true,
            value: { document: null, link: null, anchors: [] },
        })
    })

    it("marks a premise unspoken through the premise-scoped route", async () => {
        const { client, fetchImpl } = buildClient({})
        await client
            .markPremiseEnthymeme("arg-1", 3, "premise-9", { marked: true })
            .catch(() => undefined)

        expect(fetchImpl.mock.calls[0]?.[0]).toBe(
            "https://example.test/api/v1/argument/arg-1/3/premise/premise-9/enthymeme"
        )
        expect(fetchImpl.mock.calls[0]?.[1]?.body).toBe('{"marked":true}')
    })
})
