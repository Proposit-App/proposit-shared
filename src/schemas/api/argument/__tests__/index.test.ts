import { describe, expect, it } from "vitest"
import { Value } from "typebox/value"
import {
    CreateArgumentSchema,
    UpdateArgumentRequestSchema,
    type TUpdateArgumentRequest,
} from "../index.js"

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

// `UpdateArgumentRequestSchema.newData` is the mutable-fields patch for
// PUT /api/v1/argument. `title` is required; `description` is optional so
// title-only callers stay valid. The description must survive the schema
// boundary — `Value.Clean` projects a value onto the declared shape, so a
// field the schema does not declare is dropped there (which is exactly how
// an edited description was previously lost).
describe("UpdateArgumentRequestSchema description", () => {
    const body = (newData: Record<string, unknown>) => ({
        newData,
        currentDigest: "digest-abc",
    })

    it("preserves description through the schema boundary", () => {
        const cleaned = Value.Clean(
            UpdateArgumentRequestSchema,
            body({ title: "T", description: "D" })
        ) as TUpdateArgumentRequest
        expect(cleaned.newData.description).toBe("D")
    })

    it("accepts newData with title and description", () => {
        expect(
            Value.Check(
                UpdateArgumentRequestSchema,
                body({ title: "T", description: "D" })
            )
        ).toBe(true)
    })

    it("accepts newData with title only (description omitted)", () => {
        expect(
            Value.Check(UpdateArgumentRequestSchema, body({ title: "T" }))
        ).toBe(true)
    })

    it("rejects newData missing title", () => {
        expect(
            Value.Check(UpdateArgumentRequestSchema, body({ description: "D" }))
        ).toBe(false)
    })
})
