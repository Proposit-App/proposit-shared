// TypeBox response schemas for the pipeline-status endpoints consumed by
// `proposit-server`.
//
// Two endpoints:
//   - `GET /api/v1/task/[taskId]/pipeline` — pipelineRuns row + ordered
//     pipelineStages rows. Returned to any authenticated owner of the task.
//   - `GET /api/v1/task/[taskId]/pipeline/stages/[stageRowId]/payloads`
//     — staff-only. pipelineStagePayloads rows for one stage row.
//
// `ProcessingFailureSchema` and `TokenUsageSchema` are declared locally
// here because `@proposit/proposit-core@1.1.1` ships only the matching
// TypeScript types (`TProcessingFailure`, `TLlmTokenUsage`); no TypeBox
// runtime values are exported yet. The compile-time `satisfies` checks
// below lock the local schemas to core's type shape — a future core
// minor that exports the runtime schemas will let us replace the locals
// with re-exports without changing the wire format.

import { Type, type Static } from "typebox"
import type {
    TProcessingFailure,
    TLlmTokenUsage,
} from "@proposit/proposit-core"
import { UUID, Nullable } from "../../common.js"

// --- shared sub-schemas ----------------------------------------------------

// Local TypeBox mirror of `TLlmTokenUsage` from core. `reasoning` is
// optional-absent (the field is absent when the LLM didn't report a
// reasoning-token count), per core/src/lib/llm/types.ts.
export const TokenUsageSchema = Type.Object({
    input: Type.Number(),
    output: Type.Number(),
    reasoning: Type.Optional(Type.Number()),
})
export type TTokenUsage = Static<typeof TokenUsageSchema>

// Compile-time assertion: the local schema's derived type matches core's
// `TLlmTokenUsage`. If core ever extends the shape, the build breaks
// here and the schema must follow.
const _tokenUsageMatchesCore: TLlmTokenUsage = {} as TTokenUsage
const _coreMatchesTokenUsage: TTokenUsage = {} as TLlmTokenUsage
void _tokenUsageMatchesCore
void _coreMatchesTokenUsage

// Local TypeBox mirror of `TProcessingFailure` from core. `context` is
// optional-absent (matching core's `context?: Record<string, unknown>`).
export const ProcessingFailureSchema = Type.Object({
    stage: Type.String(),
    code: Type.String(),
    message: Type.String(),
    severity: Type.Union([Type.Literal("warning"), Type.Literal("error")]),
    context: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
})
export type TLocalProcessingFailure = Static<typeof ProcessingFailureSchema>

// Compile-time assertion: the local schema matches core's wire type.
// Mirrors the pattern in `src/schemas/__tests__/processing-failure-reexport.test.ts`
// for the type-only re-export at `src/schemas/processing-failure.ts`. When
// core publishes a runtime `ProcessingFailureSchema`, both that file and
// this local schema can be replaced by the upstream value in lockstep.
const _failureMatchesCore: TProcessingFailure = {} as TLocalProcessingFailure
const _coreMatchesFailure: TLocalProcessingFailure = {} as TProcessingFailure
void _failureMatchesCore
void _coreMatchesFailure

// `outputStatus` on `pipelineRuns`: nullable-but-always-present. `null`
// is a valid state (pipeline still running). The explicit `Type.Null()`
// member is the correct pattern per the typebox skill — `Type.Optional`
// would express absent-vs-present, not nullable.
export const PipelineOutputStatusSchema = Type.Union([
    Type.Literal("success"),
    Type.Literal("null-output"),
    Type.Literal("aborted"),
    Type.Null(),
])
export type TPipelineOutputStatus = Static<typeof PipelineOutputStatusSchema>

// `status` on `pipelineStages`: nullable-but-always-present. `null`
// is retained for backward-compat with historical rows written before
// pre-creation was introduced; all rows written by current code are
// non-null. The `pending` and `running` members support pre-created rows
// (stages whose row exists before `stage:start` fires).
export const PipelineStageStatusSchema = Type.Union([
    Type.Literal("pending"),
    Type.Literal("running"),
    Type.Literal("completed"),
    Type.Literal("skipped"),
    Type.Literal("failed"),
    Type.Null(),
])
export type TPipelineStageStatus = Static<typeof PipelineStageStatusSchema>

// --- §8.1: GET /api/v1/task/[taskId]/pipeline -----------------------------

export const PipelineRunSchema = Type.Object({
    id: UUID,
    pipelineId: Type.String(),
    pipelineVersion: Type.String(),
    startedAt: Type.String({ format: "date-time" }),
    finishedAt: Nullable(Type.String({ format: "date-time" })),
    outputStatus: PipelineOutputStatusSchema,
    tokenUsage: TokenUsageSchema,
    // The persisted run/task-level failure cause (`tasks.errorData`), e.g.
    // `{ code: "PIPELINE_FAILED", message }` / `{ code: "EXECUTOR_CRASHED",
    // message }`. `null` for a run that did not fail below the stage level.
    // Open record (mirrors the loose `tasks.errorData` column) so the same
    // field can later back a verbose diagnostic view without a wire change.
    errorData: Nullable(Type.Record(Type.String(), Type.Unknown())),
})
export type TPipelineRun = Static<typeof PipelineRunSchema>

export const PipelineStageSchema = Type.Object({
    id: UUID,
    stageId: Type.String(),
    ordinal: Type.Integer(),
    status: PipelineStageStatusSchema,
    startedAt: Nullable(Type.String({ format: "date-time" })),
    finishedAt: Nullable(Type.String({ format: "date-time" })),
    tokenUsage: Nullable(TokenUsageSchema),
    retryCount: Type.Integer(),
    failures: Type.Array(ProcessingFailureSchema),
    responseId: Nullable(Type.String()),
})
export type TPipelineStage = Static<typeof PipelineStageSchema>

// When no `pipelineRuns` row exists for the taskId (non-pipeline task,
// or pipeline hasn't started yet), the response is `{ run: null,
// stages: [] }`. Spec §8.1 + §10.3.
export const GetPipelineStatusResponseSchema = Type.Object({
    run: Nullable(PipelineRunSchema),
    stages: Type.Array(PipelineStageSchema),
})
export type TGetPipelineStatusResponse = Static<
    typeof GetPipelineStatusResponseSchema
>

// --- §8.2: GET /api/v1/task/[taskId]/pipeline/stages/[stageRowId]/payloads --

// Each row is one LLM-call attempt. `rawOutput` is `unknown` because the
// stored value may be a schema-conforming output OR the raw LLM response
// from an attempt whose output failed validation (in which case a retry
// follows). The receiver decides how to render.
// `responseId` is the OpenAI response id for this attempt; nullable for
// non-OpenAI stages or rows written before response-id persistence was
// introduced.
export const PipelineStagePayloadSchema = Type.Object({
    id: UUID,
    attempt: Type.Integer(),
    systemPrompt: Type.String(),
    userMessage: Type.String(),
    rawOutput: Type.Unknown(),
    tokenUsage: TokenUsageSchema,
    createdAt: Type.String({ format: "date-time" }),
    responseId: Nullable(Type.String()),
})
export type TPipelineStagePayload = Static<typeof PipelineStagePayloadSchema>

export const GetPipelineStagePayloadsResponseSchema = Type.Object({
    payloads: Type.Array(PipelineStagePayloadSchema),
})
export type TGetPipelineStagePayloadsResponse = Static<
    typeof GetPipelineStagePayloadsResponseSchema
>
