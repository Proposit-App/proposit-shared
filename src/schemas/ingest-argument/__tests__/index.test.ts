import { describe, expect, it } from "vitest"
import { Value } from "typebox/value"
import {
    IngestArgumentTaskInputSchema,
    IngestionPipelineSchema,
} from "../index.js"

// Verifies the internal task-input schemas at
// `@proposit/shared/schemas/ingest-argument`. These are NOT public route
// bodies — they are the shape a server route handler constructs (from the
// user-selected import mode resolved to a pipeline role) before passing
// into `executePipeline(...)` from `@proposit/proposit-core`.
describe("IngestionPipelineSchema", () => {
    it("accepts the scholar role", () => {
        expect(Value.Check(IngestionPipelineSchema, "scholar")).toBe(true)
    })

    it("accepts the scribe role", () => {
        expect(Value.Check(IngestionPipelineSchema, "scribe")).toBe(true)
    })

    it("rejects the retired v1-single-shot literal", () => {
        expect(Value.Check(IngestionPipelineSchema, "v1-single-shot")).toBe(
            false
        )
    })

    it("rejects the retired v2-multi-stage literal", () => {
        expect(Value.Check(IngestionPipelineSchema, "v2-multi-stage")).toBe(
            false
        )
    })

    it("rejects an unknown role", () => {
        expect(Value.Check(IngestionPipelineSchema, "oracle")).toBe(false)
    })

    it("rejects non-string values", () => {
        expect(Value.Check(IngestionPipelineSchema, 1)).toBe(false)
        expect(Value.Check(IngestionPipelineSchema, null)).toBe(false)
    })
})

describe("IngestArgumentTaskInputSchema", () => {
    it("accepts a minimal valid input", () => {
        const input = { text: "hi", pipeline: "scholar" }
        expect(Value.Check(IngestArgumentTaskInputSchema, input)).toBe(true)
    })

    it("accepts an input with optional title and description present", () => {
        const input = {
            text: "Some argument text",
            pipeline: "scribe",
            title: "My title",
            description: "Some description",
        }
        expect(Value.Check(IngestArgumentTaskInputSchema, input)).toBe(true)
    })

    it("accepts an input with optional title alone", () => {
        const input = {
            text: "Some argument text",
            pipeline: "scholar",
            title: "My title",
        }
        expect(Value.Check(IngestArgumentTaskInputSchema, input)).toBe(true)
    })

    it("accepts an input with optional description alone", () => {
        const input = {
            text: "Some argument text",
            pipeline: "scholar",
            description: "Some description",
        }
        expect(Value.Check(IngestArgumentTaskInputSchema, input)).toBe(true)
    })

    it("rejects an empty text", () => {
        const input = { text: "", pipeline: "scholar" }
        expect(Value.Check(IngestArgumentTaskInputSchema, input)).toBe(false)
    })

    it("rejects text exceeding the 50_000 char ceiling", () => {
        const input = {
            text: "x".repeat(50_001),
            pipeline: "scholar",
        }
        expect(Value.Check(IngestArgumentTaskInputSchema, input)).toBe(false)
    })

    it("accepts text exactly at the 50_000 char ceiling", () => {
        const input = {
            text: "x".repeat(50_000),
            pipeline: "scholar",
        }
        expect(Value.Check(IngestArgumentTaskInputSchema, input)).toBe(true)
    })

    it("rejects an unknown pipeline role", () => {
        const input = { text: "hi", pipeline: "oracle" }
        expect(Value.Check(IngestArgumentTaskInputSchema, input)).toBe(false)
    })

    it("rejects a retired version literal in the pipeline field", () => {
        const input = { text: "hi", pipeline: "v2-multi-stage" }
        expect(Value.Check(IngestArgumentTaskInputSchema, input)).toBe(false)
    })

    it("rejects a missing pipeline", () => {
        const input = { text: "hi" }
        expect(Value.Check(IngestArgumentTaskInputSchema, input)).toBe(false)
    })

    it("rejects a missing text", () => {
        const input = { pipeline: "scholar" }
        expect(Value.Check(IngestArgumentTaskInputSchema, input)).toBe(false)
    })

    it("rejects an unknown key (additionalProperties: false)", () => {
        const input = { text: "hi", pipeline: "scholar", smuggled: 1 }
        expect(Value.Check(IngestArgumentTaskInputSchema, input)).toBe(false)
    })
})
