import { describe, expect, it, vi } from "vitest"
import { createApiClient } from "../factory.js"
import { PropositArgumentEngine } from "../../engine/engine.js"
import type { TProjectSnapshot } from "../../engine/engine.js"
import {
    buildOriginScene,
    makeAnchor,
    makeDocument,
    makeLink,
} from "../../engine/__tests__/origin-fixtures.js"

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

    it("hands a populated read straight to fromServerData with no reshaping", async () => {
        // The exact line five consumer slices are about to write. The response
        // says `null`; `fromServerData` takes `null` and stores `undefined`.
        const scene = buildOriginScene()
        const document = makeDocument(scene)
        const link = makeLink(scene, document.id, "representation")
        const anchor = makeAnchor(
            scene,
            document.id,
            "premise",
            scene.premiseId
        )
        const { client } = buildClient({
            document,
            link,
            anchors: [anchor],
        })

        const read = await client.getArgumentOrigin(scene.argumentId, 1)
        expect(read.ok).toBe(true)
        if (!read.ok) throw new Error("expected a parsed body")

        const engine = PropositArgumentEngine.fromServerData(
            scene.engine.snapshot() as TProjectSnapshot,
            [],
            [],
            read.value
        )

        const origin = engine.getOrigin()
        expect(origin.document?.id).toBe(document.id)
        expect(origin.document?.createdOn).toBeInstanceOf(Date)
        expect(origin.link?.stance).toBe("representation")
        expect(origin.anchors[scene.premiseId]?.[0]?.exact).toBe(anchor.exact)
    })

    it("normalizes a null document and link to undefined, not null", async () => {
        const scene = buildOriginScene()
        const { client } = buildClient({
            document: null,
            link: null,
            anchors: [],
        })

        const read = await client.getArgumentOrigin(scene.argumentId, 1)
        if (!read.ok) throw new Error("expected a parsed body")

        const engine = PropositArgumentEngine.fromServerData(
            scene.engine.snapshot() as TProjectSnapshot,
            [],
            [],
            read.value
        )

        expect(engine.getOrigin().document).toBeUndefined()
        expect(engine.getOrigin().link).toBeUndefined()
    })

    it("surfaces a refused delete rather than reading it as success", async () => {
        const fetchImpl = vi.fn(async (_url: string, _init?: RequestInit) =>
            Promise.resolve(
                new Response(
                    JSON.stringify({
                        errorID: 1,
                        errorMessage: "Not an editor of this argument",
                        statusCode: 403,
                    }),
                    {
                        status: 403,
                        headers: { "Content-Type": "application/json" },
                    }
                )
            )
        )
        const client = createApiClient({
            baseUrl: "https://example.test",
            fetchImpl: fetchImpl as unknown as typeof fetch,
        })

        const result = await client.deleteOriginAnchor("arg-1", 3, "anchor-1")

        expect(result.ok).toBe(false)
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
