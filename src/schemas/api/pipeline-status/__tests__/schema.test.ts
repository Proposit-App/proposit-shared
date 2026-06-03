import { describe, expect, it } from "vitest"
import { Value } from "typebox/value"

import {
    GetPipelineStatusResponseSchema,
    GetPipelineStagePayloadsResponseSchema,
    PipelineRunSchema,
    PipelineStageSchema,
    PipelineStagePayloadSchema,
    ProcessingFailureSchema,
    TokenUsageSchema,
    PipelineOutputStatusSchema,
    PipelineStageStatusSchema,
} from "../schema.js"

// Verifies the pipeline-status TypeBox schemas at
// `@proposit/shared/schemas/api/pipeline-status`.

const sampleRunUuid = "11111111-1111-4111-8111-111111111111"
const sampleStageUuid = "22222222-2222-4222-8222-222222222222"
const samplePayloadUuid = "33333333-3333-4333-8333-333333333333"

const sampleTokenUsage = {
    input: 100,
    output: 50,
    reasoning: 25,
}

const sampleRun = {
    id: sampleRunUuid,
    pipelineId: "v2-multi-stage",
    pipelineVersion: "v2-multi-stage",
    startedAt: "2026-05-25T12:00:00.000Z",
    finishedAt: "2026-05-25T12:00:05.000Z",
    outputStatus: "success" as const,
    tokenUsage: sampleTokenUsage,
}

const sampleStage = {
    id: sampleStageUuid,
    stageId: "claim-canonicalization",
    ordinal: 0,
    status: "completed" as const,
    startedAt: "2026-05-25T12:00:00.000Z",
    finishedAt: "2026-05-25T12:00:01.500Z",
    tokenUsage: sampleTokenUsage,
    retryCount: 0,
    failures: [],
    responseId: null,
}

describe("TokenUsageSchema", () => {
    it("accepts the minimal {input, output} shape (reasoning absent)", () => {
        expect(Value.Check(TokenUsageSchema, { input: 10, output: 5 })).toBe(
            true
        )
    })

    it("accepts {input, output, reasoning}", () => {
        expect(
            Value.Check(TokenUsageSchema, {
                input: 10,
                output: 5,
                reasoning: 2,
            })
        ).toBe(true)
    })

    it("rejects when input is missing", () => {
        expect(Value.Check(TokenUsageSchema, { output: 5 })).toBe(false)
    })

    it("rejects when output is missing", () => {
        expect(Value.Check(TokenUsageSchema, { input: 10 })).toBe(false)
    })

    it("rejects non-number values", () => {
        expect(Value.Check(TokenUsageSchema, { input: "10", output: 5 })).toBe(
            false
        )
    })
})

describe("ProcessingFailureSchema", () => {
    it("accepts a minimal valid failure (no context)", () => {
        expect(
            Value.Check(ProcessingFailureSchema, {
                stage: "claim-canonicalization",
                code: "STAGE_TIMEOUT",
                message: "Stage timed out after 30s",
                severity: "error",
            })
        ).toBe(true)
    })

    it("accepts a failure with context", () => {
        expect(
            Value.Check(ProcessingFailureSchema, {
                stage: "claim-canonicalization",
                code: "STAGE_TIMEOUT",
                message: "Stage timed out after 30s",
                severity: "warning",
                context: { elapsedMs: 30_000 },
            })
        ).toBe(true)
    })

    it("rejects an invalid severity literal", () => {
        expect(
            Value.Check(ProcessingFailureSchema, {
                stage: "x",
                code: "X",
                message: "x",
                severity: "fatal",
            })
        ).toBe(false)
    })

    it("rejects a missing required field", () => {
        expect(
            Value.Check(ProcessingFailureSchema, {
                stage: "x",
                code: "X",
                severity: "error",
            })
        ).toBe(false)
    })
})

describe("PipelineOutputStatusSchema", () => {
    it("accepts each of the three literal outcomes", () => {
        for (const v of ["success", "null-output", "aborted"]) {
            expect(Value.Check(PipelineOutputStatusSchema, v)).toBe(true)
        }
    })

    it("accepts null (pipeline still running)", () => {
        expect(Value.Check(PipelineOutputStatusSchema, null)).toBe(true)
    })

    it("rejects undefined (the field is nullable-always-present, not optional)", () => {
        expect(Value.Check(PipelineOutputStatusSchema, undefined)).toBe(false)
    })

    it("rejects unknown string literals", () => {
        expect(Value.Check(PipelineOutputStatusSchema, "completed")).toBe(false)
        expect(Value.Check(PipelineOutputStatusSchema, "unknown")).toBe(false)
    })
})

describe("PipelineStageStatusSchema", () => {
    it("accepts each of the five literal statuses", () => {
        for (const v of [
            "pending",
            "running",
            "completed",
            "skipped",
            "failed",
        ]) {
            expect(Value.Check(PipelineStageStatusSchema, v)).toBe(true)
        }
    })

    it("accepts null (historical row written before pre-creation was introduced)", () => {
        expect(Value.Check(PipelineStageStatusSchema, null)).toBe(true)
    })

    it("rejects unknown string literals", () => {
        expect(Value.Check(PipelineStageStatusSchema, "success")).toBe(false)
        expect(Value.Check(PipelineStageStatusSchema, "errored")).toBe(false)
    })
})

