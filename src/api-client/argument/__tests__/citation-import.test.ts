import { describe, it, expect } from "vitest"
import { createApiClient } from "../../index.js"

function clientWith(status: number, body: unknown) {
    const fetchImpl = () =>
        Promise.resolve(
            new Response(JSON.stringify(body), {
                status,
                headers: { "content-type": "application/json" },
            })
        )
    return createApiClient({
        baseUrl: "http://x",
        fetchImpl: fetchImpl as never,
    })
}

describe("citationImport", () => {
    it("parses a full analysis", async () => {
        const c = clientWith(200, {
            websiteTitle: "N",
            pageTitle: "P",
            byline: "Jane Doe",
        })
        const r = await c.citationImport("https://x/a", "Website")
        expect(r.ok).toBe(true)
        if (r.ok)
            expect(r.value).toEqual({
                websiteTitle: "N",
                pageTitle: "P",
                byline: "Jane Doe",
            })
    })
    it("maps a 200 + null body to value:null (the load-bearing case)", async () => {
        const c = clientWith(200, null)
        const r = await c.citationImport("https://x/a", "Website")
        expect(r.ok).toBe(true)
        if (r.ok) expect(r.value).toBeNull()
    })
})
