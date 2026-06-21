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

// `additionalProperties: false` at the ingest trust boundary: the request body
// and its per-platform `data` sub-objects reject keys they don't declare, so a
// client (or a future server bug) can't smuggle extra fields past validation.
describe("CreateArgumentSchema rejects unknown keys", () => {
    it("rejects an unknown top-level key", () => {
        const body = {
            origin: "raw_text",
            data: { textContent: "text" },
            unexpected: true,
        }
        expect(Value.Check(CreateArgumentSchema, body)).toBe(false)
    })

    it("rejects an unknown key inside raw_text data", () => {
        const body = {
            origin: "raw_text",
            data: { textContent: "text", smuggled: 1 },
        }
        expect(Value.Check(CreateArgumentSchema, body)).toBe(false)
    })

    it("rejects an unknown key inside twitter data", () => {
        const body = {
            origin: "twitter",
            data: {
                textContent: "text",
                postUrl: "https://x.com/u/1",
                importMode: "self_author",
                smuggled: 1,
            },
        }
        expect(Value.Check(CreateArgumentSchema, body)).toBe(false)
    })

    it("rejects an unknown key inside reddit data", () => {
        const body = {
            origin: "reddit",
            data: {
                textContent: "text",
                postUrl: "https://reddit.com/r/x/1",
                smuggled: 1,
            },
        }
        expect(Value.Check(CreateArgumentSchema, body)).toBe(false)
    })

    it("rejects an unknown key inside manual data", () => {
        const body = {
            origin: "manual",
            data: { argumentTitle: "T", textContent: null, smuggled: 1 },
        }
        expect(Value.Check(CreateArgumentSchema, body)).toBe(false)
    })

    it("still accepts twitter data with its declared optional fields", () => {
        const body = {
            origin: "twitter",
            data: {
                argumentTitle: "T",
                textContent: "text",
                postUrl: "https://x.com/u/1",
                importMode: "copy_contents",
                username: "u",
            },
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
