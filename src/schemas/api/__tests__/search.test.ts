import { describe, expect, it } from "vitest"
import { Value } from "typebox/value"
import { EntitySearchResponseSchema } from "../search.js"

const baseResponse = {
    arguments: [],
    claims: [],
    premises: [],
    citations: [],
}

describe("EntitySearchResponseSchema searchMode", () => {
    it("accepts searchMode='embedding'", () => {
        const payload = { ...baseResponse, searchMode: "embedding" }
        expect(Value.Check(EntitySearchResponseSchema, payload)).toBe(true)
    })

    it("accepts searchMode='string'", () => {
        const payload = { ...baseResponse, searchMode: "string" }
        expect(Value.Check(EntitySearchResponseSchema, payload)).toBe(true)
    })

    it("accepts the response with searchMode omitted", () => {
        expect(Value.Check(EntitySearchResponseSchema, baseResponse)).toBe(true)
    })

    it("rejects an out-of-union searchMode", () => {
        const payload = { ...baseResponse, searchMode: "sql" }
        expect(Value.Check(EntitySearchResponseSchema, payload)).toBe(false)
    })
})
