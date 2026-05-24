import { describe, expect, it } from "vitest"
import { Value } from "typebox/value"
import {
    IngestArgumentTaskInputSchema,
    IngestionPipelineVersionSchema,
} from "../index.js"

// Verifies the internal task-input schemas at
// `@proposit/shared/schemas/ingest-argument`. These are NOT public route
// bodies — they are the shape a server route handler constructs from the
// existing `CreateArgumentSchema` body plus the server-side
// `INGESTION_PIPELINE_VERSION` env, then passes into `executePipeline(...)`
// from `@proposit/proposit-core`.
describe("IngestionPipelineVersionSchema", () => {
    it("accepts the v1-single-shot literal", () => {
        expect(
            Value.Check(IngestionPipelineVersionSchema, "v1-single-shot")
        ).toBe(true)
    })

    it("accepts the v2-multi-stage literal", () => {
        expect(
            Value.Check(IngestionPipelineVersionSchema, "v2-multi-stage")
        ).toBe(true)
    })

    it("rejects an unknown pipeline version literal", () => {
        expect(Value.Check(IngestionPipelineVersionSchema, "v3-future")).toBe(
            false
        )
    })

    it("rejects non-string values", () => {
        expect(Value.Check(IngestionPipelineVersionSchema, 1)).toBe(false)
        expect(Value.Check(IngestionPipelineVersionSchema, null)).toBe(false)
    })
})

describe("IngestArgumentTaskInputSchema", () => {
    it("accepts a minimal valid input", () => {
        const input = { text: "hi", pipelineVersion: "v1-single-shot" }
        expect(Value.Check(IngestArgumentTaskInputSchema, input)).toBe(true)
    })

    it("accepts an input with optional title and description present", () => {
        const input = {
            text: "Some argument text",
            pipelineVersion: "v2-multi-stage",
            title: "My title",
            description: "Some description",
        }
        expect(Value.Check(IngestArgumentTaskInputSchema, input)).toBe(true)
    })

    it("accepts an input with optional title alone", () => {
        const input = {
            text: "Some argument text",
            pipelineVersion: "v1-single-shot",
            title: "My title",
        }
        expect(Value.Check(IngestArgumentTaskInputSchema, input)).toBe(true)
    })

    it("accepts an input with optional description alone", () => {
        const input = {
            text: "Some argument text",
            pipelineVersion: "v1-single-shot",
            description: "Some description",
        }
        expect(Value.Check(IngestArgumentTaskInputSchema, input)).toBe(true)
    })

    it("rejects an empty text", () => {
        const input = { text: "", pipelineVersion: "v1-single-shot" }
        expect(Value.Check(IngestArgumentTaskInputSchema, input)).toBe(false)
    })

    it("rejects text exceeding the 50_000 char ceiling", () => {
        const input = {
            text: "x".repeat(50_001),
            pipelineVersion: "v1-single-shot",
        }
        expect(Value.Check(IngestArgumentTaskInputSchema, input)).toBe(false)
    })

    it("accepts text exactly at the 50_000 char ceiling", () => {
        const input = {
            text: "x".repeat(50_000),
            pipelineVersion: "v1-single-shot",
        }
        expect(Value.Check(IngestArgumentTaskInputSchema, input)).toBe(true)
    })

    it("rejects an unknown pipelineVersion literal", () => {
        const input = { text: "hi", pipelineVersion: "v3-future" }
        expect(Value.Check(IngestArgumentTaskInputSchema, input)).toBe(false)
    })

    it("rejects a missing pipelineVersion", () => {
        const input = { text: "hi" }
        expect(Value.Check(IngestArgumentTaskInputSchema, input)).toBe(false)
    })

    it("rejects a missing text", () => {
        const input = { pipelineVersion: "v1-single-shot" }
        expect(Value.Check(IngestArgumentTaskInputSchema, input)).toBe(false)
    })
})
