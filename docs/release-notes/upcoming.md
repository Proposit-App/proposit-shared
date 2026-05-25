# Upcoming release notes

This file accumulates release notes for the next published version of
`@proposit/shared`. At release time it is renamed to
`docs/release-notes/v{version}.md` and a fresh `upcoming.md` is started.

## What's new

- **`@proposit/shared/schemas/api/pipeline-status`** — new sub-entry
  exporting TypeBox response schemas for the two pipeline-status
  endpoints landing in `proposit-server` slice 2F:
    - `GetPipelineStatusResponseSchema` — `GET /api/v1/task/[taskId]/pipeline`
      response (the `pipelineRuns` row plus ordered `pipelineStages` rows).
      When no `pipelineRuns` row exists for the task, returns
      `{ run: null, stages: [] }` — UI renders the empty state.
    - `GetPipelineStagePayloadsResponseSchema` — staff-only
      `GET /api/v1/task/[taskId]/pipeline/stages/[stageRowId]/payloads`
      response (per-attempt LLM-call payloads for one stage row).
    - Both responses are realized verbatim from the pipeline-status UI
      design spec (`docs/superpowers/specs/2026-05-25-ingestion-pipeline-status-ui-design.md`
      §8.1 + §8.2).

- **`@proposit/shared/api-client`** — two new methods registered on the
  factory:
    - `apiClient.getTaskPipeline(taskId)` — wraps the §8.1 endpoint.
    - `apiClient.getTaskPipelineStagePayloads(taskId, stageRowId)` —
      wraps the §8.2 endpoint. Server-side authorization (admin role
      enforcement) is opaque to the client; a 403 response surfaces as a
      parsed error reply via the standard `parseResponse` path.

## Schema-design notes for consumers

- `outputStatus` on the pipeline run is nullable-always-present
  (`success | null-output | aborted | null`), where `null` represents a
  still-running pipeline. The TypeBox shape uses an explicit
  `Type.Null()` member of the union, not `Type.Optional(...)`, so a
  missing key in the payload is a validation failure (the field must
  always be present, just possibly null).
- Per-stage `outcome` follows the same nullable-always-present pattern
  (`completed | skipped | failed | null`).
- `tokenUsage` on a stage is `null` for deterministic stages (no LLM
  call) and an object otherwise. On a payload row it is always
  populated.
- `pipelineStagePayloads.rawOutput` is typed as `unknown` because the
  stored value may be a schema-conforming LLM output OR the raw
  response from an attempt whose output failed validation (a retry
  follows in that case). The consumer decides how to render.

## Internal: TProcessingFailure / TLlmTokenUsage parity

The two response schemas embed `ProcessingFailureSchema` and
`TokenUsageSchema` TypeBox values declared locally inside
`schemas/api/pipeline-status/schema.ts`. They are locked to core's
`TProcessingFailure` and `TLlmTokenUsage` types via compile-time
checks, mirroring the pattern from the type-only re-export at
`schemas/processing-failure.ts`. `@proposit/proposit-core@1.1.1` does
not ship runtime TypeBox values for either type; a future core minor
that adds them would let us replace these locals with re-exports
without any wire-format change.

## Peer-dep range

No peer-dep changes. The existing `@proposit/proposit-core` range
(`^1.1.1`) is sufficient — both consumed types
(`TProcessingFailure`, `TLlmTokenUsage`) are already exported from
1.1.x as TypeScript types.