describe("PipelineRunSchema", () => {
    it("accepts a fully populated row (terminal: outputStatus + finishedAt)", () => {
        expect(Value.Check(PipelineRunSchema, sampleRun)).toBe(true)
    })

    it("accepts a still-running row (outputStatus=null, finishedAt=null)", () => {
        const running = {
            ...sampleRun,
            outputStatus: null,
            finishedAt: null,
        }
        expect(Value.Check(PipelineRunSchema, running)).toBe(true)
    })

    it("rejects a missing required field", () => {
        const { tokenUsage: _omitted, ...without } = sampleRun
        expect(Value.Check(PipelineRunSchema, without)).toBe(false)
    })

    it("rejects an invalid outputStatus literal", () => {
        const bad = { ...sampleRun, outputStatus: "unknown" }
        expect(Value.Check(PipelineRunSchema, bad)).toBe(false)
    })

    it("rejects an invalid startedAt (non date-time string)", () => {
        // Parse — not Check — enforces format. Check only validates type.
        const bad = { ...sampleRun, startedAt: "not-a-date" }
        expect(() => Value.Parse(PipelineRunSchema, bad)).toThrow()
    })
})

describe("PipelineStageSchema", () => {
    it("accepts a completed stage with no failures", () => {
        expect(Value.Check(PipelineStageSchema, sampleStage)).toBe(true)
    })

    it("accepts a pre-created pending stage (status=pending, startedAt=null, finishedAt=null)", () => {
        const pending = {
            ...sampleStage,
            status: "pending" as const,
            startedAt: null,
            finishedAt: null,
            tokenUsage: null,
        }
        expect(Value.Check(PipelineStageSchema, pending)).toBe(true)
    })

    it("accepts an in-progress stage (status=running, finishedAt=null)", () => {
        const running = {
            ...sampleStage,
            status: "running" as const,
            finishedAt: null,
        }
        expect(Value.Check(PipelineStageSchema, running)).toBe(true)
    })

    it("accepts a historical null-status stage (status=null)", () => {
        const historical = {
            ...sampleStage,
            status: null,
            finishedAt: null,
        }
        expect(Value.Check(PipelineStageSchema, historical)).toBe(true)
    })

    it("accepts a deterministic-stage shape (tokenUsage=null)", () => {
        const deterministic = { ...sampleStage, tokenUsage: null }
        expect(Value.Check(PipelineStageSchema, deterministic)).toBe(true)
    })

    it("accepts a failed stage with failures populated", () => {
        const failed = {
            ...sampleStage,
            status: "failed" as const,
            retryCount: 1,
            failures: [
                {
                    stage: "claim-canonicalization",
                    code: "OUTPUT_VALIDATION",
                    message: "Schema validation failed",
                    severity: "error" as const,
                },
            ],
        }
        expect(Value.Check(PipelineStageSchema, failed)).toBe(true)
    })

    it("accepts a stage with a non-null responseId (OpenAI background-mode stage)", () => {
        const withResponseId = {
            ...sampleStage,
            responseId: "resp_abc123",
        }
        expect(Value.Check(PipelineStageSchema, withResponseId)).toBe(true)
    })

    it("rejects an invalid status literal", () => {
        const bad = { ...sampleStage, status: "errored" }
        expect(Value.Check(PipelineStageSchema, bad)).toBe(false)
    })

    it("rejects a non-integer ordinal", () => {
        const bad = { ...sampleStage, ordinal: 1.5 }
        expect(Value.Check(PipelineStageSchema, bad)).toBe(false)
    })

    it("rejects a missing required field", () => {
        const { retryCount: _omitted, ...without } = sampleStage
        expect(Value.Check(PipelineStageSchema, without)).toBe(false)
    })
})

describe("GetPipelineStatusResponseSchema", () => {
    it("round-trips a fully populated response", () => {
        const body = { run: sampleRun, stages: [sampleStage] }
        const parsed = Value.Parse(GetPipelineStatusResponseSchema, body)
        expect(parsed).toEqual(body)
    })

    it("round-trips the empty-state response (no pipelineRuns row)", () => {
        const body = { run: null, stages: [] }
        const parsed = Value.Parse(GetPipelineStatusResponseSchema, body)
        expect(parsed).toEqual(body)
    })

    it("accepts a partial run (no stage rows yet) — stepper renders stage list from definition", () => {
        const body = { run: sampleRun, stages: [] }
        expect(Value.Check(GetPipelineStatusResponseSchema, body)).toBe(true)
    })

    it("rejects when run is missing entirely", () => {
        const bad = { stages: [] }
        expect(Value.Check(GetPipelineStatusResponseSchema, bad)).toBe(false)
    })

    it("rejects when stages is missing entirely", () => {
        const bad = { run: null }
        expect(Value.Check(GetPipelineStatusResponseSchema, bad)).toBe(false)
    })

    it("rejects a stages entry with an invalid status", () => {
        const bad = {
            run: sampleRun,
            stages: [{ ...sampleStage, status: "errored" }],
        }
        expect(Value.Check(GetPipelineStatusResponseSchema, bad)).toBe(false)
    })

    it("rejects a run with an invalid outputStatus", () => {
        const bad = {
            run: { ...sampleRun, outputStatus: "unknown" },
            stages: [],
        }
        expect(Value.Check(GetPipelineStatusResponseSchema, bad)).toBe(false)
    })
})

