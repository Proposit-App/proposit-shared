import { describe, expect, it } from "vitest"
import { Value } from "typebox/value"
import { CreateArgumentSchema } from "../index.js"

// `CreateArgumentSchema` is the validated body for POST /api/v1/argument
// (and the import routes). `mode` is the user-facing import-depth selector;
// it is optional so existing callers that omit it still validate. The server
// resolves `mode` to a pipeline role (or falls back to its configured
// default when absent).
describe("CreateArgumentSchema mode", () => {
    const rawTextBody = (extra: Record<string, unknown> = {}) => ({
        origin: "raw_text",
        data: { textContent: "Some argument text" },
        ...extra,
    })

    it("accepts a body with no mode (backward-compatible)", () => {
        expect(Value.Check(CreateArgumentSchema, rawTextBody())).toBe(true)
    })

    it("accepts mode: fast", () => {
        expect(
            Value.Check(CreateArgumentSchema, rawTextBody({ mode: "fast" }))
        ).toBe(true)
    })

    it("accepts mode: thorough", () => {
        expect(
            Value.Check(CreateArgumentSchema, rawTextBody({ mode: "thorough" }))
        ).toBe(true)
    })

    it("rejects an unknown mode string", () => {
        expect(
            Value.Check(CreateArgumentSchema, rawTextBody({ mode: "turbo" }))
        ).toBe(false)
    })

    it("rejects a non-string mode", () => {
        expect(
            Value.Check(CreateArgumentSchema, rawTextBody({ mode: 1 }))
        ).toBe(false)
    })

    it("validates a full {origin, data, mode} body", () => {
        const body = {
            origin: "raw_text",
            data: { textContent: "A complete argument body" },
            mode: "thorough",
        }
        expect(Value.Check(CreateArgumentSchema, body)).toBe(true)
    })
})
