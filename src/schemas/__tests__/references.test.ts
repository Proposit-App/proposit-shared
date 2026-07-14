import { describe, it, expect } from "vitest"
import { Value } from "typebox/value"
import {
    CitationImportResponseSchema,
} from "../model/references.js"

describe("CitationImportResponseSchema", () => {
    it("accepts a full analysis", () => {
        const ok = { websiteTitle: "Nature", pageTitle: "A study", byline: "Jane Doe" }
        expect(Value.Check(CitationImportResponseSchema, ok)).toBe(true)
    })
    it("rejects a missing field", () => {
        const bad = { websiteTitle: "Nature", pageTitle: "A study" }
        expect(Value.Check(CitationImportResponseSchema, bad)).toBe(false)
    })
})