describe("PipelineStagePayloadSchema", () => {
    it("accepts a payload with an object rawOutput (responseId=null for non-OpenAI stage)", () => {
        const payload = {
            id: samplePayloadUuid,
            attempt: 1,
            systemPrompt: "You are a claim canonicalizer.",
            userMessage: "Input text…",
            rawOutput: { claims: [] },
            tokenUsage: sampleTokenUsage,
            createdAt: "2026-05-25T12:00:00.000Z",
            responseId: null,
        }
        expect(Value.Check(PipelineStagePayloadSchema, payload)).toBe(true)
    })

    it("accepts a payload with a non-null responseId (OpenAI background-mode attempt)", () => {
        const payload = {
            id: samplePayloadUuid,
            attempt: 1,
            systemPrompt: "You are a claim canonicalizer.",
            userMessage: "Input text…",
            rawOutput: { claims: [] },
            tokenUsage: sampleTokenUsage,
            createdAt: "2026-05-25T12:00:00.000Z",
            responseId: "resp_abc123",
        }
        expect(Value.Check(PipelineStagePayloadSchema, payload)).toBe(true)
    })

    it("accepts a payload whose rawOutput is not an object (LLM returned a bare value)", () => {
        const payload = {
            id: samplePayloadUuid,
            attempt: 2,
            systemPrompt: "x",
            userMessage: "y",
            rawOutput: "raw string the LLM returned",
            tokenUsage: sampleTokenUsage,
            createdAt: "2026-05-25T12:00:00.000Z",
            responseId: null,
        }
        expect(Value.Check(PipelineStagePayloadSchema, payload)).toBe(true)
    })

    it("rejects a missing required field", () => {
        const bad = {
            id: samplePayloadUuid,
            attempt: 1,
            // systemPrompt missing
            userMessage: "y",
            rawOutput: {},
            tokenUsage: sampleTokenUsage,
            createdAt: "2026-05-25T12:00:00.000Z",
            responseId: null,
        }
        expect(Value.Check(PipelineStagePayloadSchema, bad)).toBe(false)
    })

    it("rejects a non-integer attempt", () => {
        const bad = {
            id: samplePayloadUuid,
            attempt: 1.5,
            systemPrompt: "x",
            userMessage: "y",
            rawOutput: {},
            tokenUsage: sampleTokenUsage,
            createdAt: "2026-05-25T12:00:00.000Z",
            responseId: null,
        }
        expect(Value.Check(PipelineStagePayloadSchema, bad)).toBe(false)
    })
})

describe("GetPipelineStagePayloadsResponseSchema", () => {
    it("round-trips a response with multiple payloads (retry case)", () => {
        const body = {
            payloads: [
                {
                    id: samplePayloadUuid,
                    attempt: 1,
                    systemPrompt: "sys",
                    userMessage: "user",
                    rawOutput: { invalid: true },
                    tokenUsage: sampleTokenUsage,
                    createdAt: "2026-05-25T12:00:00.000Z",
                    responseId: "resp_abc123",
                },
                {
                    id: "44444444-4444-4444-8444-444444444444",
                    attempt: 2,
                    systemPrompt: "sys",
                    userMessage: "user",
                    rawOutput: { claims: [] },
                    tokenUsage: sampleTokenUsage,
                    createdAt: "2026-05-25T12:00:01.000Z",
                    responseId: null,
                },
            ],
        }
        const parsed = Value.Parse(GetPipelineStagePayloadsResponseSchema, body)
        expect(parsed).toEqual(body)
    })

    it("round-trips an empty payloads array (deterministic stage)", () => {
        const body = { payloads: [] }
        const parsed = Value.Parse(GetPipelineStagePayloadsResponseSchema, body)
        expect(parsed).toEqual(body)
    })

    it("rejects when payloads is missing entirely", () => {
        expect(Value.Check(GetPipelineStagePayloadsResponseSchema, {})).toBe(
            false
        )
    })

    it("rejects when payloads is not an array", () => {
        expect(
            Value.Check(GetPipelineStagePayloadsResponseSchema, {
                payloads: { not: "an array" },
            })
        ).toBe(false)
    })

    it("rejects when a contained payload is malformed", () => {
        const bad = {
            payloads: [
                {
                    id: samplePayloadUuid,
                    attempt: "one", // not an integer
                    systemPrompt: "x",
                    userMessage: "y",
                    rawOutput: {},
                    tokenUsage: sampleTokenUsage,
                    createdAt: "2026-05-25T12:00:00.000Z",
                    responseId: null,
                },
            ],
        }
        expect(Value.Check(GetPipelineStagePayloadsResponseSchema, bad)).toBe(
            false
        )
    })
})
